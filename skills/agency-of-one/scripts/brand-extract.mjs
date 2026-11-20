#!/usr/bin/env node
// brand-extract.mjs: the brand's existing assets decide the palette, not a random draw.
// Reads the logo and photos, clusters their colours in OKLab, and proposes a palette
// built around what the brand already owns (with contrast checked).
//
//   node brand-extract.mjs public/logo.svg public/img/board/*.jpg   # explicit files
//   node brand-extract.mjs                                           # auto-discover logo/favicon/og/team images
//
// Output: .design-review/brand.json + a printed summary. draw.mjs --brand reads it and
// locks the palette and hue levers to the brand.
// Needs Playwright (same as screenshot.mjs); images are passed as data URLs, so no file:// tainting.
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, extname, relative } from "node:path";
import { createRequire } from "node:module";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif", ".avif": "image/avif" };

const LOGO_RE = /(^|[-_.\s])(logo|logotype|crest|emblem|seal|wordmark|monogram|favicon|apple-touch-icon|og[-_]?image|brandmark)([-_.\s]|$)/i;
const PEOPLE_RE = /(^|[-_./\\])(team|board|trustees?|leaders?(hip)?|staff|people|portraits?|headshots?|scholars?|members?|faculty)([-_./\\]|$)/i;
const SKIP_DIR = /(^|[\\/])(node_modules|\.git|\.next|dist|build|out|\.design-review|icons?|sponsors?|partners?|clients?|brands|press|vendor|third[-_]?party)([\\/]|$)/i;
function classify(p) { const base = p.split(/[\\/]/).pop(); if (LOGO_RE.test(base)) return "logo"; if (PEOPLE_RE.test(p)) return "photo"; return null; }
function discover() {
  const out = []; const roots = ["public", "static", "assets", "src/assets", "app", "images", "img", "."];
  const walk = (d, depth) => { if (depth > 4 || !existsSync(d)) return; for (const f of readdirSync(d)) { const p = join(d, f); if (SKIP_DIR.test(p)) continue; const st = statSync(p); if (st.isDirectory()) walk(p, depth + 1); else if (MIME[extname(f).toLowerCase()] && classify(p) && st.size < 8e6) out.push(p); } };
  for (const r of roots) walk(r, r === "." ? 3 : 0);
  return [...new Set(out)].slice(0, 40);
}
const files = (args.length ? args : discover()).filter((f) => existsSync(f));
if (!files.length) { console.log("No brand assets found. Pass logo/photo paths explicitly, or there is no existing brand: use draw.mjs (curated palettes)."); process.exit(0); }

let chromium;
for (const base of [join(process.cwd(), "package.json"), import.meta.url]) { try { const m = createRequire(base)("playwright"); chromium = m.chromium || m.default?.chromium; if (chromium) break; } catch {} }
if (!chromium) { console.error("Playwright not found in this project: npm i -D playwright && npx playwright install chromium"); process.exit(2); }

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
const perFile = [];
for (const f of files) {
  const ext = extname(f).toLowerCase(); const isLogo = (args.length && process.argv.includes("--logo") && f === args[0]) || classify(f) === "logo";
  const url = `data:${MIME[ext]};base64,${readFileSync(f).toString("base64")}`;
  const px = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode().catch(() => {});
    const w = 96, h = Math.max(1, Math.round(96 * (img.naturalHeight || 1) / (img.naturalWidth || 1)));
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
    try { return Array.from(x.getImageData(0, 0, w, h).data); } catch { return []; }
  }, url);
  perFile.push({ file: relative(process.cwd(), f), isLogo, px });
}
await browser.close();

// ---- colour math (OKLab / OKLCH) ----
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function toLab(r, g, b) { r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; }
const lch = ([L, a, b]) => ({ L, C: Math.hypot(a, b), H: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 });
function fromLch(L, C, H) { const h = H * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map((c) => { c = Math.max(0, Math.min(1, c)); c = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(c * 255); }); }
const hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
const relL = (rgb) => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = relL(a), y = relL(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ---- logo: modal quantised colours, taken verbatim (never averaged or clamped) ----
function modalColours(px, { skipLight = true } = {}) {
  const buckets = new Map();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 200) continue; const rgb = [px[i], px[i + 1], px[i + 2]]; const c = lch(toLab(...rgb));
    if (skipLight && c.L > 0.94 && c.C < 0.03) continue; // paper/white background
    const key = rgb.map((v) => v >> 4).join(","); const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 }; b.n++; b.r += rgb[0]; b.g += rgb[1]; b.b += rgb[2]; buckets.set(key, b);
  }
  const tot = [...buckets.values()].reduce((a, b) => a + b.n, 0) || 1;
  return [...buckets.values()].map((b) => { const rgb = [b.r / b.n, b.g / b.n, b.b / b.n].map(Math.round); return { rgb, hex: hex(rgb), share: b.n / tot, ...lch(toLab(...rgb)) }; })
    .sort((a, b) => b.share - a.share);
}
function mergeSimilar(list) { const out = []; for (const c of list) { const m = out.find((o) => Math.hypot(o.L - c.L, (o.C - c.C) * 2, (Math.min(Math.abs(o.H - c.H), 360 - Math.abs(o.H - c.H)) / 360) * (o.C + c.C)) < 0.06); if (m) m.share += c.share; else out.push({ ...c }); } return out.sort((a, b) => b.share - a.share); }
const logoFiles = perFile.filter((f) => f.isLogo);
const logoCols = mergeSimilar(logoFiles.flatMap((f) => modalColours(f.px).map((c) => ({ ...c, share: c.share / logoFiles.length }))));
const chromaticLogo = logoCols.filter((c) => c.C >= 0.04 && c.share >= 0.03);
const monochrome = logoFiles.length > 0 && chromaticLogo.length === 0;
// ---- photos: backdrop colour per file (edge pixels), reported separately, never the brand ----
const photoBackdrops = perFile.filter((f) => !f.isLogo && f.px.length).map((f) => {
  const w = 96, h = f.px.length / 4 / w, edge = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (x > 5 && x < w - 6 && y > 5 && y < h - 6) continue; const i = (y * w + x) * 4; edge.push(f.px[i], f.px[i + 1], f.px[i + 2], f.px[i + 3]); }
  const top = modalColours(edge, { skipLight: false })[0]; return top ? { file: f.file, backdrop: top.hex, cutout: top.L > 0.94 && top.C < 0.03 } : null; }).filter(Boolean);
