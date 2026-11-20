#!/usr/bin/env node
// Self-tests: the linter catches the slop fixture, stays silent on the clean one,
// the hook exits 2 on errors, the design log detects repeats, and the deck draws valid cards.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
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
// worktrees live under .claude/worktrees/: the hook must still lint there, but skip real .claude/ config
const wt = mkdtempSync(join(tmpdir(), "aoo-wt-")); const wtSite = join(wt, ".claude/worktrees/x");
cpSync(join(root, "tests/fixtures/slop"), wtSite, { recursive: true }); mkdirSync(join(wt, ".claude/skills"), { recursive: true }); cpSync(join(root, "tests/fixtures/slop/app/page.tsx"), join(wt, ".claude/skills/page.tsx"));
const hookAt = (fp, proj) => run([join(S, "hook-lint.mjs")], { input: JSON.stringify({ tool_input: { file_path: fp } }), env: { ...process.env, CLAUDE_PROJECT_DIR: proj } }).status;
ok(hookAt(join(wtSite, "app/page.tsx"), wt) === 2, "edit hook lints files in .claude/worktrees/ (project = main repo)");
ok(hookAt(join(wtSite, "app/page.tsx"), wtSite) === 2, "edit hook lints files in .claude/worktrees/ (project = worktree)");
ok(hookAt(join(wt, ".claude/skills/page.tsx"), wt) === 0, "edit hook still skips .claude/ config files");
rmSync(wt, { recursive: true, force: true });
for (const f of ["agents/design-reviewer.md", "agents/direction-critic.md", "commands/design-review.md", "hooks/rules.md", "skills/agency-of-one/references/agency.md", "skills/agency-of-one/references/craft.md", "skills/agency-of-one/scripts/type-specimen.mjs"]) ok(existsSync(join(root, f)), `ships ${f}`);

