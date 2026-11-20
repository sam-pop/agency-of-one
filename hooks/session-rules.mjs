#!/usr/bin/env node
// SessionStart hook: plain stdout becomes context, so the core rules are always loaded
// (rules that sit only in reference files the agent never opens have no effect).
// Skips projects with no sign of frontend code, to keep unrelated sessions clean.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const has = (p) => existsSync(join(dir, p));
let frontend = ["DESIGN.md", "app", "src", "pages", "components", "public", "index.html", "styles", "astro.config.mjs", "vite.config.ts", "vite.config.js", "next.config.js", "next.config.mjs", "next.config.ts", "svelte.config.js", "tailwind.config.js", "tailwind.config.ts"].some(has);
if (!frontend && has("package.json")) { try { frontend = /"(react|next|vue|nuxt|svelte|@sveltejs\/kit|astro|tailwindcss|vite|solid-js|@remix-run\/[a-z]+|gatsby)"\s*:/.test(readFileSync(join(dir, "package.json"), "utf8")); } catch {} }
if (!frontend) { try { frontend = readdirSync(dir).some((f) => /\.(html|css)$/.test(f)); } catch {} }
if (!frontend && !process.env.AGENCY_OF_ONE_ALWAYS) process.exit(0);
const rules = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "rules.md"), "utf8").replace(/<!--.*?-->\n?/g, "");
process.stdout.write(rules + (has("DESIGN.md") ? "\nThis project HAS a DESIGN.md: read it before any UI work and follow it.\n" : "\nThis project has NO DESIGN.md yet: create one via the agency-of-one skill before the first UI change.\n"));