const primary = chromaticLogo[0];
const brandHues = chromaticLogo.slice(0, 5).map((c) => ({ hex: c.hex, oklch: `oklch(${c.L.toFixed(2)} ${c.C.toFixed(3)} ${Math.round(c.H)})`, hue: Math.round(c.H), share: +c.share.toFixed(2) }));
const neutrals = logoCols.filter((c) => c.C < 0.04).slice(0, 3).map((c) => c.hex);
const proposal = {};
if (primary) {
  const H = primary.H, C = primary.C;
  const ground = [255, 255, 255];
  const P = { ground, groundAlt: fromLch(0.968, Math.min(0.012, C / 6), H), ink: fromLch(0.2, Math.min(0.035, C / 3), H), muted: fromLch(0.47, Math.min(0.02, C / 5), H),
    brand: primary.rgb, brandDeep: fromLch(Math.min(0.28, primary.L), Math.min(C, 0.13), H), brandLight: fromLch(0.94, Math.min(0.035, C / 3), H) };
  // text in brand colour must pass AA on the ground: darken only the text variant, never the brand itself
  let L = primary.L, forText = primary.rgb; while (contrast(forText, ground) < 4.5 && L > 0.15) { L -= 0.02; forText = fromLch(L, C, H); }
  P.brandForText = forText;
  const second = chromaticLogo.find((c) => Math.min(Math.abs(c.H - H), 360 - Math.abs(c.H - H)) > 40 && c.share >= 0.05);
  if (second) P.accent = second.rgb;
  for (const [k, v] of Object.entries(P)) proposal[k] = hex(v);
  proposal.brandText = contrast([255, 255, 255], primary.rgb) >= 4.5 ? "white" : "ink";
  if (!second) proposal._accentOptions = [["warm gold", 0.78, 0.12, 85], ["brass", 0.66, 0.09, 80], ["signal red", 0.55, 0.17, 25], ["fresh green", 0.62, 0.13, 150], ["sky", 0.75, 0.09, 230], ["coral", 0.68, 0.14, 35]]
    .filter(([, , , h]) => Math.min(Math.abs(h - H), 360 - Math.abs(h - H)) > 50).map(([n, l, c, h]) => `${n} ${hex(fromLch(l, c, h))}`);
  proposal._contrast = { "ink/ground": contrast(P.ink, ground), "brand/ground": contrast(primary.rgb, ground), "brandForText/ground": contrast(forText, ground), "text-on-brand": contrast(proposal.brandText === "white" ? [255, 255, 255] : P.ink, primary.rgb) };
}
const out = { generatedAt: new Date().toISOString(), files: perFile.map((f) => ({ file: f.file, logo: f.isLogo })), logoFound: logoFiles.length > 0, monochrome, brandHues, neutrals, photoBackdrops, proposal,
  rules: ["The brand colour is the logo's own colour, verbatim: build the palette around it; never replace it.", "Use brandForText for brand-coloured text on light grounds; use the brand itself for fills, marks and large areas.", "Photo backdrops are reported separately: people-photo treatments should harmonise with them and with the brand.", "Confirm the brand colour with the user when attended (show the candidates)."] };
mkdirSync(".design-review", { recursive: true });
writeFileSync(".design-review/brand.json", JSON.stringify(out, null, 2));
const say = [];
say.push(`Brand assets read: ${perFile.length} (${logoFiles.length} logo/mark${logoFiles.length ? ": " + logoFiles.map((f) => f.file).join(", ") : ""})`);
if (!logoFiles.length) say.push("⚠ No logo found by filename. Pass it explicitly first: brand-extract.mjs --logo path/to/logo.svg [photos…]");
if (monochrome) say.push("Logo is monochrome: no brand hue to lock. draw.mjs will use a curated palette (state this in DESIGN.md), keeping the logo's black/white as ink/ground.");
if (brandHues.length) say.push(`Logo colour candidates (confirm the primary with the user when attended):\n${brandHues.map((b, i) => `  ${i ? "  " : "→ "}${b.hex}  ${b.oklch}  ${Math.round(b.share * 100)}% of logo ink`).join("\n")}`);
if (photoBackdrops.length) say.push(`Photo backdrops (people photos, never the brand): ${photoBackdrops.map((p) => `${p.file.split("/").pop()} ${p.cutout ? "cut-out/white" : p.backdrop}`).join(" · ")}`);
if (primary) say.push(`Proposed palette: ${Object.entries(proposal).filter(([k]) => k[0] !== "_").map(([k, v]) => `${k} ${v}`).join(" · ")}\nContrast: ${Object.entries(proposal._contrast).map(([k, v]) => `${k} ${v}:1`).join(" · ")}${proposal._accentOptions ? `\nNo second colour in the logo. Accent options (sparingly, or none): ${proposal._accentOptions.join(" · ")}` : ""}`);
say.push(`→ .design-review/brand.json. draw.mjs now ${primary ? "LOCKS colour to this brand automatically" : "falls back to a curated palette"}.`);
console.log(say.join("\n"));
