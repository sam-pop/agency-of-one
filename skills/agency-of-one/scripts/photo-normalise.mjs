#!/usr/bin/env node
// photo-normalise.mjs: give a set of people photos one treatment before layout.
// Crops every image to the same ratio with the head in the same place, and puts cut-outs
// (transparent PNGs, or plain light backdrops) onto one backdrop colour. Real photos with
// busy backgrounds are only cropped, never cut out.
//
//   node photo-normalise.mjs public/img/board --ratio 4:5 --backdrop "#1d2a6b" [--width 800] [--out DIR] [--headroom 0.08] [--keep-light]
//
// Writes <dir>-normalised/ (or --out) and prints one line per image. Needs Playwright (npm i -D playwright).
import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, resolve, extname, basename } from "node:path";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const dir = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!dir) { console.error("usage: photo-normalise.mjs <dir> --ratio 4:5 --backdrop \"#hex\" [--width 800] [--out DIR]"); process.exit(1); }
const [rw, rh] = opt("ratio", "4:5").split(":").map(Number);
const backdrop = opt("backdrop", "#e9ecef");
const width = +opt("width", 800), headroom = +opt("headroom", 0.08);
const keepLight = args.includes("--keep-light");
const out = resolve(opt("out", dir.replace(/[\\/]$/, "") + "-normalised"));
if (!/^#[0-9a-f]{6}$/i.test(backdrop)) { console.error("--backdrop must be a #rrggbb hex"); process.exit(1); }

let chromium;
try { chromium = createRequire(join(process.cwd(), "package.json"))("playwright").chromium; }
catch { console.error("Playwright not found. Run: npm i -D playwright && npx playwright install chromium"); process.exit(1); }

const files = readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && statSync(join(dir, f)).isFile());
if (!files.length) { console.error(`no images in ${dir}`); process.exit(1); }
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");