const tmp = mkdtempSync(join(tmpdir(), "df-")); const log = join(tmp, "log.md");
const base = ["--log", log, "--display", "Karrik", "--body", "Literata", "--ground", "#cfd8c4", "--accent", "#c8312b", "--layout", "timetable table", "--medium", "tide table booklet"];
ok(run([join(S, "designlog.mjs"), "add", "--project", "A", ...base]).status === 0, "design log add");
ok(run([join(S, "designlog.mjs"), "check", ...base]).status === 1, "design log flags a repeat");
ok(run([join(S, "designlog.mjs"), "check", "--log", log, "--display", "Gloock", "--body", "Petrona", "--ground", "#1d2a44", "--accent", "#e0b000", "--layout", "poster index", "--medium", "court docket sheet"]).status === 0, "design log passes a distinct fingerprint");
const d = run([join(S, "draw.mjs"), "--project", "T", "--log", log], { cwd: tmp });
ok(d.status === 0 && /Agency draw/.test(d.stdout) && /Palette \(curated/.test(d.stdout), "agency draw (default) works");
const de = run([join(S, "draw.mjs"), "--project", "T", "--mode", "expressive", "--log", log], { cwd: tmp });
ok(de.status === 0 && /Reference media/.test(de.stdout), "expressive draw works");
const pk = run([join(S, "draw.mjs"), "--pick", "A:0.9:9,B:0.2:8,C:0.3:6,D:0.8:9,E:0.1:8"], { cwd: tmp });
ok(/CHOSEN: [BE]\b/.test(pk.stdout), "--pick chooses only atypical AND strong directions");
const pw = run([join(S, "draw.mjs"), "--pick", "A:0.9:9,B:0.2:5,C:0.3:4"], { cwd: tmp });
ok(pw.status === 3, "--pick refuses when nothing is both atypical and strong");
// ---- v1.1: palettes, brand lock, beauty lint, update check ----
const pals = JSON.parse(readFileSync(join(root, "skills/agency-of-one/references/palettes.json"), "utf8"));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const Lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const x = Lum(a), y = Lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
ok(pals.length >= 16 && pals.every((p) => cr(p.ink, p.ground) >= 7 && cr(p.muted, p.ground) >= 4.5 && cr(p.brand, p.ground) >= 3), `all ${pals.length} curated palettes pass contrast`);
const onBrand = (p) => ({ ink: p.ink, ground: p.ground }[p.brandText] || "#ffffff");
ok(pals.every((p) => cr(onBrand(p), p.brand) >= 4.5), "text on every palette's brand colour passes AA");
ok(pals.every((p) => p.accentText && cr(p.accentText, p.accent) >= 4.5), "every palette names an AA text colour for its accent");
ok(pals.filter((p) => p.ground !== "#ffffff" && p.theme === "light").length >= 2, "library includes tinted light grounds");
const dd = run([join(S, "draw.mjs"), "--project", "P", "--log", log], { cwd: tmp });
ok(/Palette \(curated/.test(dd.stdout) && !/OKLCH hue/.test(dd.stdout), "agency draw uses a curated palette, not a raw hue");
mkdirSync(join(tmp, ".design-review"), { recursive: true });
writeFileSync(join(tmp, ".design-review/brand.json"), JSON.stringify({ brandHues: [{ hex: "#2a32a2" }], proposal: { brand: "#2c36a1", ground: "#fdfdff" } }));
const db = run([join(S, "draw.mjs"), "--project", "B", "--brand", "--log", log], { cwd: tmp });
ok(/BRAND-LOCKED/.test(db.stdout) && /#2a32a2/.test(db.stdout), "draw --brand locks colour to the brand");
ok(run([join(S, "draw.mjs"), "--redraw", "colour"], { cwd: tmp }).status === 1, "brand-locked colour can't be redrawn");
const bl = run([join(S, "slop-lint.mjs"), "index.html", "--json"], { cwd: join(root, "tests/fixtures/beauty-bad") });
const br = new Set(JSON.parse(bl.stdout).findings.map((f) => f.rule));
for (const r of ["caps-heading", "divider-bar"]) ok(br.has(r), `beauty lint detects ${r}`);
const uc = run([join(S, "update-check.mjs")], { env: { ...process.env, CLAUDE_PLUGIN_DATA: tmp, AGENCY_OF_ONE_TEST_LATEST: "9.9.9" } });
ok(/v9\.9\.9 is available/.test(uc.stdout), "update check announces a newer release");
const uc2 = run([join(S, "update-check.mjs")], { env: { ...process.env, CLAUDE_PLUGIN_DATA: tmp, AGENCY_OF_ONE_TEST_LATEST: "0.0.1" } });
ok(uc2.stdout.trim() === "", "update check is silent when current");
ok(readFileSync(join(root, "skills/agency-of-one/VERSION"), "utf8").trim() === JSON.parse(readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8")).version, "VERSION matches plugin.json version");
// ---- v1.1 audit fixes ----
const bad = join(root, "tests/fixtures/beauty-bad");
const cb = new Set(JSON.parse(run([join(S, "slop-lint.mjs"), "index.html", "--json"], { cwd: bad }).stdout).findings.filter((f) => f.sev === "error").map((f) => f.rule));
ok(["caps-heading", "divider-bar"].every((r) => cb.has(r)), "caps headings and divider bars are lint errors");
// hook: warnings reach the model as additionalContext JSON on stdout
const wdir = mkdtempSync(join(tmpdir(), "aoo-w-")); writeFileSync(join(wdir, "a.css"), "a{transition:all .3s}\n");
const hw = run([join(S, "hook-lint.mjs")], { input: JSON.stringify({ tool_input: { file_path: join(wdir, "a.css") } }), env: { ...process.env, CLAUDE_PROJECT_DIR: wdir } });
let hwj = null; try { hwj = JSON.parse(hw.stdout); } catch {}
ok(hw.status === 0 && hwj?.hookSpecificOutput?.hookEventName === "PostToolUse" && /transition-all/.test(hwj.hookSpecificOutput.additionalContext), "hook sends warnings as additionalContext");
// session hook: pre-v1.1 DESIGN.md gets the upgrade hint and the absolute scripts path
const sdir = mkdtempSync(join(tmpdir(), "aoo-s-")); writeFileSync(join(sdir, "DESIGN.md"), "# old design\n");
const sr = run([join(root, "hooks/session-rules.mjs")], { env: { ...process.env, CLAUDE_PROJECT_DIR: sdir, AGENCY_OF_ONE_NO_UPDATE_CHECK: "1" } });
ok(/upgrade-design/.test(sr.stdout) && sr.stdout.includes(S), "session hook flags a pre-v1.1 DESIGN.md and prints the scripts path");
writeFileSync(join(sdir, "DESIGN.md"), "<!-- agency-of-one design v1.1 -->\n# design\n");
ok(!/upgrade-design/.test(run([join(root, "hooks/session-rules.mjs")], { env: { ...process.env, CLAUDE_PROJECT_DIR: sdir, AGENCY_OF_ONE_NO_UPDATE_CHECK: "1" } }).stdout), "no upgrade hint for a v1.1 DESIGN.md");
// draw: brand lock is automatic; overriding needs a reason
ok(/BRAND-LOCKED/.test(run([join(S, "draw.mjs"), "--project", "C", "--log", log], { cwd: tmp }).stdout), "brand lock is automatic when brand.json exists");
ok(run([join(S, "draw.mjs"), "--project", "D", "--no-brand", "", "--log", log], { cwd: tmp }).status !== 0, "--no-brand needs a reason");
// design log: same project never repeats itself; agency mode is advisory except display face
const dl = join(tmp, "dl.md"); const dargs = ["--display", "Face A", "--body", "Face B", "--ground", "#ffffff", "--accent", "#1d4e89", "--layout", "split hero left", "--medium", "photo", "--log", dl];
run([join(S, "designlog.mjs"), "add", "--project", "Same", ...dargs]);
ok(run([join(S, "designlog.mjs"), "check", "--project", "Same", ...dargs]).status === 0, "design log ignores the same project");
ok(run([join(S, "designlog.mjs"), "check", "--project", "Other", ...dargs]).status === 1, "design log blocks a reused display face");
const adv = run([join(S, "designlog.mjs"), "check", "--project", "Other", ...dargs.map((a) => a === "Face A" ? "Face Z" : a)]);
ok(adv.status === 0 && /ADVISORY/.test(adv.stdout), "other overlaps are advisory in agency mode");
// plan-diff: palette that loses the logo colour fails
const pdir = mkdtempSync(join(tmpdir(), "aoo-p-")); mkdirSync(join(pdir, ".design-review"));
writeFileSync(join(pdir, "DESIGN.md"), "```tokens\n" + JSON.stringify({ colors: { ground: "#ffffff", ink: "#1a1a1a", brand: "#5c6b21" } }) + "\n```\n");
writeFileSync(join(pdir, ".design-review/brand.json"), JSON.stringify({ brandHues: [{ hex: "#143ca0" }] }));
writeFileSync(join(pdir, ".design-review/render-report.json"), JSON.stringify({ pages: [] }));
const pd = run([join(S, "plan-diff.mjs")], { cwd: pdir });
ok(pd.status !== 0 && /BRAND/.test(pd.stdout), "plan-diff fails a palette without the logo colour");
ok(spawnSync("bash", ["-n", join(root, "update.sh")]).status === 0 && /main "\$@"/.test(readFileSync(join(root, "update.sh"), "utf8")), "update.sh is wrapped in main()");
// rendered checks (only where Playwright is installed)
let pwPath = null; try { pwPath = (await import("node:module")).createRequire(join(process.cwd(), "package.json")).resolve("playwright"); } catch {}
if (pwPath) {
  const rdir = mkdtempSync(join(tmpdir(), "aoo-r-")); spawnSync("cp", ["-r", ...["index.html", "img", "DESIGN.md"].map((f) => join(bad, f)), rdir]);
  spawnSync("ln", ["-s", join(process.cwd(), "node_modules"), join(rdir, "node_modules")]);
  run([join(S, "screenshot.mjs"), "--file", "index.html"], { cwd: rdir, timeout: 180000 });
  const rp = run([join(S, "plan-diff.mjs")], { cwd: rdir }).stdout;
  for (const [re, m] of [[/inconsistent photos/, "mixed photo backdrops"], [/centred multi-line/, "centred text"], [/uppercase-transformed/, "caps labels"], [/divider bars/, "divider bars"]]) ok(re.test(rp), `rendered beauty check: ${m}`);
  rmSync(rdir, { recursive: true, force: true });
} else console.log("· rendered checks skipped (no Playwright in this folder)");
rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `\n${fail} failed` : "\nall tests passed"); process.exit(fail ? 1 : 0);
