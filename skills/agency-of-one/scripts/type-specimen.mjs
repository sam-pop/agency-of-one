#!/usr/bin/env node
// type-specimen.mjs: choose typefaces by LOOKING, not from memory.
// Renders each candidate with your real hero sentence, a body paragraph, numerals and a data row,
// side by side, and screenshots the sheet.
//
//   npm i @fontsource/<slug> ...   (or put .woff2/.ttf files in ./fonts)
//   node type-specimen.mjs --fonts "Familjen Grotesk, Besley, Schibsted Grotesk, Young Serif" \
//        --text "Senior technical judgment, on call." --body "<a real paragraph>" --data "Retainer · 4 days/month · $8,500" [--weight 700]
//
// Output: .design-review/type-specimen.html and .design-review/type-specimen.png
import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { createRequire } from "node:module";

const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : d; };
const fonts = (opt("fonts", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
if (fonts.length < 2) { console.error('Give 2–8 candidates: --fonts "Face A, Face B, Face C"'); process.exit(1); }
const hero = opt("text", "The quick decision your company has been putting off.");
const data = opt("data", "Invoice 2026-0142 · 14 Nov · $12,480.00 · Net 30");
const weight = opt("weight", "");
const body = opt("body", "A paragraph of real body copy from this project belongs here: pass it with --body so you judge the text face on the words it will actually set, at the size it will actually be read.");
const out = resolve(".design-review"); mkdirSync(out, { recursive: true });

const slug = (f) => f.toLowerCase().replace(/\s+/g, "-");
function findFiles(face) {
  const files = [];
  const fsDir = join("node_modules", "@fontsource", slug(face), "files");
  const vDir = join("node_modules", "@fontsource-variable", slug(face), "files");
  for (const dir of [vDir, fsDir]) if (existsSync(dir)) for (const f of readdirSync(dir)) if (/latin-(?:wght-|\d{3}-)?(normal|italic)\.woff2$/.test(f) && !/latin-ext/.test(f)) files.push(join(dir, f));
  if (existsSync("fonts")) for (const f of readdirSync("fonts")) if (f.toLowerCase().replace(/[^a-z]/g, "").startsWith(slug(face).replace(/-/g, "")) && /\.(woff2?|ttf|otf)$/i.test(f)) files.push(join("fonts", f));
  return files;
}
let faces = "", missing = [];
for (const face of fonts) {
  const files = findFiles(face);
  if (!files.length) { missing.push(face); continue; }
  for (const f of files) {
    const w = (f.match(/-(\d{3})-/) || [])[1] || (/wght/.test(f) ? "100 900" : "400");
    const style = /italic/i.test(f) ? "italic" : "normal";
    faces += `@font-face{font-family:"${face}";src:url("${relative(out, resolve(f)).replace(/\\/g, "/")}");font-weight:${w};font-style:${style};font-display:block}\n`;
  }
}
if (missing.length) console.error(`Not found locally (npm i @fontsource/<slug> or add to ./fonts): ${missing.join(", ")}`);
const usable = fonts.filter((f) => !missing.includes(f));
if (!usable.length) process.exit(1);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = `<!doctype html><meta charset="utf-8"><style>${faces}
body{margin:0;background:#f4f4f2;color:#16181a;font:14px/1.4 system-ui}
.sheet{display:grid;grid-template-columns:repeat(${Math.min(usable.length, 2)},1fr);gap:1px;background:#d8d8d4}
.c{background:#fbfbf9;padding:40px 44px 48px}
.name{font:600 12px/1 system-ui;color:#767672;margin-bottom:28px}
.h{font-size:64px;line-height:1.0;letter-spacing:-0.02em;margin:0 0 28px;text-wrap:balance;${weight ? `font-weight:${weight}` : ""}}
.b{font-size:18px;line-height:1.55;max-width:34em;margin:0 0 22px}
.n{font-size:30px;font-variant-numeric:tabular-nums lining-nums;margin:0 0 10px}
.d{font-size:15px;font-variant-numeric:tabular-nums;border-top:1px solid #d8d8d4;padding-top:12px}
.w{font-size:20px;margin-top:16px}</style>
<div class="sheet">${usable.map((f) => `<section class="c" style="font-family:'${f}',monospace"><div class="name">${esc(f)}</div>
<h1 class="h">${esc(hero)}</h1>
<p class="b">${esc(body)}</p>
<p class="n">0123456789 · $48,250 · 12.5%</p><div class="d">${esc(data)}</div>
<div class="w"><span style="font-weight:300">Light</span> · <span style="font-weight:400">Regular</span> · <span style="font-weight:600">Semibold</span> · <span style="font-weight:800">Heavy</span> · <i>Italic</i></div></section>`).join("")}</div>`;
const htmlPath = join(out, "type-specimen.html"); writeFileSync(htmlPath, html);

let chromium;
for (const base of [join(process.cwd(), "package.json"), import.meta.url]) { try { const m = createRequire(base)("playwright"); chromium = m.chromium || m.default?.chromium; if (chromium) break; } catch {} }
if (!chromium) { console.log(`Wrote ${htmlPath}. Install Playwright (npm i -D playwright) to get the PNG.`); process.exit(0); }
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("file://" + htmlPath); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
const png = join(out, "type-specimen.png"); await page.screenshot({ path: png, fullPage: true }); await browser.close();
console.log(`✓ ${png}\nLook at it. Choose the face whose numerals and hero line feel like THIS company. Note in DESIGN.md why the others lost.`);