for (const f of files) {
  const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[extname(f).toLowerCase()];
  const src = `data:${mime};base64,${readFileSync(join(dir, f)).toString("base64")}`;
  const res = await page.evaluate(async ({ src, rw, rh, backdrop, width, headroom, keepLight }) => {
    const img = new Image(); img.src = src; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, W, H); const px = d.data;
    // 1) background: transparent pixels, or a plain light backdrop flood-filled from the border
    let alpha = 0; for (let i = 3; i < px.length; i += 4) if (px[i] < 200) alpha++;
    const bg = new Uint8Array(W * H);
    let kind = "photo";
    if (alpha > W * H * 0.05) { kind = "cutout"; for (let i = 0; i < W * H; i++) bg[i] = px[i * 4 + 3] < 128 ? 1 : 0; }
    else if (!keepLight) {
      // edge colour: is the border plain and light?
      const edge = []; for (let X = 0; X < W; X += Math.max(1, W >> 6)) { edge.push(X, X + (H - 1) * W); } for (let Y = 0; Y < H; Y += Math.max(1, H >> 6)) edge.push(Y * W, Y * W + W - 1);
      const lum = (i) => (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3, sat = (i) => Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) - Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
      const plain = edge.filter((i) => lum(i) > 225 && sat(i) < 18).length / edge.length;
      const corners = [0, W - 1, (H - 1) * W, H * W - 1];
      const roundCrop = plain <= 0.85 && corners.every((i) => lum(i) > 215 && sat(i) < 30);
      if (roundCrop) { // pre-cropped circle/rounded avatar sitting on a light page colour: fill only the corners
        kind = "round-crop";
        // the avatar is a circle touching the edges: measure the light rim on the four midlines, mask outside it
        const cxm = (W - 1) / 2, cym = (H - 1) / 2, ym = Math.round(cym) * W, xm = Math.round(cxm);
        const rimL = (start, step, max) => { let k = 0; while (k < max && lum(start + k * step) > 170 && sat(start + k * step) < 60) k++; return k; };
        const rims = [rimL(ym, 1, W >> 2), rimL(ym + W - 1, -1, W >> 2), rimL(xm, W, H >> 2), rimL(xm + (H - 1) * W, -W, H >> 2)].sort((p, q) => p - q);
        const r = Math.min(W, H) / 2 - rims[1] - 1.5;
        for (let i = 0; i < W * H; i++) if (Math.hypot(i % W - cxm, ((i / W) | 0) - cym) >= r) bg[i] = 1;
      } else if (plain > 0.85) {
        kind = "plain-backdrop";
        const q = []; for (const i of edge) if (lum(i) > 225 && sat(i) < 18) { bg[i] = 1; q.push(i); }
        while (q.length) { const i = q.pop(), X = i % W, Y = (i / W) | 0; for (const n of [X > 0 && i - 1, X < W - 1 && i + 1, Y > 0 && i - W, Y < H - 1 && i + W]) if (n !== false && !bg[n] && lum(n) > 215 && sat(n) < 24) { bg[n] = 1; q.push(n); } }
      }
    }
    // 2) subject box (non-background) → crop to ratio with headroom; photo: centre on frame
    let minX = W, minY = H, maxX = 0, maxY = 0, sx = 0, n = 0;
    if (kind === "cutout" || kind === "plain-backdrop") {
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) if (!bg[Y * W + X]) { if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y; }
      // centre on the head: mean x of subject pixels in the top 25% of the subject
      const lim = minY + (maxY - minY) * 0.25; for (let Y = minY; Y < lim; Y++) for (let X = minX; X <= maxX; X++) if (!bg[Y * W + X]) { sx += X; n++; }
    }
    const target = rw / rh;
    let cw, ch, cx, cy;
    if (kind === "photo" || n === 0) { // crop only: largest box of the ratio, upper-centred (faces sit high in portraits)
      if (W / H > target) { ch = H; cw = H * target; } else { cw = W; ch = W / target; }
      cx = (W - cw) / 2; cy = Math.max(0, (H - ch) * 0.2);
    } else {
      const headX = sx / n; const subjW = maxX - minX;
      // frame the subject at ~80% of crop width, head with fixed headroom
      cw = Math.max(subjW / 0.8, 1); ch = cw / target;
      cy = minY - ch * headroom; cx = headX - cw / 2;
    }
    const o = document.createElement("canvas"); o.width = width; o.height = Math.round(width / target); const ox = o.getContext("2d");
    ox.fillStyle = backdrop; ox.fillRect(0, 0, o.width, o.height);
    if (kind === "plain-backdrop" || kind === "round-crop") { for (let i = 0; i < W * H; i++) if (bg[i]) px[i * 4 + 3] = 0; x.putImageData(d, 0, 0); }
    ox.imageSmoothingQuality = "high";
    // draw via a padded canvas so crops that run past the image edge keep their scale
    const pad = Math.ceil(Math.max(cw, ch)); const pc = document.createElement("canvas"); pc.width = W + pad * 2; pc.height = H + pad * 2; pc.getContext("2d").drawImage(c, pad, pad);
    ox.drawImage(pc, cx + pad, cy + pad, cw, ch, 0, 0, o.width, o.height);
    return { kind, url: o.toDataURL(kind === "photo" ? "image/jpeg" : "image/png", 0.9), crop: [Math.round(cx), Math.round(cy), Math.round(cw), Math.round(ch)], size: [W, H] };
  }, { src, rw, rh, backdrop, width, headroom, keepLight });
  const ext = res.kind === "photo" ? ".jpg" : ".png";
  const name = basename(f, extname(f)) + ext;
  writeFileSync(join(out, name), Buffer.from(res.url.split(",")[1], "base64"));
  console.log(`${f.padEnd(32)} ${res.kind.padEnd(15)} ${res.size.join("×")} → ${name}${res.kind === "photo" ? " (cropped only: real background kept)" : res.kind === "round-crop" ? ` (pre-cropped avatar: corners filled with ${backdrop}; show these in a circular frame or ask for the uncropped originals)` : ` (on ${backdrop})`}`);
}
await browser.close();
console.log(`\nWrote ${files.length} images to ${out}. Mixed kinds? Use one backdrop that matches the studio photos, or ask the client for matching portraits.`);
