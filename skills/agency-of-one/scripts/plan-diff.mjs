#!/usr/bin/env node
// plan-diff.mjs: did the build implement what DESIGN.md says?
// Research ("Design Theater", 2026) found >25% of an agent's stated design decisions
// never reach the output. This compares DESIGN.md tokens against what actually rendered.
//
//   node plan-diff.mjs [--design DESIGN.md] [--report .design-review/render-report.json]
//
// Checks: every typeface named in DESIGN.md §4 Type is actually loaded/rendered;
// every hex in §4 Colour appears in the rendered colours (ΔRGB < 18); rendered
// background/text colours with real area that are NOT in the plan; and the
// rendered font-size steps vs the plan's scale ratio.
import { readFileSync, existsSync } from "node:fs";

const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : d; };
const designPath = opt("design", "DESIGN.md"), reportPath = opt("report", ".design-review/render-report.json");
if (!existsSync(designPath) || !existsSync(reportPath)) { console.error(`Need ${designPath} and ${reportPath} (run screenshot.mjs first).`); process.exit(2); }
const design = readFileSync(designPath, "utf8");
const report = JSON.parse(readFileSync(reportPath, "utf8"));

// Preferred: the ```tokens JSON block in DESIGN.md. Fallback: the markdown tables.
let planFonts = [], planHex = [], ratio = null, base = null, fluid = [];
const tok = design.match(/```tokens\s*([\s\S]*?)```/);
if (tok) {
  try {
    const t = JSON.parse(tok[1]);
    planFonts = Object.values(t.fonts || {}).filter((f) => f && !/^</.test(f));
    planHex = Object.values(t.colors || {}).filter((c) => /^#[0-9a-f]{6}$/i.test(c) && c !== "#000000").map((c) => c.toLowerCase());
    ratio = t.scale?.ratio || null; base = t.scale?.base || null; fluid = t.scale?.fluid || [];
  } catch (e) { console.error(`tokens block is not valid JSON: ${e.message}`); process.exit(2); }
} else {
  const section = (title) => { const m = design.match(new RegExp(`###?\\s*${title}[\\s\\S]*?(?=\\n###? |$)`, "i")); return m ? m[0] : ""; };
  const typeSec = section("Type"), colourSec = section("Colou?r");
  planFonts = [...typeSec.matchAll(/^\|\s*(?:Display|Text|Body|Utility|Mono|Heading)[^|]*\|\s*([^|(]+)/gim)].map((m) => m[1].trim()).filter((f) => f && !/^<|^face/i.test(f));
  planHex = [...new Set([...colourSec.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()))];
  ratio = Number((typeSec.match(/ratio\s*<?\s*([\d.]+)/i) || [])[1]) || null;
  base = Number((typeSec.match(/base\s*<?\s*([\d.]+)/i) || [])[1]) || null;
  console.error("(note) No ```tokens block in DESIGN.md; parsed tables instead (less reliable).");
}
const steps = base && ratio ? Array.from({ length: 14 }, (_, i) => base * ratio ** (i - 4)) : [];
const rgbToHex = (s) => { const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/); return m ? "#" + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, "0")).join("") : null; };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const near = (h1, h2, t = 18) => { const [a1, b1, c1] = hexRgb(h1), [a2, b2, c2] = hexRgb(h2); return Math.hypot(a1 - a2, b1 - b2, c1 - c2) < t; };

let fails = 0; const out = [];
for (const page of report.pages) {
  const m = page.metrics; if (!m) continue;
  out.push(`\n## ${page.route}`);
  const loaded = (m.fontFacesLoaded || []).join(" ").toLowerCase();
  const rendered = (m.fontsRenderedByTextShare || []).map(([f]) => f.toLowerCase()).join(" ");
  for (const f of planFonts) {
    const key = f.toLowerCase().split(/\s+/)[0];
    const ok = loaded.includes(key) || rendered.includes(key);
    if (!ok) fails++;
    out.push(`${ok ? "✓" : "✖"} font  ${f}${ok ? "" : ": NOT loaded/rendered (fallback in use?)"}`);
  }
  if ((m.fontFacesFailed || []).length) { fails++; out.push(`✖ font faces failed to load: ${m.fontFacesFailed.join(", ")}`); }
  const renderedHex = [...(m.textColours || []), ...(m.backgroundsByArea || [])].map(([c]) => rgbToHex(c)).filter(Boolean).concat(rgbToHex(m.bodyBackground || "") || []);
  for (const h of planHex) { const ok = renderedHex.some((r) => near(r, h)); out.push(`${ok ? "✓" : "·"} colour ${h}${ok ? "" : " (not seen in top rendered colours; fine if it's a rare accent)"}`); }
  const stray = (m.backgroundsByArea || []).slice(0, 5).map(([c, area]) => [rgbToHex(c), area]).filter(([h]) => h && !planHex.some((p) => near(p, h, 24)));
  for (const [h, area] of stray) { if (area > 200000) { fails++; out.push(`✖ off-plan background ${h} covering ~${Math.round(area / 1000)}k px²`); } }
  const sizes = (m.fontSizeSteps || []).map(([s]) => parseFloat(s)).filter(Boolean).sort((x, y) => x - y);
  const tw = new Set([12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128]);
  if (sizes.length >= 4 && sizes.every((s) => tw.has(Math.round(s)))) { fails++; out.push(`✖ every rendered size is a Tailwind default step (${sizes.join("/")}); the plan's scale wasn't applied`); }
  else if (steps.length) {
    const maxStep = Math.max(...steps.filter((x) => x < 200));
    const off = sizes.filter((sz) => !steps.some((st) => Math.abs(st - sz) <= Math.max(1, st * 0.03)) && !(fluid.length && sz > base * ratio ** 2));
    out.push(`${off.length > 2 ? "▲" : "✓"} type scale: rendered ${sizes.join("/")} vs planned ${steps.filter((x) => x >= 10 && x <= maxStep).map((x) => x.toFixed(1)).join("/")}${off.length ? `; off-scale: ${off.join("/")}` : ""}`);
  } else out.push(`· rendered size steps: ${sizes.join("/")}`);
  if (m.centredTextShare > 0.7) { fails++; out.push(`✖ ${Math.round(m.centredTextShare * 100)}% of text blocks centred`); }
  if (m.upperTrackedLabels > 3) out.push(`▲ ${m.upperTrackedLabels} tracked uppercase labels rendered (eyebrow tell?)`);
  if (page.mobileHorizontalOverflow) { fails++; out.push("✖ horizontal overflow on mobile"); }
}
console.log(`plan-diff: ${planFonts.length} planned faces, ${planHex.length} planned colours${steps.length ? `, scale ${base}px × ${ratio}` : ""}${out.join("\n")}\n\n${fails ? `${fails} plan/implementation gap(s). Fix them, or amend DESIGN.md on purpose.` : "Plan and render agree."}`);
process.exit(fails ? 1 : 0);
