#!/usr/bin/env node
// designlog.mjs: cross-project memory so Claude doesn't repeat itself.
// The log lives at ~/.claude/design-log.md (override with --log).
//
//   node designlog.mjs check --project "Name" --display "Face" --body "Face" --ground "#hex" --accent "#hex" --layout "archetype words" --medium "primary medium" [--brand-locked] [--strict]
//   node designlog.mjs add   --project "Name" (same flags) --signature "…" --media "a; b"
//   node designlog.mjs list
//
// `check` compares a fingerprint against the last 10 projects on 6 axes:
// display face, body face, ground (hue bucket + light/dark), accent hue bucket,
// layout archetype (word overlap), primary medium. Overlap on >3 axes with any
// past project = REPEAT (exit 1). Same display face as any of the last 6 = REPEAT.
// `add` runs check first and refuses on REPEAT unless --force.
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import os from "node:os";

const [cmd = "list", ...rest] = process.argv.slice(2);
const opt = (n, d = "") => { const i = rest.indexOf(`--${n}`); return i >= 0 && rest[i + 1] ? rest[i + 1] : d; };
const logPath = opt("log", join(os.homedir(), ".claude", "design-log.md")).replace(/^~/, os.homedir());

function hsl(hex) {
  const m = (hex || "").match(/#?([0-9a-f]{6})/i); if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; let h = 0, s = 0;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; }
  return { h, s, l };
}
const groundKey = (hex) => { const c = hsl(hex); if (!c) return ""; const tone = c.l > 0.7 ? "light" : c.l < 0.3 ? "dark" : "mid"; return c.s < 0.12 ? `${tone}-neutral` : `${tone}-${Math.round(c.h / 30) % 12}`; };
const hueKey = (hex) => { const c = hsl(hex); return c ? (c.s < 0.12 ? "neutral" : String(Math.round(c.h / 30) % 12)) : ""; };
const words = (s) => new Set((s || "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3));

function parse() {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8").split(/^## /m).slice(1).map((b) => {
    const get = (k) => (b.match(new RegExp(`^- ${k}:\\s*(.*)$`, "mi")) || [])[1]?.trim() || "";
    return { project: b.split("\n")[0].trim(), display: get("display"), body: get("body"), ground: get("ground"), accent: get("accent"), layout: get("layout"), medium: get("medium") };
  });
}
const cur = { display: opt("display"), body: opt("body"), ground: opt("ground"), accent: opt("accent"), layout: opt("layout"), medium: opt("medium") };

// Same project (a redesign or a later round) never counts as a repeat of itself. When colour is
// brand-locked (--brand-locked), ground and accent come from the client, so they aren't compared.
const brandLocked = rest.includes("--brand-locked");
const sameProject = (p) => opt("project") && p.project.replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, "").trim().toLowerCase() === opt("project").trim().toLowerCase();
function check() {
  const past = parse().filter((p) => !sameProject(p)); const issues = [];
  past.slice(-6).forEach((p) => { if (cur.display && p.display.toLowerCase() === cur.display.toLowerCase()) issues.push(`display face "${cur.display}" was used in "${p.project}" (last 6 projects)`); });
  for (const p of past.slice(-10)) {
    const hits = [];
    if (cur.display && p.display.toLowerCase() === cur.display.toLowerCase()) hits.push("display");
    if (cur.body && p.body.toLowerCase() === cur.body.toLowerCase()) hits.push("body");
    if (!brandLocked && cur.ground && groundKey(p.ground) === groundKey(cur.ground)) hits.push("ground");
    if (!brandLocked && cur.accent && hueKey(p.accent) === hueKey(cur.accent)) hits.push("accent");
    const lw = words(cur.layout), pw = words(p.layout); const inter = [...lw].filter((w) => pw.has(w)).length;
    if (lw.size && inter / Math.max(1, Math.min(lw.size, pw.size)) >= 0.5) hits.push("layout");
    if (cur.medium && p.medium.toLowerCase() === cur.medium.toLowerCase()) hits.push("medium");
    if (hits.length > 3) issues.push(`overlaps "${p.project}" on ${hits.length}/6 axes: ${hits.join(", ")}`);
  }
  return issues;
}

if (cmd === "list") { const p = parse(); console.log(p.length ? p.map((x) => `${x.project} | ${x.display} / ${x.body} | ground ${x.ground} accent ${x.accent} | ${x.medium}`).join("\n") : `(empty log at ${logPath})`); process.exit(0); }
const issues = check();
// Agency mode: a repeat is advice (business sites legitimately share conventions); the display-face rule
// still blocks. Expressive mode (--strict) blocks on any repeat.
const strict = rest.includes("--strict");
const blocking = strict ? issues : issues.filter((i) => /^display face/.test(i));
if (cmd === "check") { console.log(issues.length ? `${blocking.length ? "REPEAT" : "ADVISORY"}:\n- ${issues.join("\n- ")}\n${blocking.length ? "Change the repeated axes before building." : "Consider changing these axes; not blocking in agency mode."}` : "OK: no repetition against the design log."); process.exit(blocking.length ? 1 : 0); }
if (cmd === "add") {
  if (blocking.length && !rest.includes("--force")) { console.error(`Refusing to log a repeat:\n- ${issues.join("\n- ")}`); process.exit(1); }
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `\n## ${opt("project", "untitled")} (${new Date().toISOString().slice(0, 10)})\n- display: ${cur.display}\n- body: ${cur.body}\n- ground: ${cur.ground}\n- accent: ${cur.accent}\n- layout: ${cur.layout}\n- medium: ${cur.medium}\n- media: ${opt("media")}\n- signature: ${opt("signature")}\n`);
  console.log(`Logged to ${logPath}`); process.exit(0);
}
console.error("usage: designlog.mjs check|add|list …"); process.exit(1);
