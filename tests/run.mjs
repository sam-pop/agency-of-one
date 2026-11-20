#!/usr/bin/env node
// Self-tests: the linter catches the slop fixture, stays silent on the clean one,
// the hook exits 2 on errors, the design log detects repeats, and the deck draws valid cards.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const S = join(root, "skills/agency-of-one/scripts");
let fail = 0; const ok = (c, m) => { console.log(`${c ? "✓" : "✖"} ${m}`); if (!c) fail++; };
const run = (args, opts = {}) => spawnSync(process.execPath, args, { encoding: "utf8", ...opts });

const slop = run([join(S, "slop-lint.mjs"), "--json"], { cwd: join(root, "tests/fixtures/slop") });
const sj = JSON.parse(slop.stdout); const rules = new Set(sj.findings.map((f) => f.rule));
ok(slop.status === 1, "slop fixture exits 1");
for (const r of ["font-generic", "color-purple", "gradient-text", "blob", "sparkles", "emoji-heading", "reduced-motion", "cream-ground", "terracotta-accent", "tinted-near-black", "eyebrow", "middot", "arrow-suffix", "accent-word", "icon-tile", "copy-buzz", "stock-stats", "builder-fingerprint", "shadcn-default", "rebuttal", "triplet", "straight-quotes", "n-of-m", "negative-voice", "audience-range", "cta-repeat", "self-disclosure"]) ok(rules.has(r), `detects ${r}`);
const clean = run([join(S, "slop-lint.mjs"), "--json"], { cwd: join(root, "tests/fixtures/clean") });
ok(clean.status === 0 && JSON.parse(clean.stdout).findings.length === 0, "clean fixture has zero findings");

const hook = run([join(S, "hook-lint.mjs")], { input: JSON.stringify({ tool_input: { file_path: join(root, "tests/fixtures/slop/app/page.tsx") } }), env: { ...process.env, CLAUDE_PROJECT_DIR: join(root, "tests/fixtures/slop") } });
ok(hook.status === 2 && /slop-lint flagged/.test(hook.stderr), "edit hook exits 2 with findings on stderr");
const hookClean = run([join(S, "hook-lint.mjs")], { input: JSON.stringify({ tool_input: { file_path: join(root, "tests/fixtures/clean/app/page.tsx") } }), env: { ...process.env, CLAUDE_PROJECT_DIR: join(root, "tests/fixtures/clean") } });
ok(hookClean.status === 0, "edit hook passes clean file");
for (const f of ["agents/design-reviewer.md", "agents/direction-critic.md", "commands/design-review.md", "hooks/rules.md", "skills/agency-of-one/references/agency.md", "skills/agency-of-one/references/craft.md", "skills/agency-of-one/scripts/type-specimen.mjs"]) ok(existsSync(join(root, f)), `ships ${f}`);

const tmp = mkdtempSync(join(tmpdir(), "df-")); const log = join(tmp, "log.md");
const base = ["--log", log, "--display", "Karrik", "--body", "Literata", "--ground", "#cfd8c4", "--accent", "#c8312b", "--layout", "timetable table", "--medium", "tide table booklet"];
ok(run([join(S, "designlog.mjs"), "add", "--project", "A", ...base]).status === 0, "design log add");
ok(run([join(S, "designlog.mjs"), "check", ...base]).status === 1, "design log flags a repeat");
ok(run([join(S, "designlog.mjs"), "check", "--log", log, "--display", "Gloock", "--body", "Petrona", "--ground", "#1d2a44", "--accent", "#e0b000", "--layout", "poster index", "--medium", "court docket sheet"]).status === 0, "design log passes a distinct fingerprint");
const d = run([join(S, "draw.mjs"), "--project", "T", "--log", log], { cwd: tmp });
ok(d.status === 0 && /Agency draw/.test(d.stdout) && /Brand hue/.test(d.stdout), "agency draw (default) works");
const hues = []; for (let i = 0; i < 40; i++) { const m = run([join(S, "draw.mjs"), "--project", "T" + i, "--log", log], { cwd: tmp }).stdout.match(/hue (\d+)°/); if (m) hues.push(+m[1]); }
ok(hues.length === 40 && hues.every((h) => !((h >= 30 && h < 50) || (h >= 225 && h < 335))), "brand hue never lands in navy/violet/clay zones (40 draws)");
const de = run([join(S, "draw.mjs"), "--project", "T", "--mode", "expressive", "--log", log], { cwd: tmp });
ok(de.status === 0 && /Reference media/.test(de.stdout), "expressive draw works");
const pk = run([join(S, "draw.mjs"), "--pick", "A:0.9:9,B:0.2:8,C:0.3:6,D:0.8:9,E:0.1:8"], { cwd: tmp });
ok(/CHOSEN: [BE]\b/.test(pk.stdout), "--pick chooses only atypical AND strong directions");
const pw = run([join(S, "draw.mjs"), "--pick", "A:0.9:9,B:0.2:5,C:0.3:4"], { cwd: tmp });
ok(pw.status === 3, "--pick refuses when nothing is both atypical and strong");
rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `\n${fail} failed` : "\nall tests passed"); process.exit(fail ? 1 : 0);
