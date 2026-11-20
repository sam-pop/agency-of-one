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

import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : d; };
const multi = (n) => { const i = a.indexOf(`--${n}`); if (i < 0) return null; const out = []; for (let j = i + 1; j < a.length && !a[j].startsWith("--"); j++) out.push(a[j]); return out; };

const file = opt("file", null);
const base = file ? pathToFileURL(resolve(file)).href : opt("url", "http://localhost:3000");
const routes = file ? ["/"] : multi("routes") || ["/"];
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

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const report = { base, generatedAt: new Date().toISOString(), pages: [] };

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
  const url = file ? base : new URL(route, base).href;
  const slug = (route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "_")) || "home";
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
        await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if (p === "fixed") el.style.setProperty("position", "absolute", "important"); else if (p === "sticky") el.style.setProperty("position", "relative", "important"); } });
      }
      const shot = join(out, `${slug}__${name}.png`);
      await page.screenshot({ path: shot, fullPage: full });
      entry[name] = shot;
      if (name === "desktop") entry.metrics = await measure(page);
      if (name === "mobile") entry.mobileHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (consoleErrors.length) entry[`${name}ConsoleErrors`] = consoleErrors.slice(0, 5);
    } catch (e) { entry[`${name}Error`] = String(e.message || e); }
    await ctx.close();
  }
  report.pages.push(entry);
  console.log(`✓ ${route} → ${slug}__{fold,desktop,scroll50,mobilefold,mobile,reduced${states.map((x) => ",state-" + x.name).join("")}}.png`);
}
await browser.close();
writeFileSync(join(out, "render-report.json"), JSON.stringify(report, null, 2));
console.log(`\nReport: ${join(out, "render-report.json")}\nNow LOOK at the PNGs: fold first, then full desktop, then mobile.`);
