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
  let agencyMode = true; try { agencyMode = (JSON.parse(readFileSync(join(resolve(".design-review"), "last-draw.json"), "utf8")).mode || "agency") === "agency"; } catch {}
  if (hasS && agencyMode) {
    // Agency mode: beauty and fit first. Exclude only the clearly generic (t >= 0.7), then take the strongest (s >= 8, within 0.5 of best).
    // If nothing reaches 8 after the critic's second round (--round 2), take the best available instead of looping forever.
    const ok = dirs.filter((d) => d.t < 0.7 && d.s >= 8);
    const round = Number(opt("round", "1"));
    if (!ok.length && round >= 2) { const best = Math.max(...dirs.filter((d) => d.t < 0.7).map((d) => d.s)); const c = dirs.find((d) => d.t < 0.7 && d.s === best); console.log(`Round ${round}: nothing reached s>=8; taking the strongest non-generic direction.\n→ CHOSEN: ${c.k}`); process.exit(0); }
    if (!ok.length) { console.log(`No direction is strong enough (s>=8) without being generic (t<0.7):\n${dirs.map((d) => `  ${d.k} t=${d.t} s=${d.s}`).join("\n")}\n→ Write 3 NEW directions aimed at beauty and brand fit (graft the critic's STRONGEST_IDEA_TO_STEAL), re-score, then pick again with --round 2.`); process.exit(3); }
    const best = Math.max(...ok.map((d) => d.s)); pool = ok.filter((d) => d.s >= best - 0.5);
  } else if (hasS) {
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
// Professional levers: quality reference, composition, brand device, palette strategy, type strategy.
// Colour: locked to the brand (brand.json) or drawn from the curated palette library. Never a random hue.
const mode = opt("mode", "agency");
function oklchToHex(L, C, H) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + lin.map((c) => { c = Math.max(0, Math.min(1, c)); c = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(c * 255).toString(16).padStart(2, "0"); }).join("");
}

// Brand lock is AUTOMATIC when .design-review/brand.json exists (from brand-extract). Override only with --no-brand "<reason>".
const noBrand = args.includes("--no-brand") ? (opt("no-brand", "") || "") : null;
const brandPath = args.includes("--brand") && opt("brand", null) && !opt("brand", "").startsWith("--") ? opt("brand") : ".design-review/brand.json";
let brandArg = existsSync(brandPath) && noBrand === null ? brandPath : null;
if (noBrand !== null && existsSync(brandPath) && !noBrand.trim()) { console.error('--no-brand needs a reason, e.g. --no-brand "client is rebranding; old crest retired"'); process.exit(1); }
if (brandArg) { try { const bj = JSON.parse(readFileSync(brandArg, "utf8")); if (bj.monochrome || !bj.proposal?.brand) { console.error("(brand.json: monochrome or no brand colour; using a curated palette. Record this in DESIGN.md.)"); brandArg = null; } } catch { brandArg = null; } }
const PALETTES = JSON.parse(readFileSync(join(here, "..", "references", "palettes.json"), "utf8"));
function pickPalette(exclude = []) { const pool = PALETTES.filter((p) => !recent.includes(p.name.toLowerCase()) && !exclude.includes(p.name)); const src = pool.length ? pool : PALETTES; return src[rand(src.length)]; }
const fmtPal = (p) => `${p.name} (${p.mood}; ${p.theme}) → ground ${p.ground} · groundAlt ${p.groundAlt} · ink ${p.ink} · muted ${p.muted} · brand ${p.brand} · brandDeep ${p.brandDeep} · brandLight ${p.brandLight} · accent ${p.accent}${p.brandText ? ` · text on brand: ${p.brandText}` : ""}${p.accentText ? ` · text on accent: ${p.accentText}` : ""}`;

