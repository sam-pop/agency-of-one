#!/usr/bin/env node
// screenshot.mjs: render pages and measure what ACTUALLY shipped to the browser.
//
//   node screenshot.mjs --url http://localhost:3000 --routes / /pricing [--out .design-review]
//   node screenshot.mjs --file ./index.html            # static file, no server
//   --state flip=click:#flip-button   --state back=hash:#back   --state form=scroll:#signup
//       (repeatable) capture the signature element's other states at desktop + mobile
//   --wait 1500   extra settle time cap (ms); by default waits until running animations finish (max 6s)
//   --widths 1024,768,1920   extra viewport-sized fold shots + full page at those widths
//
// Needs Playwright:  npm i -D playwright && npx playwright install chromium
// (or set CHROME_PATH to an installed Chrome/Chromium).
//
// Output in .design-review/:
//   <route>__desktop.png (1440 full page), <route>__fold.png (1440x900 viewport),
//   <route>__mobile.png (390 full page), <route>__mobilefold.png (390x844 viewport),
//   <route>__scroll50.png (desktop viewport at 50% scroll: sticky/scroll-driven elements),
//   <route>__reduced.png, <route>__state-<name>__{desktop,mobile}.png, render-report.json
// render-report.json lists the fonts actually rendered (vs fallback), the computed
// colour distribution, the font-size steps in use, the border-radius and box-shadow
// distribution, centred-text share, max line length, and fonts that failed to load.
// The design-reviewer agent reads it.

import { mkdirSync, writeFileSync, readdirSync, rmSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve, dirname, relative, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";

const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : d; };
const multi = (n) => { const i = a.indexOf(`--${n}`); if (i < 0) return null; const out = []; for (let j = i + 1; j < a.length && !a[j].startsWith("--"); j++) out.push(a[j]); return out; };

const files = multi("file");
const file = files && files.length ? files[0] : null;
const base = file ? pathToFileURL(resolve(file)).href : opt("url", "http://localhost:3000");
// --file a.html b.html c.html → one capture set per page (slug from file name); --routes for a server
const routes = files && files.length ? files : multi("routes") || ["/"];
const out = resolve(opt("out", ".design-review"));
const waitCap = Number(opt("wait", "6000"));
const extraWidths = (opt("widths", "") || "").split(",").map(Number).filter((w) => w >= 320);
const states = []; a.forEach((v, i) => { if (v === "--state" && a[i + 1]) { const [name, ...rest] = a[i + 1].split("="); states.push({ name, action: rest.join("=") }); } });
async function settle(page) {
  // wait for fonts + running CSS/WAAPI animations to finish (capped), instead of a fixed delay
  await page.evaluate(async (cap) => {
    await document.fonts.ready; const t0 = performance.now();
    while (performance.now() - t0 < cap) {
      const running = document.getAnimations().filter((an) => an.playState === "running" && an.effect?.getComputedTiming().iterations !== Infinity);
      if (!running.length) break; await new Promise((r) => setTimeout(r, 100));
    }
  }, waitCap);
  await page.waitForTimeout(200);
}
async function doAction(page, action) {
  const [kind, ...rest] = action.split(":"); const arg = rest.join(":");
  if (kind === "click") await page.click(arg);
  else if (kind === "hash") await page.evaluate((h) => { location.hash = h; }, arg);
  else if (kind === "scroll") await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), arg);
  else if (kind === "hover") await page.hover(arg);
  else throw new Error(`unknown state action ${kind} (use click|hash|scroll|hover)`);
  await settle(page);
}
mkdirSync(out, { recursive: true });

// Resolve Playwright from the PROJECT (cwd) first, so plugin/global installs work,
// then fall back to the script's own location.
import { createRequire } from "node:module";
let chromium;
for (const base of [join(process.cwd(), "package.json"), import.meta.url]) {
  try { const mod = createRequire(base)("playwright"); chromium = mod.chromium || mod.default?.chromium; if (chromium) break; } catch {}
}
if (!chromium) { console.error("Playwright not found in this project. Run: npm i -D playwright && npx playwright install chromium"); process.exit(2); }

