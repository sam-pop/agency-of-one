#!/usr/bin/env node
// hook-lint.mjs: Claude Code PostToolUse hook (matcher: Edit|Write|MultiEdit).
// Lints just the file Claude touched. On ERROR findings it exits 2, so Claude Code
// feeds the findings back to Claude, which must fix them before continuing.
// Warnings are reported (stderr, exit 0) but don't block.
import { spawnSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let fp;
try { const j = JSON.parse(raw); fp = j.tool_input?.file_path || j.tool_input?.path; } catch { process.exit(0); }
if (!fp || !/\.(tsx|jsx|html?|css|scss|vue|svelte|astro|mdx)$/.test(fp) || /node_modules|\.claude\//.test(fp)) process.exit(0);

const lint = join(dirname(fileURLToPath(import.meta.url)), "slop-lint.mjs");
const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const r = spawnSync(process.execPath, [lint, relative(cwd, fp) || fp, "--quiet", "--file-mode"], { cwd, encoding: "utf8" });
const out = (r.stdout || "").trim();
if (r.status === 1) {
  console.error(`slop-lint flagged ${relative(cwd, fp)} — fix these before moving on (or add a justified exception to DESIGN.md + slop-lint.config.json):\n${out}`);
  process.exit(2);
}
// Warnings must reach the model while it edits: emit them as additionalContext (stdout JSON), not stderr.
if (/warning\(s\)/.test(out) && !/0 warning\(s\)/.test(out)) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `slop-lint warnings for ${relative(cwd, fp)} (fix now, or justify in DESIGN.md §9):\n${out}`.slice(0, 9000) } }));
process.exit(0);
