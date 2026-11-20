#!/usr/bin/env node
// SessionStart hook: plain stdout becomes context, so the core rules are always loaded
// (rules that sit only in reference files the agent never opens have no effect).
// Skips projects with no sign of frontend code, to keep unrelated sessions clean.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
// update notice (any repo; cached daily; silent when current or offline)
try { const r = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "agency-of-one", "scripts", "update-check.mjs")], { encoding: "utf8", timeout: 2500 }); if (r.stdout?.trim()) process.stdout.write(r.stdout.trim() + "\n\n"); } catch {}
const has = (p) => existsSync(join(dir, p));
let frontend = ["DESIGN.md", "app", "src", "pages", "components", "public", "index.html", "styles", "astro.config.mjs", "vite.config.ts", "vite.config.js", "next.config.js", "next.config.mjs", "next.config.ts", "svelte.config.js", "tailwind.config.js", "tailwind.config.ts"].some(has);
if (!frontend && has("package.json")) { try { frontend = /"(react|next|vue|nuxt|svelte|@sveltejs\/kit|astro|tailwindcss|vite|solid-js|@remix-run\/[a-z]+|gatsby)"\s*:/.test(readFileSync(join(dir, "package.json"), "utf8")); } catch {} }
if (!frontend) { try { frontend = readdirSync(dir).some((f) => /\.(html|css)$/.test(f)); } catch {} }
if (!frontend && !process.env.AGENCY_OF_ONE_ALWAYS) process.exit(0);
const rules = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "rules.md"), "utf8").replace(/<!--.*?-->\n?/g, "");
const skillDir = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "agency-of-one");
let status;
if (!has("DESIGN.md")) status = "This project has NO DESIGN.md yet: create one via the agency-of-one skill before the first UI change.";
else {
  const dm = readFileSync(join(dir, "DESIGN.md"), "utf8");
  status = /<!-- agency-of-one design v1\.1 -->/.test(dm)
    ? "This project HAS a DESIGN.md: read it before any UI work and follow it."
    : "This project has a DESIGN.md from before Agency of One v1.1 (no brand-first colour, no beauty checks). Before UI work, run /agency-of-one:upgrade-design (drop-in installs: /upgrade-design) and propose the changes to the user.";
}
process.stdout.write(rules + `\n${status}\nAgency of One scripts live at: ${join(skillDir, "scripts")} (pass this absolute path to any subagent).\n`);