// --file mode: serve the files from 127.0.0.1 instead of file:// so canvas pixel checks work
// without --allow-file-access-from-files (which lets any page script read any file on disk).
const inside = (p, r) => p === r || p.startsWith(r.endsWith(sep) ? r : r + sep);
let server = null, origin = null, root = null;
if (file) {
  const abs = files.map((f) => realpathSync(resolve(f)));
  const cwd = realpathSync(process.cwd());
  root = abs.every((p) => inside(p, cwd)) ? cwd : abs.map(dirname).reduce((x, y) => { while (!inside(y, x)) x = dirname(x); return x; });
  const MIME = { ".html": "text/html", ".htm": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain" };
  const safe = (p) => { const r = realpathSync(p); if (!inside(r, root)) throw new Error("outside root"); return r; };
  server = createServer((req, res) => {
    try {
      let p = safe(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
      if (statSync(p).isDirectory()) p = safe(join(p, "index.html"));
      const body = readFileSync(p);
      res.writeHead(200, { "content-type": MIME[extname(p).toLowerCase()] || "application/octet-stream" }); res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const report = { base, generatedAt: new Date().toISOString(), pages: [] };

// ---- beauty checks (added after a real client build looked "not AI, but not good"; hardened after a blind audit) ----
async function beauty(page) {
  return page.evaluate(async () => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== "none"; };
    const EXEMPT = "nav, header nav, [role=menu], [role=dialog], dialog, details:not([open]), [aria-hidden=true], [hidden], [data-device], [role=progressbar], .sr-only, .visually-hidden";
    const exemptAnc = (e) => !!e.closest(EXEMPT) || [...ancestors(e)].some((a) => /(menu|drawer|dropdown|tooltip|popover|modal|overlay|hover|caption-reveal|skip)/i.test(a.className || ""));
    function* ancestors(e) { for (let n = e; n && n.nodeType === 1; n = n.parentElement) yield n; }
    const cumOpacity = (e) => { let o = 1; for (const n of ancestors(e)) { const cs = getComputedStyle(n); o *= parseFloat(cs.opacity); if (cs.visibility === "hidden") return 0; } return o; };
    const inFlow = (e) => [...ancestors(e)].every((n) => (!["fixed", "absolute"].includes(getComputedStyle(n).position) && !n.dataset?.dfWasFixed) || n === document.body);
    const textOf = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    const all = [...document.querySelectorAll("body *")].filter(vis);
    const centred = [], caps = [], bars = [], invisible = [], initials = [];
    for (const e of all) {
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), t = textOf(e);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
      if (t.length > 40 && cs.textAlign === "center" && r.height > lh * 1.6 && r.width > 200 && !/^H[1-2]$/.test(e.tagName) && !e.closest("button, a.btn, [role=button]")) centred.push(t.slice(0, 50));
      if (t.length >= 3 && cs.textTransform === "uppercase" && !e.closest("[data-device]")) caps.push(t.slice(0, 40));
      for (const pseudo of ["::before", "::after"]) { const ps = getComputedStyle(e, pseudo); if (ps.content === "none" || ps.content === "normal") continue; const w = parseFloat(ps.width), h = parseFloat(ps.height); if (w >= 24 && w <= 180 && h >= 1 && h <= 8 && ps.backgroundColor !== "rgba(0, 0, 0, 0)" && !e.closest("[data-device],[role=progressbar]")) bars.push(`${pseudo} ${Math.round(w)}×${Math.round(h)}`); }
      if (!e.closest("[data-device],[role=progressbar],[data-df-was-fixed]") && cs.position !== "fixed" && ((!t && !e.children.length && r.width >= 24 && r.width <= 180 && r.height >= 1 && r.height <= 8 && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && e.tagName !== "HR") || (e.tagName === "HR" && r.width <= 180))) bars.push(`${Math.round(r.width)}×${Math.round(r.height)}`);
      if ((t.length > 2 || e.tagName === "IMG") && cumOpacity(e) < 0.35 && inFlow(e) && !exemptAnc(e)) invisible.push(e.tagName === "IMG" ? `img ${e.alt || e.src.split("/").pop()}` : t.slice(0, 40));
      const whole = e.textContent.trim();
      if (/^[A-Z]{1,3}$/.test(whole) && r.width >= 40 && Math.abs(r.width - r.height) < 8 && !e.closest("[data-device]") && !e.querySelector("img,svg")) { const grid = e.parentElement?.closest("ul,ol,section,div"); if (grid && grid.querySelectorAll("img").length >= 2) initials.push(whole); }
    }
    // image groups (people grids etc.): aspect, height and backdrop consistency (corner pixels)
    const groups = {}, imgHues = [];
    for (const img of document.querySelectorAll("img")) {
      const r = img.getBoundingClientRect(); if (r.width < 60 || !img.complete || !img.naturalWidth) continue; // unloaded (lazy, off-screen) images have no pixels to judge
      let corner = null, hue = null;
      try { const c = document.createElement("canvas"); c.width = 48; c.height = 48; const x = c.getContext("2d"); x.drawImage(img, 0, 0, 48, 48); const d = x.getImageData(0, 0, 48, 48).data;
        const px = (X, Y) => { const i = (Y * 48 + X) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
        // sample the backdrop where it's visible: image corners, or inside the circle when CSS rounds the image
        const rounded = (n) => n && (parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0) >= n.getBoundingClientRect().width * 0.3; const round = rounded(img) || [img.parentElement, img.parentElement?.parentElement].some((n) => n && getComputedStyle(n).overflow !== "visible" && rounded(n));
        const cs = round ? [px(10, 12), px(37, 12), px(6, 20), px(41, 20)] : [px(1, 1), px(46, 1), px(1, 46), px(46, 46)]; corner = cs;
        let sx = 0, sy = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const [rr, g, b] = [d[i], d[i + 1], d[i + 2]]; if (d[i + 3] < 200) continue; const mx = Math.max(rr, g, b), mn = Math.min(rr, g, b); const sat = mx ? (mx - mn) / mx : 0; if (sat < 0.35 || mx < 50) continue; let h = mx === mn ? 0 : mx === rr ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - rr) / (mx - mn) + 2 : (rr - g) / (mx - mn) + 4; h = (h * 60 + 360) % 360; if (h > 10 && h < 50 && sat < 0.65) continue; sx += Math.cos(h * Math.PI / 180); sy += Math.sin(h * Math.PI / 180); n++; }
        if (n > 48 * 48 * 0.12) hue = { hue: Math.round((Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360), coverage: +(n / (48 * 48)).toFixed(2) };
      } catch {}
      const k = (img.className || img.parentElement?.className || "img") + "|" + Math.round(r.width / 40);
      (groups[k] ||= []).push({ ar: (img.naturalWidth || r.width) / (img.naturalHeight || r.height), fit: getComputedStyle(img).objectFit, h: r.height, corner, hue, name: (img.alt || img.src.split("/").pop()).slice(0, 30) });
    }
    const inconsistent = [], peopleHues = [];
    for (const [k, g] of Object.entries(groups)) {
      if (g.length < 3) continue;
      const ars = g.map((x) => x.ar), hs = g.map((x) => x.h); const arSpread = Math.max(...ars) / Math.min(...ars), hSpread = Math.max(...hs) / Math.min(...hs);
      // robust backdrop check: per sample position, the group's median colour; an image is off when even its
      // two best-matching positions differ (so a head or shoulder crossing one sample point doesn't count)
      const cs = g.map((x) => x.corner).filter(Boolean); let backdropSpread = 0; const off = [];
      if (cs.length >= 3) { const med = [0, 1, 2, 3].map((pos) => [0, 1, 2, 3].map((ch) => { const v = cs.map((c) => c[pos][ch]).sort((a, b) => a - b); return v[v.length >> 1]; }));
        for (const [ci, c] of cs.entries()) { const ds = c.map((p, pos) => Math.hypot(p[0] - med[pos][0], p[1] - med[pos][1], p[2] - med[pos][2], (p[3] - med[pos][3]) * 1.5)).sort((a, b) => a - b); const dv = (ds[0] + ds[1]) / 2; if (dv > 70) off.push(g.filter((x) => x.corner)[ci].name); backdropSpread = Math.max(backdropSpread, dv); } }
      if ((arSpread > 1.25 && !/cover/.test(g.map((x) => x.fit).join())) || hSpread > 1.15 || backdropSpread > 70) inconsistent.push({ group: k.split("|")[0].slice(0, 40), n: g.length, arSpread: +arSpread.toFixed(2), heightSpread: +hSpread.toFixed(2), backdropSpread: Math.round(backdropSpread), off: off.slice(0, 6) });
      for (const x of g) if (x.hue) peopleHues.push({ img: x.name, ...x.hue });
    }
    // images shown bigger than their pixels can support on a 2x screen (soft on retina)
    const soft = [...document.querySelectorAll("img")].filter((im) => { const r = im.getBoundingClientRect(); return im.complete && im.naturalWidth && r.width >= 48 && !/\.svg(\?|$)/i.test(im.currentSrc || im.src) && im.naturalWidth < r.width * 1.5; }).map((im) => `${(im.alt || im.src.split("/").pop()).slice(0, 30)} (${im.naturalWidth}px shown at ${Math.round(im.getBoundingClientRect().width)}px)`);
    // page header: first-viewport h1 size and whether the fold carries an image
    const h1 = document.querySelector("h1"); const h1Size = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0;
    const foldImage = [...document.querySelectorAll("img, picture, video, svg, [style*='background-image']")].some((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width * r.height > innerWidth * innerHeight * 0.08; });
    return { centredParagraphs: centred.length, centredSamples: centred.slice(0, 4), capsHeadings: caps.length, capsSamples: caps.slice(0, 5), dividerBars: bars.length, invisibleContent: invisible.slice(0, 8), initialsAvatars: initials, inconsistentImageGroups: inconsistent, imageHues: peopleHues, header: { h1Size, foldImage }, softImages: soft.slice(0, 6), softCount: soft.length };
  });
}
async function measure(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const els = [...document.querySelectorAll("body *")].filter((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    });
    const tally = (m, k, w = 1) => (m[k] = (m[k] || 0) + w);
    const fonts = {}, sizes = {}, colors = {}, bgs = {}, radii = {}, shadows = {};
    let textEls = 0, centred = 0, upperTracked = 0, maxChars = 0;
    for (const e of els) {
      const cs = getComputedStyle(e);
      const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (hasText) {
        textEls++;
        const fam = cs.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        const len = e.textContent.trim().length;
        tally(fonts, fam, len); tally(sizes, cs.fontSize, len); tally(colors, cs.color, len);
        if (cs.textAlign === "center") centred++;
        if (cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing) > 0.5) upperTracked++;
        const fs = parseFloat(cs.fontSize); const w = e.getBoundingClientRect().width;
        if (fs) maxChars = Math.max(maxChars, Math.round(w / (fs * 0.5)) > 200 ? 0 : Math.min(Math.round(w / (fs * 0.5)), len));
      }
      const r = e.getBoundingClientRect(); const area = r.width * r.height;
      if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") tally(bgs, cs.backgroundColor, area);
      if (cs.borderTopLeftRadius !== "0px") tally(radii, cs.borderTopLeftRadius);
      if (cs.boxShadow !== "none") tally(shadows, cs.boxShadow);
    }
    const top = (m, n = 8) => Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, n);
    const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`);
    const failed = [...document.fonts].filter((f) => f.status === "error").map((f) => `${f.family} ${f.weight}`);
    const bodyBgRaw = getComputedStyle(document.body).backgroundColor;
    const bodyBg = bodyBgRaw === "rgba(0, 0, 0, 0)" ? getComputedStyle(document.documentElement).backgroundColor : bodyBgRaw;
    return {
      title: document.title,
      fontsRenderedByTextShare: top(fonts), fontFacesLoaded: [...new Set(loaded)], fontFacesFailed: [...new Set(failed)],
      fontSizeSteps: top(sizes, 14), textColours: top(colors), backgroundsByArea: top(bgs), bodyBackground: bodyBg,
      borderRadii: top(radii), boxShadows: top(shadows, 5),
      textElements: textEls, centredTextShare: textEls ? +(centred / textEls).toFixed(2) : 0,
      upperTrackedLabels: upperTracked, approxMaxLineChars: maxChars,
      sectionCount: document.querySelectorAll("section").length,
    };
  });
}

for (const route of routes) {
  const url = file ? new URL(relative(root, realpathSync(resolve(route))).split(sep).map(encodeURIComponent).join("/"), origin + "/").href : new URL(route, base).href;
  const slug = file ? (route.split(/[\\/]/).pop().replace(/\.html?$/i, "").replace(/^index$/, "home").replace(/[^\w-]+/g, "_")) : ((route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "_")) || "home");
  const entry = { route, url };
  const shots = [["desktop", { width: 1440, height: 900 }, true, false], ["fold", { width: 1440, height: 900 }, false, false], ["scroll50", { width: 1440, height: 900 }, false, false], ["mobile", { width: 390, height: 844 }, true, false], ["mobilefold", { width: 390, height: 844 }, false, false], ["mobile33", { width: 390, height: 844 }, false, false], ["mobile66", { width: 390, height: 844 }, false, false], ["reduced", { width: 1440, height: 900 }, false, true]];
  for (const w of extraWidths) { shots.push([`w${w}-fold`, { width: w, height: 900 }, false, false]); shots.push([`w${w}-full`, { width: w, height: 900 }, true, false]); }
  // remove stale captures for this route so reviewers never judge an old build
  for (const f of readdirSync(out)) if (f.startsWith(`${slug}__`) && f.endsWith(".png")) rmSync(join(out, f));
  for (const st of states) { shots.push([`state-${st.name}__desktop`, { width: 1440, height: 900 }, false, false, st.action]); shots.push([`state-${st.name}__mobile`, { width: 390, height: 844 }, false, false, st.action]); }
  for (const [name, vp, full, reduced, action] of shots) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 2 : 1, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await settle(page);
      const frac = { mobile33: 1 / 3, mobile66: 2 / 3 }[name];
      if (frac) { await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), frac); await settle(page); }
      if (name === "scroll50") { await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2)); await settle(page); }
      if (action) await doAction(page, action);
      if (full) { // trigger lazy/in-view content
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
        await page.waitForTimeout(500);
        // Full-page captures stitch the page; fixed/sticky elements would be painted over content
        // (false "header overlaps H1" defects). Neutralise them for full-page shots only.
        await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if (p === "fixed") { el.dataset.dfWasFixed = "1"; el.style.setProperty("position", "absolute", "important"); } else if (p === "sticky") { el.dataset.dfWasSticky = "1"; el.style.setProperty("position", "relative", "important"); } } });
      }
      const shot = join(out, `${slug}__${name}.png`);
      await page.screenshot({ path: shot, fullPage: full });
      entry[name] = shot;
      if (name === "fold") entry.header = (await beauty(page)).header;
      if (name === "desktop") { entry.metrics = await measure(page); entry.beauty = await beauty(page); }
      if (name === "mobile") entry.mobileBeauty = await beauty(page);
      if (name === "mobile") entry.mobileHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (consoleErrors.length) entry[`${name}ConsoleErrors`] = consoleErrors.slice(0, 5);
    } catch (e) { entry[`${name}Error`] = String(e.message || e); }
    await ctx.close();
  }
  try { const nctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }); const np = await nctx.newPage(); await np.goto(url, { waitUntil: "load", timeout: 45000 }); await np.waitForTimeout(400);
    entry.noJsInvisible = (await beauty(np)).invisibleContent; await nctx.close(); } catch {}
  report.pages.push(entry);
  console.log(`✓ ${route} → ${slug}__{fold,desktop,scroll50,mobilefold,mobile,reduced${states.map((x) => ",state-" + x.name).join("")}}.png`);
}
await browser.close();
if (server) { server.closeAllConnections(); server.close(); }
writeFileSync(join(out, "render-report.json"), JSON.stringify(report, null, 2));
console.log(`\nReport: ${join(out, "render-report.json")}\nNow LOOK at the PNGs: fold first, then full desktop, then mobile.`);
