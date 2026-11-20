#!/usr/bin/env node
// draw.mjs — draws design-direction cards with REAL randomness (crypto), so the
// model cannot fall back to its most-probable aesthetic.
//
// Usage:
//   node draw.mjs --project "Acme"                       # agency mode (default): professional levers + brand hue
//   node draw.mjs --project "Acme" --mode expressive     # non-web reference media, constraints, mechanic
//   node draw.mjs --redraw medium            # redraw one slot of the last draw
//   node draw.mjs --seed 1234                # reproducible draw (testing only)
//   node draw.mjs --log ~/.claude/design-log.md --avoid 6
//
// Avoids any card that appears in the last N entries (default 6) of the design log.
// Writes the draw to .design-review/last-draw.json so --redraw can replace one slot.

import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const decks = JSON.parse(readFileSync(join(here, "..", "references", "decks.json"), "utf8"));

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : dflt;
};
const flag = (name) => args.includes(`--${name}`);

const project = opt("project", "untitled");
const logPath = resolve(opt("log", join(os.homedir(), ".claude", "design-log.md")).replace(/^~/, os.homedir()));
const avoidN = Number(opt("avoid", "6"));
const redraw = opt("redraw", null);
const seedArg = opt("seed", null);

// Seeded PRNG only for tests; production uses crypto.randomInt.
let rand = (n) => randomInt(n);
if (seedArg !== null) {
  let s = Number(seedArg) >>> 0 || 1;
  rand = (n) => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) % n; };
}

// Recently used cards from the design log (any line containing the card text).
let recent = "";
if (existsSync(logPath)) {
  const blocks = readFileSync(logPath, "utf8").split(/^## /m).slice(1);
  recent = blocks.slice(-avoidN).join("\n").toLowerCase();
}

function pick(deck, n, exclude = []) {
  const pool = decks[deck].filter(
    (c) => !recent.includes(c.toLowerCase()) && !exclude.includes(c)
  );
  const src = pool.length >= n ? pool : decks[deck].filter((c) => !exclude.includes(c));
  const out = [];
  const copy = [...src];
  while (out.length < n && copy.length) out.push(copy.splice(rand(copy.length), 1)[0]);
  return out;
}

// --pick "A:0.6:7,B:0.25:8,..."  (direction:typicality 0..1[:strength 0..10])
// Typicality+strength come from the independent direction-critic agent, not the builder.
// Eligible = atypical (t<0.5) AND strong (s>=7 and within 1 of the best eligible s). Random among eligible.
const pickArg = opt("pick", null);
if (pickArg) {
  const dirs = pickArg.split(",").map((x) => { const [k, t, s] = x.split(":"); return { k: k.trim(), t: Number(t), s: s === undefined ? null : Number(s) }; }).filter((d) => d.k && !Number.isNaN(d.t));
  if (dirs.length < 3) { console.error('Give at least 3 directions, e.g. --pick "A:0.6:7,B:0.25:8,C:0.3:6"'); process.exit(1); }
  const hasS = dirs.every((d) => d.s !== null && !Number.isNaN(d.s));
  const atypical = dirs.filter((d) => d.t < 0.5);
  let pool;
  if (hasS) {
    const strong = atypical.filter((d) => d.s >= 7);
    if (!strong.length) { console.log(`No direction is both atypical (t<0.5) and strong (s>=7):\n${dirs.map((d) => `  ${d.k} t=${d.t} s=${d.s}`).join("\n")}\n→ Write 3 NEW directions (keep the critic's STRONGEST_IDEA_TO_STEAL), re-score with the direction-critic, and pick again.`); process.exit(3); }
    const best = Math.max(...strong.map((d) => d.s));
    pool = strong.filter((d) => d.s >= best - 1);
  } else {
    console.error("(note) No strength scores: run the direction-critic agent and pass t:s pairs. Falling back to typicality only.");
    const sorted = [...dirs].sort((a, b) => a.t - b.t);
    pool = sorted.slice(0, Math.max(2, Math.ceil(sorted.length / 2))).filter((d) => d.t < 0.5);
    if (!pool.length) pool = sorted.slice(0, 2);
  }
  const chosen = pool[rand(pool.length)];
  console.log(`Scores: ${dirs.map((d) => `${d.k}(t=${d.t}${d.s !== null ? `, s=${d.s}` : ""})`).join("  ")}\nEligible: ${pool.map((d) => d.k).join(", ")}\n→ CHOSEN: ${chosen.k}\nBuild direction ${chosen.k}. Do not swap it for a safer one. Graft in the critic's STRONGEST_IDEA_TO_STEAL if it fits.`);
  process.exit(0);
}

// ---------------- AGENCY MODE (default) ----------------
// Professional levers: quality reference, composition, brand device, palette strategy,
// type strategy, and a brand hue sampled in OKLCH outside the default zones.
const mode = opt("mode", "agency");
function oklchToHex(L, C, H) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + lin.map((c) => { c = Math.max(0, Math.min(1, c)); c = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(c * 255).toString(16).padStart(2, "0"); }).join("");
}
// Excluded hue zones (OKLCH degrees): 30–50 clay/terracotta (gen-2 tell), 225–335 corporate blue/navy/indigo/violet/magenta
// (the business default + the AI tell). Everything else is fair game; the agent tunes chroma/lightness.
const HUE_OK = (h) => !((h >= 30 && h < 50) || (h >= 225 && h < 335));
function sampleHue() { for (;;) { const h = rand(360); if (HUE_OK(h) && !recent.includes(`hue ${h}`)) return h; } }

