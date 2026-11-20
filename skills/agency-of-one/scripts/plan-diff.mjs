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
function okl(h) { const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s2 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2;
  return { L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 }; }
const rgbToHex = (s) => { const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/); return m ? "#" + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, "0")).join("") : null; };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const near = (h1, h2, t = 18) => { const [a1, b1, c1] = hexRgb(h1), [a2, b2, c2] = hexRgb(h2); return Math.hypot(a1 - a2, b1 - b2, c1 - c2) < t; };

let fails = 0; const out = [];
// ---- brand check: the palette must contain the logo's colour (brand.json from brand-extract) ----
const brandFile = opt("brand", ".design-review/brand.json");
if (existsSync(brandFile)) { try { const bj = JSON.parse(readFileSync(brandFile, "utf8")); const prim = bj.brandHues?.[0]?.hex;
  if (prim && !bj.monochrome) { const P = okl(prim); const nearest = planHex.map((h) => ({ h, c: okl(h) })).filter((x) => x.c.C >= 0.04).map((x) => ({ ...x, d: Math.min(Math.abs(x.c.H - P.H), 360 - Math.abs(x.c.H - P.H)) })).sort((a, b) => a.d - b.d)[0];
    if (!nearest || nearest.d > 25) { fails++; out.push(`\n✖ BRAND: the planned palette doesn't contain the logo colour ${prim} (OKLCH hue ${Math.round(P.H)}°; nearest planned ${nearest ? `${nearest.h} at ${Math.round(nearest.c.H)}°` : "none"}). Build the palette from brand.json.`); }
    else out.push(`\n✓ BRAND: palette contains the logo hue (${prim} ≈ ${nearest.h})`); } } catch {} }
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
  // ---- beauty checks (desktop + mobile + no-JS merged) ----
  const D = page.beauty || {}, M = page.mobileBeauty || {};
  if (page.beauty) {
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    const inv = uniq([...(D.invisibleContent || []), ...(M.invisibleContent || [])]);
    if (inv.length) { fails++; out.push(`✖ content left invisible after scrolling (a reveal animation never fired): ${inv.slice(0, 4).join(" | ")}`); }
    if ((page.noJsInvisible || []).length) { fails++; out.push(`✖ content hidden until JavaScript runs (no-JS render): ${page.noJsInvisible.slice(0, 3).join(" | ")}. Hide only from JS, after adding a class to <html>.`); }
    const ini = uniq([...(D.initialsAvatars || []), ...(M.initialsAvatars || [])]);
    if (ini.length) { fails++; out.push(`✖ initials placeholders in a people grid (${ini.join(", ")}) read as missing photos: same frame for everyone, with a designed no-photo state`); }
    const groups = [...(D.inconsistentImageGroups || []), ...(M.inconsistentImageGroups || [])].filter((g, k, a) => a.findIndex((x) => x.group === g.group) === k);
    for (const g of groups) { fails++; out.push(`✖ inconsistent photos in "${g.group}" (${g.n} images: aspect ×${g.arSpread}, height ×${g.heightSpread}, backdrop spread ${g.backdropSpread}${g.off?.length ? `; odd ones out: ${g.off.join(", ")}` : ""}): one crop, size and backdrop for all`); }
    const cen = Math.max(D.centredParagraphs || 0, M.centredParagraphs || 0);
    if (cen > 2) { fails++; out.push(`✖ ${cen} centred multi-line text blocks (hard to read; every page looks the same): left-align body copy`); }
    const caps = Math.max(D.capsHeadings || 0, M.capsHeadings || 0);
    if (caps > 3) { fails++; out.push(`✖ ${caps} uppercase-transformed labels/headings (${(D.capsSamples || M.capsSamples || []).slice(0, 3).join(" | ")}): sentence case`); }
    const bars = Math.max(D.dividerBars || 0, M.dividerBars || 0);
    if (bars > 1) { fails++; out.push(`✖ ${bars} short decorative divider bars (incl. ::before/::after): let space, scale or a ground change separate sections`); }
    const hdr = page.header || D.header;
    if (hdr && hdr.h1Size && hdr.h1Size < 40 && !hdr.foldImage) { fails++; out.push(`✖ no designed page header: h1 is ${Math.round(hdr.h1Size)}px and the fold has no image. Give each page a real header (scale, photo or a strong typographic moment)`); }
    else if (hdr && !hdr.h1Size) out.push("▲ no h1 on this page");
    if ((D.softCount || 0) > 0) out.push(`▲ ${D.softCount} image(s) shown larger than their pixels allow on 2x screens: ${D.softImages.slice(0, 3).join(", ")}. Show smaller or ask the client for originals.`);
    const hueOf = (h) => { const c = okl(h); return c.C < 0.04 ? null : c.H; };
    const palHues = planHex.map(hueOf).filter((h) => h !== null);
    const dist = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const clashes = (D.imageHues || []).filter((im) => im.coverage >= 0.25 && palHues.length && palHues.every((ph) => dist(ph, im.hue) > 45));
    if (clashes.length) out.push(`▲ people photos lean away from the palette: ${clashes.slice(0, 4).map((c) => `${c.img} (hue ${c.hue}°)`).join(", ")} vs palette hues ${palHues.map(Math.round).join("/")}°. Harmonise the photo treatment or check the palette against brand.json.`);
  }
}
console.log(`plan-diff: ${planFonts.length} planned faces, ${planHex.length} planned colours${steps.length ? `, scale ${base}px × ${ratio}` : ""}${out.join("\n")}\n\n${fails ? `${fails} plan/implementation gap(s). Fix them, or amend DESIGN.md on purpose.` : "Plan and render agree."}`);
process.exit(fails ? 1 : 0);