if (mode === "agency" && !redraw && !pickArg) {
  const A = decks.agency;
  const pickA = (k, n = 1) => { const pool = A[k].filter((c) => !recent.includes(c.toLowerCase())); const src = pool.length >= n ? pool : A[k]; const c = [...src]; const o = []; while (o.length < n && c.length) o.push(c.splice(rand(c.length), 1)[0]); return o; };
  let colour, colourLine;
  if (brandArg) {
    if (!existsSync(brandArg)) { console.error(`--brand: ${brandArg} not found. Run brand-extract.mjs first.`); process.exit(1); }
    const b = JSON.parse(readFileSync(brandArg, "utf8"));
    colour = { source: "brand", file: brandArg, proposal: b.proposal, brandHues: b.brandHues };
    colourLine = `- **Colour: BRAND-LOCKED** (from ${brandArg}). Brand hues: ${(b.brandHues || []).slice(0, 3).map((h) => h.hex).join(", ")}. Proposed: ${Object.entries(b.proposal || {}).filter(([k]) => k[0] !== "_").map(([k, v]) => `${k} ${v}`).join(" · ")}${b.proposal?._accentOptions ? `\n  Accent options (none in the logo): ${b.proposal._accentOptions.join(" · ")}` : ""}\n  Never replace the brand hue. Refine lightness/chroma only, keep AA.`;
  } else {
    const pal = pickPalette(); colour = { source: "curated", palette: pal };
    colourLine = `- **Palette (curated, contrast-checked):** ${fmtPal(pal)}${noBrand ? `\n  Brand lock overridden: ${noBrand}` : ""}\n  Use these values as the starting tokens; adjust lightness slightly if needed, never swap the hue family. Accent is for fills and marks; check it before using it as text.`;
  }
  const theme = colour.source === "curated" ? colour.palette.theme : "light";
  const strategies = A.palette_strategy.filter((p) => theme === "dark" ? !/^(Pure white|Light, airy|Photography-led)/.test(p) : !/^Tinted dark ground/.test(p));
  const draw = { mode, project, date: new Date().toISOString().slice(0, 10), quality: pickA("quality_reference")[0], composition: pickA("composition")[0], device: pickA("brand_device")[0], palette: strategies[rand(strategies.length)], type: pickA("type_strategy")[0], colour, vetoed: [] };
  mkdirSync(resolve(".design-review"), { recursive: true });
  writeFileSync(join(resolve(".design-review"), "last-draw.json"), JSON.stringify(draw, null, 2));
  console.log(`### Agency draw — ${project} (${draw.date})
- **Quality reference** (a quality to match, not a look to copy): ${draw.quality}
- **Composition system:** ${draw.composition}
- **Brand device** (used with restraint, everywhere): ${draw.device}
- **Palette strategy** (how colour is distributed): ${draw.palette}
${colourLine}
- **Type strategy:** ${draw.type}

Rules: these are levers, not decoration. Beauty and brand fit come first; if a lever would make the site less beautiful for THIS client, veto it (one veto, written reason).
--redraw quality|composition|device|palette|type|colour${brandArg ? " (colour is brand-locked: redraw ignored)" : ""}`);
  // palette_strategy must suit the colour source: drop dark-ground strategies for light palettes and vice versa

  process.exit(0);
}
if (mode === "agency" && redraw) {
  const lastP = join(resolve(".design-review"), "last-draw.json");
  if (!existsSync(lastP)) { console.error("No previous draw."); process.exit(1); }
  const dr = JSON.parse(readFileSync(lastP, "utf8"));
  const map = { quality: "quality_reference", composition: "composition", device: "brand_device", palette: "palette_strategy", type: "type_strategy" };
  if (redraw === "colour" || redraw === "hue") { if (dr.colour?.source === "brand") { console.error("Colour is brand-locked; it can't be redrawn."); process.exit(1); } const prev = dr.colour?.palette?.name; dr.vetoed.push({ slot: "colour", card: prev }); dr.colour = { source: "curated", palette: pickPalette([prev]) }; }
  else if (map[redraw]) { const pool = decks.agency[map[redraw]].filter((c) => c !== dr[redraw]); dr.vetoed.push({ slot: redraw, card: dr[redraw] }); dr[redraw] = pool[rand(pool.length)]; }
  else { console.error("--redraw must be quality|composition|device|palette|type|colour in agency mode"); process.exit(1); }
  writeFileSync(lastP, JSON.stringify(dr, null, 2));
  console.log(`Redrew ${redraw}: ${redraw === "colour" || redraw === "hue" ? fmtPal(dr.colour.palette) : dr[redraw]}${dr.vetoed.length > 1 ? "\nWARNING: more than one veto used." : ""}`);
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