if (mode === "agency" && !redraw && !pickArg) {
  const A = decks.agency;
  const pickA = (k, n = 1) => { const pool = A[k].filter((c) => !recent.includes(c.toLowerCase())); const src = pool.length >= n ? pool : A[k]; const c = [...src]; const o = []; while (o.length < n && c.length) o.push(c.splice(rand(c.length), 1)[0]); return o; };
  const hue = sampleHue();
  const draw = { mode, project, date: new Date().toISOString().slice(0, 10), quality: pickA("quality_reference")[0], composition: pickA("composition")[0], device: pickA("brand_device")[0], palette: pickA("palette_strategy")[0], type: pickA("type_strategy")[0], hue, vetoed: [] };
  mkdirSync(resolve(".design-review"), { recursive: true });
  writeFileSync(join(resolve(".design-review"), "last-draw.json"), JSON.stringify(draw, null, 2));
  console.log(`### Agency draw — ${project} (${draw.date})
- **Quality reference** (a quality to match, not a look to copy): ${draw.quality}
- **Composition system:** ${draw.composition}
- **Brand device** (used with restraint, everywhere): ${draw.device}
- **Palette strategy:** ${draw.palette}
- **Brand hue:** OKLCH hue ${hue}° → previews: deep ${oklchToHex(0.32, 0.09, hue)} · mid ${oklchToHex(0.55, 0.14, hue)} · light ${oklchToHex(0.93, 0.03, hue)}
  (tune chroma/lightness for the subject; keep the hue within ±12°. Navy/indigo/violet and clay were excluded on purpose.)
- **Type strategy:** ${draw.type}

Rules: these are levers, not decoration. The brand idea (Phase 1) decides how each is applied.
You may veto ONE card with a written reason: --redraw quality|composition|device|palette|type|hue`);
  process.exit(0);
}
if (mode === "agency" && redraw) {
  const lastP = join(resolve(".design-review"), "last-draw.json");
  if (!existsSync(lastP)) { console.error("No previous draw."); process.exit(1); }
  const dr = JSON.parse(readFileSync(lastP, "utf8"));
  const map = { quality: "quality_reference", composition: "composition", device: "brand_device", palette: "palette_strategy", type: "type_strategy" };
  if (redraw === "hue") { dr.vetoed.push({ slot: "hue", card: dr.hue }); let h; do { h = sampleHue(); } while (h === dr.hue); dr.hue = h; }
  else if (map[redraw]) { const pool = decks.agency[map[redraw]].filter((c) => c !== dr[redraw]); dr.vetoed.push({ slot: redraw, card: dr[redraw] }); dr[redraw] = pool[rand(pool.length)]; }
  else { console.error("--redraw must be quality|composition|device|palette|type|hue in agency mode"); process.exit(1); }
  writeFileSync(lastP, JSON.stringify(dr, null, 2));
  console.log(`Redrew ${redraw}: ${redraw === "hue" ? `OKLCH hue ${dr.hue}° (mid ${oklchToHex(0.55, 0.14, dr.hue)})` : dr[redraw]}${dr.vetoed.length > 1 ? "\nWARNING: more than one veto used." : ""}`);
  process.exit(0);
}
// ---------------- EXPRESSIVE MODE (--mode expressive) ----------------
const outDir = resolve(".design-review");
const lastPath = join(outDir, "last-draw.json");
let draw;

if (redraw) {
  if (!existsSync(lastPath)) { console.error("No previous draw to redraw from."); process.exit(1); }
  draw = JSON.parse(readFileSync(lastPath, "utf8"));
  const map = { medium: ["media", 2], constraint: ["constraints", 2], twist: ["twist", 1], palette: ["palette", 1] };
  if (!map[redraw]) { console.error("--redraw must be medium|constraint|twist|palette"); process.exit(1); }
  const [key] = map[redraw];
  const prev = [].concat(draw[key]);
  // Replace exactly one card in that slot (the first), keep the rest.
  const replacement = pick(redraw, 1, prev)[0];
  const next = [...prev]; next[0] = replacement;
  draw[key] = Array.isArray(draw[key]) ? next : replacement;
  draw.vetoed = [...(draw.vetoed || []), { slot: redraw, card: prev[0] }];
} else {
  draw = {
    project,
    date: new Date().toISOString().slice(0, 10),
    media: pick("medium", 2),
    constraints: pick("constraint", 2),
    twist: pick("twist", 1)[0],
    palette: pick("palette", 1)[0],
    vetoed: [],
  };
}

mkdirSync(outDir, { recursive: true });
writeFileSync(lastPath, JSON.stringify(draw, null, 2));

const md = `### Deck draw — ${draw.project} (${draw.date})
- **Reference media:** ${draw.media.join("  ×  ")}
- **Constraints:** ${draw.constraints.map((c) => `\n  - ${c}`).join("")}
- **Signature mechanic:** ${draw.twist}
- **Palette source:** ${draw.palette}${draw.vetoed.length ? `\n- **Vetoed (with reason in DESIGN.md):** ${draw.vetoed.map((v) => `${v.slot}: ${v.card}`).join("; ")}` : ""}

Rules: combine these with the subject's material-culture inventory. You may veto ONE card total, with a written reason.
Interpret cards through the subject — the medium supplies type/colour/layout logic, not literal skeuomorphism.`;
console.log(md);
if (draw.vetoed.length > 1) console.error("\nWARNING: more than one veto used. The skill allows one.");
if (!existsSync(logPath)) console.error(`\n(note) No design log at ${logPath} yet — it will be created when you append this project's entry.`);
