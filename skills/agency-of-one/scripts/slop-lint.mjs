#!/usr/bin/env node
// slop-lint.mjs: static detector for code-level "AI-generated design" tells.
// Zero dependencies. Node 18+.
//
//   node slop-lint.mjs [paths...] [--json] [--warn-only] [--quiet] [--file-mode]
//   --file-mode skips project-wide rules (used by the edit hook on single files)
//
// Default paths: app src components pages styles public lib + root *.html/*.css
// Config (optional) at repo root: slop-lint.config.json
//   { "ignore": ["components/legacy/**"], "allowRules": ["arrow-suffix"],
//     "allowFonts": ["Fraunces"], "thresholds": { "eyebrow": 4 } }
// Inline suppression: put `slop-ok` (or `slop-ok: rule-id`) in a comment on the line.
//
// Exit code: 1 if any `error` findings (unless --warn-only), else 0.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, resolve } from "node:path";

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const root = process.cwd();
let paths = argv.filter((a) => !a.startsWith("--"));
const cfgPath = join(root, "slop-lint.config.json");
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
const allowRules = new Set(cfg.allowRules || []);
const allowFonts = new Set((cfg.allowFonts || []).map((f) => f.toLowerCase()));
// colours DESIGN.md deliberately plans (tokens block) are exempt from colour-tell rules
const plannedHex = new Set();
try { const dm = readFileSync(join(root, "DESIGN.md"), "utf8"); const tb = dm.match(/```tokens\s*([\s\S]*?)```/); if (tb) for (const v of Object.values(JSON.parse(tb[1]).colors || {})) if (/^#[0-9a-f]{6}$/i.test(v)) plannedHex.add(v.toLowerCase()); } catch {}
try { const bj = JSON.parse(readFileSync(join(root, ".design-review/brand.json"), "utf8")); for (const v of Object.values(bj.proposal || {})) if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) plannedHex.add(v.toLowerCase()); } catch {}
const T = { eyebrow: 2, arrow: 2, middot: 0, grid3: 1, fadeUp: 2, neutrals: 20, uniformRadius: 0.7, uniformShadow: 0.7, monoLabels: 3, emdash: 3, numbered: 0, ...(cfg.thresholds || {}) };

const EXT = new Set([".tsx", ".jsx", ".ts", ".js", ".mjs", ".html", ".htm", ".css", ".scss", ".sass", ".less", ".vue", ".svelte", ".astro", ".mdx", ".md"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".nuxt", ".svelte-kit", ".astro", "dist", "build", "out", ".git", "coverage", ".turbo", ".vercel", ".design-review", ".claude"]);
const ignoreGlobs = (cfg.ignore || []).map(globToRe);

if (!paths.length) {
  paths = ["app", "src", "components", "pages", "styles", "public", "lib", "layouts", "content"].filter((p) => existsSync(join(root, p)));
  for (const f of readdirSync(root)) if (/\.(html?|css|scss|[jt]sx?|mjs|vue|svelte|astro)$/.test(f) && !/\.config\.|^(?:eslint|prettier|postcss|vite|next|svelte|astro|playwright|jest|vitest)\b/.test(f) || /^tailwind\.config\./.test(f)) paths.push(f);
}

function globToRe(g) {
  return new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "§").replace(/\*/g, "[^/]*").replace(/§/g, ".*") + "$");
}
function walk(p, out = []) {
  const abs = resolve(root, p);
  if (!existsSync(abs)) return out;
  const st = statSync(abs);
  if (st.isDirectory()) {
    for (const e of readdirSync(abs)) if (!SKIP_DIRS.has(e)) walk(join(p, e), out);
  } else if (EXT.has(extname(abs)) || /tailwind\.config\./.test(abs)) {
    const rel = relative(root, abs);
    if (!ignoreGlobs.some((re) => re.test(rel)) && st.size < 1_500_000) out.push(rel);
  }
  return out;
}
const files = [...new Set(paths.flatMap((p) => walk(p)))];

// ---------- data ----------
const FONTS_GENERIC = ["inter", "roboto", "open sans", "lato", "arial", "helvetica", "helvetica neue", "poppins", "montserrat", "nunito", "source sans pro", "source sans 3", "segoe ui", "noto sans"];
const FONTS_OVERUSED = ["space grotesk", "dm sans", "dm serif display", "plus jakarta sans", "geist", "geist sans", "manrope", "outfit", "fraunces", "instrument serif", "instrument sans", "playfair display", "bricolage grotesque", "satoshi", "general sans", "cabinet grotesk", "clash display", "clash grotesk", "syne", "figtree", "sora", "cormorant", "cormorant garamond", "bebas neue", "oswald", "lexend", "urbanist", "raleway", "work sans", "jetbrains mono", "space mono", "ibm plex mono", "geist mono", "dm mono", "newsreader", "eb garamond", "libre baskerville", "unbounded", "archivo black", "be vietnam pro", "onest", "mona sans", "hubot sans", "neue montreal", "pp neue montreal", "pp editorial new", "editorial new", "tiempos", "gt america", "suisse", "aeonik", "recoleta", "mona sans", "ibm plex sans", "ibm plex serif"];
const BUZZ = ["supercharge", "unlock the power", "unleash", "seamless", "seamlessly", "elevate your", "revolutioni[sz]e", "game[- ]chang", "cutting[- ]edge", "next[- ]generation", "next[- ]gen", "empower", "effortless", "streamline", "harness the", "all[- ]in[- ]one", "take your .{1,30} to the next level", "in today'?s fast[- ]paced", "built for the modern", "designed for the modern", "lightning[- ]fast", "world[- ]class", "best[- ]in[- ]class", "your journey", "say goodbye to", "look no further", "we'?ve got you covered", "transform the way", "reimagine", "redefin(e|ing) ", "blazing", "magic(al)? ", "lorem ipsum", "john doe", "jane doe", "acme (inc|corp)", "globex", "initech", "techcorp", "build the future of", "scale without limits", "your all[- ]in[- ]one", "best[- ]in[- ]class", "robust", "load[- ]bearing", "quietly (trusted|powerful|confident)", "thoughtfully (designed|crafted)", "is (just )?theater", "crafted with care", "powered by ai"];
const STOCK_STATS = /(?:^|[\s>"'(])(?:\d{1,3}(?:,\d{3})+\+|\d+[kKM]\+|99\.9+%|10x faster|24\/7|5\.0 ?★|4\.9\/5)(?=[\s<"'.,)]|$)/;

// ---------- helpers ----------
const findings = [];
function add(rule, sev, file, line, msg, hint) {
  if (allowRules.has(rule)) return;
  findings.push({ rule, sev, file, line, msg, hint });
}
function suppressed(lineText, rule) {
  const m = lineText.match(/slop-ok(?::\s*([\w-]+))?/);
  return m && (!m[1] || m[1] === rule);
}
function hexToHsl(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
  if (h.length !== 6 && h.length !== 8) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let s = 0, hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
  }
  return { h: hue, s, l, rgb: [r * 255, g * 255, b * 255] };
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const rgbOf = (hex) => hexToHsl(hex)?.rgb;

// Global counters (cross-file heuristics)
const C = { cta: {}, radius: {}, shadow: {}, eyebrow: [], arrow: [], middot: [], grid3: [], fadeUp: [], neutrals: [], monoLabels: [], numbered: [], emdash: [], animations: [], reducedMotion: false, customTypeScale: false, defaultTextScale: 0, fontsDeclared: new Map() };

// ---------- per-file scan ----------
for (const file of files) {
  const text = readFileSync(join(root, file), "utf8");
  const lines = text.split("\n");
  const isStyle = /\.(css|scss|sass|less)$/.test(file);
  const isMarkup = /\.(tsx|jsx|html?|vue|svelte|astro|mdx)$/.test(file);

  if (/prefers-reduced-motion|useReducedMotion|motion-reduce:|reducedMotion=|MotionConfig/.test(text)) C.reducedMotion = true;
  if (/--(font-size|text|fs|step)-[\w-]+\s*:|fontSize\s*:\s*\{|clamp\(\s*[\d.]+r?em/.test(text)) C.customTypeScale = true;

  // CSS eyebrows: only rule blocks that are uppercase AND tracked AND small (or size-less), not every uppercase.
  const cssText = isStyle ? text : isMarkup ? [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n") : "";
  if (cssText) {
    for (const m of cssText.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const body = m[2].toLowerCase();
      if (!/text-transform\s*:\s*uppercase/.test(body)) continue;
      const ls = body.match(/letter-spacing\s*:\s*([\d.]+)(em|px|rem)/); if (!ls) continue;
      const lsEm = ls[2] === "px" ? +ls[1] / 14 : +ls[1]; if (lsEm < 0.03) continue;
      const fs = body.match(/font-size\s*:\s*([\d.]+)(px|rem|em)/); const px = fs ? (fs[2] === "px" ? +fs[1] : +fs[1] * 16) : 12;
      if (px <= 15 && !suppressed(m[0], "eyebrow")) C.eyebrow.push([file, text.slice(0, m.index).split("\n").length]);
    }
    for (const m of text.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const b = m[2].toLowerCase(); const w = b.match(/(?:^|;|\s)width\s*:\s*(\d+)px/), h = b.match(/(?:^|;|\s)height\s*:\s*(\d+)px/);
      if (/text-transform\s*:\s*uppercase/.test(b) && /(^|[\s,])(?:h[1-4]|\.[\w-]*(?:label|heading|title|section)[\w-]*)\b/i.test(m[1])&& !suppressed(m[0], "caps-heading")) C.caps = (C.caps || []).concat([[file, text.slice(0, text.indexOf(m[1].trim()) ).split("\n").length]], [[file, 0]], [[file, 0]]);
      if (/text-align\s*:\s*center/.test(b) && /(^|[\s,>])(body|main|section|article|p|\.(?:container|content|wrapper|page|card|section)[\w-]*)\s*$/i.test(m[1].trim().split(",").pop()) && !suppressed(m[0], "centred-body")) add("centred-body", "error", file, text.slice(0, m.index).split("\n").length, `text-align:center on ${m[1].trim().slice(0, 40)}`, "Left-align body copy; centre only short display lines.");
      if (w && h && +w[1] >= 24 && +w[1] <= 160 && +h[1] <= 8 && /background/.test(b) && /margin[^;]*auto/.test(b) && !suppressed(m[0], "divider-bar")) add("divider-bar", "error", file, text.slice(0, m.index).split("\n").length, `Short centred decorative divider bar (${w[1]}×${h[1]}px)`, "Template habit. Separate sections with space, scale or a real rule system.");
    }
  }
  lines.forEach((ln, i) => {
    const L = i + 1;
    const low = ln.toLowerCase();
    const chk = (rule) => !suppressed(ln, rule);

    // ---- fonts ----
    const fontNames = [];
    for (const m of ln.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]next\/font\/google['"]/g)) fontNames.push(...m[1].split(",").map((s) => s.trim().replace(/_/g, " ")));
    for (const m of ln.matchAll(/fonts\.googleapis\.com\/css2?\?([^"')\s]+)/g)) for (const f of m[1].matchAll(/family=([^:&]+)/g)) fontNames.push(decodeURIComponent(f[1].replace(/\+/g, " ")));
    for (const m of ln.matchAll(/@fontsource(?:-variable)?\/([\w-]+)/g)) fontNames.push(m[1].replace(/-/g, " "));
    for (const m of ln.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) { const first = m[1].split(",")[0].trim().replace(/['"]/g, ""); if (!first.startsWith("var(")) fontNames.push(first); }
    for (const m of ln.matchAll(/fontFamily\s*:\s*\{?[^}\n]*?\[\s*['"]([^'"]+)['"]/g)) fontNames.push(m[1]);
    for (const m of ln.matchAll(/--font-[\w-]+\s*:\s*['"]?([^,;'"]+)/g)) if (!m[1].startsWith("var(")) fontNames.push(m[1].trim());
    for (const raw of fontNames) {
      const f = raw.toLowerCase().replace(/\s+variable$/, "").trim();
      if (!f || allowFonts.has(f)) continue;
      C.fontsDeclared.set(f, (C.fontsDeclared.get(f) || 0) + 1);
      if (FONTS_GENERIC.includes(f) && chk("font-generic")) add("font-generic", "error", file, L, `Generic default font: ${raw}`, "Choose via references/typography.md; system fonts only as fallbacks after the chosen face.");
      else if (FONTS_OVERUSED.includes(f) && chk("font-overused")) add("font-overused", "warn", file, L, `Overused "tasteful AI" font: ${raw}`, "Pick from a less-trodden pool, or justify in DESIGN.md §Exceptions + allowFonts.");
    }

    // ---- colour: tailwind purple family ----
    if (/\b(?:from|via|to|bg|text|border|ring|shadow|fill|stroke|outline|decoration|accent|caret)-(?:purple|violet|indigo|fuchsia)-\d{2,3}\b/.test(ln) && chk("color-purple"))
      add("color-purple", "error", file, L, "Purple/violet/indigo/fuchsia Tailwind colour", "The #1 AI-slop tell. Use DESIGN.md palette tokens.");
    // gradient text
    if ((/bg-clip-text/.test(ln) && /text-transparent/.test(ln)) || /background-clip\s*:\s*text/.test(low))
      chk("gradient-text") && add("gradient-text", "error", file, L, "Gradient-filled text", "Let the typeface carry the headline.");
    // blue→purple / multi-stop decorative gradients
    if (/(bg-gradient-to-|bg-linear-to-|linear-gradient\(|radial-gradient\(|conic-gradient\()/.test(ln) && /(blue|sky|cyan|pink|purple|violet|indigo)/.test(low) && chk("gradient-wash"))
      add("gradient-wash", "warn", file, L, "Decorative blue/pink/purple gradient wash", "Gradients only if the palette source calls for them.");

    // hex colours
    for (const m of ln.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
      const hex = "#" + m[1]; const c = hexToHsl(hex); if (!c) continue;
      if (plannedHex.has(hex.toLowerCase()) || (m[1].length === 6 && plannedHex.has(("#" + m[1]).toLowerCase()))) continue;
      if (c.h >= 245 && c.h <= 295 && c.s > 0.35 && c.l > 0.25 && c.l < 0.8 && chk("color-purple")) add("color-purple", "warn", file, L, `Purple-range hex ${hex}`, "Is this from the palette source, or a default?");
      if (c.h >= 25 && c.h <= 70 && c.s >= 0.25 && c.l >= 0.88 && c.l <= 0.97 && (dist(c.rgb, rgbOf("#F4F1EA")) < 14 || dist(c.rgb, rgbOf("#FAF7F2")) < 10 || dist(c.rgb, rgbOf("#F5F0E8")) < 12)) chk("cream-ground") && add("cream-ground", "warn", file, L, `Cream "AI-tasteful" ground ${hex}`, "Gen-2 tell (cream + serif + terracotta). Pick a ground from the palette source.");
      if (dist(c.rgb, rgbOf("#D97757")) < 40 || dist(c.rgb, rgbOf("#C2410C")) < 25 || dist(c.rgb, rgbOf("#E07A5F")) < 30) chk("terracotta-accent") && add("terracotta-accent", "warn", file, L, `Terracotta/clay accent ${hex}`, "Gen-2 tell; also Claude's own UI colour.");
      if (c.l < 0.08 && c.l > 0.005 && c.s < 0.25 && chk("tinted-near-black")) add("tinted-near-black", "warn", file, L, `Near-black stand-in ${hex}`, "Gen-2 tell (#0B0B0B/#111/#09090b). Use real black or a real dark colour from the palette.");
      if (c.h >= 65 && c.h <= 135 && c.s > 0.75 && c.l > 0.45 && c.l < 0.7 && chk("acid-accent")) add("acid-accent", "warn", file, L, `Acid/lime accent ${hex}`, "Gen-2 tell when paired with near-black.");
    }
    if (/\bbg-(?:zinc|neutral|stone|gray|slate)-950\b/.test(ln) && chk("tinted-near-black")) add("tinted-near-black", "warn", file, L, "Tailwind *-950 near-black ground", "Gen-2 tell. Use a real dark colour from the palette.");
    if (/\b(?:bg|text)-(?:lime|green)-(?:300|400)\b/.test(ln) && chk("acid-accent")) add("acid-accent", "warn", file, L, "Lime/acid Tailwind accent", "Gen-2 tell on dark grounds.");

    // default tailwind neutrals as the system
    const nm = ln.match(/\b(?:bg|text|border|ring|divide|fill|stroke)-(?:zinc|slate|neutral|gray|stone)-\d{2,3}\b/g);
    if (nm && chk("default-neutrals")) C.neutrals.push(...nm.map(() => [file, L]));

    // shadcn default theme tokens
    if (/--radius\s*:\s*0\.(5|625)rem/.test(ln) || /--primary\s*:\s*(240 5\.9% 10%|222\.2 47\.4% 11\.2%|oklch\(0\.205 0 0\))/.test(ln) || /--background\s*:\s*oklch\(1 0 0\)/.test(ln) || /--ring\s*:\s*oklch\(0\.708 0 0\)/.test(ln))
      chk("shadcn-default") && add("shadcn-default", "warn", file, L, "Default shadcn/ui theme token", "Restyle primitives through DESIGN.md tokens.");

    // radius + shadow distribution
    for (const m of ln.matchAll(/\brounded(?:-(?:sm|md|lg|xl|2xl|3xl|full|none|\[[^\]]+\]))?\b/g)) C.radius[m[0]] = (C.radius[m[0]] || 0) + 1;
    for (const m of ln.matchAll(/\bshadow(?:-(?:sm|md|lg|xl|2xl|inner|none))?\b(?!-)/g)) C.shadow[m[0]] = (C.shadow[m[0]] || 0) + 1;
    if (/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.1\s*\)/.test(ln)) C.shadow["rgba(0,0,0,.1)"] = (C.shadow["rgba(0,0,0,.1)"] || 0) + 1;

    // glows, glass, blobs
    if ((/shadow-\[0_0_/.test(ln) || /drop-shadow-\[0_0_/.test(ln) || /box-shadow\s*:\s*0\s+0\s+\d{2,}px/.test(low) || /text-shadow\s*:\s*0\s+0\s+\d+px/.test(low)) && chk("glow"))
      add("glow", "warn", file, L, "Zero-offset glow", "Neon/soft glow is a dark-mode AI tell.");
    if (/backdrop-blur|backdrop-filter\s*:\s*blur/.test(low) && chk("glass")) add("glass", "warn", file, L, "Glassmorphism (backdrop blur)", "Only if the direction calls for it.");
    if (/blur-(?:2xl|3xl|\[\d{2,}px\])/.test(ln) && /rounded-full/.test(ln) && chk("blob")) add("blob", "error", file, L, "Blurred gradient blob decoration", "Classic AI hero decoration.");

    // icon in tinted rounded square (feature-card icon)
    if (/(?:h-1[0-6]|size-1[0-6]|w-1[0-6])/.test(ln) && /rounded-(?:lg|xl|2xl|full)/.test(ln) && /bg-(?:[a-z]+-(?:50|100)|primary\/\d+|accent\/\d+|[a-z]+-\d{3}\/(?:5|10|15|20))\b/.test(ln) && chk("icon-tile"))
      add("icon-tile", "warn", file, L, "Icon in a tinted rounded tile", "The feature-card icon tile. Do you need an icon here at all?");
    if (/\bSparkles\b|✨/.test(ln) && chk("sparkles")) add("sparkles", "error", file, L, "Sparkles icon/emoji", "The universal 'AI' glyph.");
    if (isMarkup && /<h[1-6][^>]*>[^<]*\p{Extended_Pictographic}/u.test(ln) && chk("emoji-heading")) add("emoji-heading", "error", file, L, "Emoji in a heading", "Emoji are not icons or decoration.");

    // layout patterns
    if (/\b(?:sm:|md:|lg:|xl:)?grid-cols-3\b/.test(ln) && chk("grid3")) C.grid3.push([file, L]);
    if ((/uppercase/.test(ln) && /tracking-(?:wide|wider|widest|\[0?\.\d+em\])/.test(ln)) && chk("eyebrow")) C.eyebrow.push([file, L]);
    if (/font-mono/.test(ln) && /text-(?:xs|\[1[01]px\])/.test(ln) && chk("mono-labels")) C.monoLabels.push([file, L]);
    if (isMarkup && />\s*0[1-9]\s*(?:\/|<|\.)/.test(ln) && chk("numbered")) C.numbered.push([file, L]);

    // chrome strings
    if (isMarkup) {
      const visible = ln.replace(/className=("[^"]*"|\{[^}]*\})/g, "");
      if (/[→↗]|&rarr;|ArrowRight|ArrowUpRight/.test(visible) && chk("arrow-suffix")) C.arrow.push([file, L]);
      if (/\w\s·\s\w/.test(visible) && chk("middot")) C.middot.push([file, L]);
      if (/[A-Z]{3,}\s—\s/.test(visible) && chk("emdash-label")) add("emdash-label", "warn", file, L, "'WORD — fragment' label", "Gen-2 template chrome.");
      if (/\s—\s/.test(visible)) C.emdash.push([file, L]);
      for (const b of BUZZ) if (new RegExp(`\\b${b}`, "i").test(visible) && chk("copy-buzz")) { add("copy-buzz", "warn", file, L, `Generic marketing copy: "${b.replace(/\\/g, "")}"`, "Write in the subject's vernacular; say what it does."); break; }
      if (STOCK_STATS.test(visible) && chk("stock-stats")) add("stock-stats", "warn", file, L, "Unsourced vanity stat", "Real numbers with sources, or none.");
      if (/trusted by|loved by|used by teams at/i.test(visible) && chk("trusted-by")) add("trusted-by", "warn", file, L, "'Trusted by' logo-strip copy", "Gen-1 SaaS chrome.");
      if (/\bgrayscale\b/.test(ln) && /opacity-(?:40|50|60|70)/.test(ln) && chk("logo-strip")) add("logo-strip", "warn", file, L, "Greyed-out logo strip", "Gen-1 SaaS chrome.");
      if (/["'>]\s*(?:Get Started|Learn More|Start (?:your )?free trial|Book a demo|Join the waitlist|Try it free|Sign up free)\s*["'<]/i.test(visible) && chk("generic-cta")) add("generic-cta", "warn", file, L, "Generic CTA label", "CTA should say exactly what happens, in the subject's words.");
    }

    // ---- research-driven G2/G3 additions ----
    if (isMarkup && /<h[1-3][^>]*>[^<]{2,}<(em|i)\b[^>]*>[^<]{1,40}<\/\1>[^<]*<\/h[1-3]>/.test(ln) && chk("accent-word"))
      add("accent-word", "warn", file, L, "Single accented word inside a headline", "G2 tell (Anthropic + Hallmark). Let the whole headline carry the type.");
    if (isMarkup && /<h[1-3][^>]*>[^<]{2,}<span className="[^"]*(?:italic|text-(?!\[)[a-z]+-\d{3}|font-serif)[^"]*">[^<]{1,40}<\/span>/.test(ln) && chk("accent-word"))
      add("accent-word", "warn", file, L, "Single styled word inside a headline", "G2 tell.");
    if (/\bborder-[lr]-(?:2|4|8)\b/.test(ln) && /rounded/.test(ln) && chk("side-stripe")) add("side-stripe", "warn", file, L, "Accent stripe on a rounded card", "G1-2 tell.");
    if (/\bborder\b(?!-)/.test(ln) && /\bshadow-(?:xl|2xl)\b/.test(ln) && chk("border-wide-shadow")) add("border-wide-shadow", "warn", file, L, "Hairline border + wide soft shadow", "G2 tell.");
    if ((/shadow-\[\d+px_\d+px_0(?:px)?_/.test(ln) || /box-shadow\s*:\s*(?:[4-9]|1\d)px\s+(?:[4-9]|1\d)px\s+0(?:px)?\s/.test(low)) && chk("hard-offset-shadow")) add("hard-offset-shadow", "warn", file, L, "Hard offset 'neobrutalist' shadow", "G3 escape-hatch tell, unless DESIGN.md chose it.");
    if ((/transition-all\b/.test(ln) || /transition\s*:\s*all\b/.test(low)) && chk("transition-all")) add("transition-all", "warn", file, L, "transition: all", "Animate specific properties (transform/opacity).");
    if (/animate-(?:bounce|ping)\b|cubic-bezier\([^)]*-0?\.[2-9]|cubic-bezier\([^)]*,\s*1\.[2-9]/.test(ln) && chk("bounce")) add("bounce", "warn", file, L, "Bounce/elastic motion", "G1 tell.");
    if (/animate-pulse\b/.test(ln) && /rounded-full/.test(ln) && /(?:h|w|size)-(?:1|1\.5|2|2\.5|3)\b/.test(ln) && chk("fake-live")) add("fake-live", "warn", file, L, "Pulsing status dot", "Only if something is actually live.");
    if (/marquee|@keyframes\s+(?:scroll|ticker|slide-?left|infinite-?scroll)/i.test(ln) && chk("marquee")) add("marquee", "warn", file, L, "Marquee/ticker strip", "G2 tell.");
    if ((/\bh-screen\b/.test(ln) || /height\s*:\s*100vh/.test(low)) && /hero|<section|text-center/.test(ln) && chk("h-screen")) add("h-screen", "warn", file, L, "100vh/h-screen hero", "Use svh/dvh, and ask whether it needs to be full-height.");
    { const m = ln.match(/\b(?:bg|text)-black(?![\w/-])/g); if (m && chk("pure-absolute")) C.pure = (C.pure || 0) + m.length; }
    if (/--font-sans\s*:\s*var\(--font-geist-sans\)|GeistSans|geist\/font/.test(ln) && chk("font-overused")) add("font-overused", "warn", file, L, "Geist (Next.js default) as the face", "next-forge/v0 default.");
    if (/lovable-uploads|\.lovable\.app|cdn\.gpteng\.co|bolt\.host|api\.dicebear\.com/.test(ln) && chk("builder-fingerprint")) add("builder-fingerprint", "error", file, L, "AI-builder fingerprint (Lovable/Bolt/DiceBear)", "Remove generated assets/avatars.");
    if (/\b(?:Zap|Rocket|Bot|ShieldCheck)\b/.test(ln) && /lucide/.test(text) && chk("icon-fingerprint")) C.iconFp = (C.iconFp || 0) + 1;
    if (isMarkup) {
      const vis = ln.replace(/className=("[^"]*"|\{[^}]*\})/g, "");
      if (/\b(?:Not|No) [^.<]{1,30}\. (?:A|An|Just|It'?s|Only) [^.<]{1,30}\./.test(vis) && chk("rebuttal")) add("rebuttal", "warn", file, L, "'Not X. Just Y.' rebuttal cadence", "G2 copy tell.");
      if (/>\s*[A-Z][a-z]+\.\s+[A-Z][a-z]+\.\s+[A-Z][a-z]+\.\s*</.test(vis) && chk("triplet")) add("triplet", "warn", file, L, "Staccato triplet ('Fast. Simple. Secure.')", "G2 copy tell.");
    }

    // ---- beauty lint (client-site failures) ----
    if (isMarkup && /<(?:p|section|main|article|body)\b[^>]*class(?:Name)?="[^"]*\btext-center\b/.test(ln) && chk("centred-body")) C.cbody = (C.cbody || []).concat([[file, L]]);
    if (isMarkup && /<h[1-4][^>]*>\s*[A-Z][A-Z0-9&'’ ]{7,}\s*<\/h[1-4]>/.test(ln) && chk("caps-heading")) C.caps = (C.caps || []).concat([[file, L]]);
    if (isStyle && /^\s*(?:h[1-4]|\.(?:section|eyebrow|label|kicker|overline)[\w-]*)[^{]*\{[^}]*text-transform\s*:\s*uppercase/i.test(ln) && chk("caps-heading")) C.caps = (C.caps || []).concat([[file, L]]);
    if (isMarkup && /<textPath\b/.test(ln) && chk("invented-seal")) add("invented-seal", "warn", file, L, "Text on a path (a seal or roundel)", "Invented seals read as generated ornament and compete with the client's mark. Use the client's own logo or crest, or nothing.");
    if (isMarkup && /(?:rounded-full|avatar|initials|monogram)[^>]*>\s*[A-Z]{2,3}\s*</.test(ln) && chk("initials-avatar")) add("initials-avatar", "error", file, L, "Initials placeholder avatar", "Reads as a missing photo. Give everyone the same treatment, or design a no-photo state.");
    if (isMarkup && /\b(?:w-(?:8|10|12|14|16|20|24)|w-\[\d{2,3}px\])\b[^"]*\bh-(?:0\.5|1|1\.5|\[[1-6]px\])\b[^"]*\bmx-auto\b|\bmx-auto\b[^"]*\bw-(?:8|10|12|14|16|20|24)\b[^"]*\bh-(?:0\.5|1|1\.5)\b/.test(ln) && chk("divider-bar")) add("divider-bar", "error", file, L, "Short centred decorative divider bar", "Template habit. Separate sections with space, scale or a real rule system.");
    // ---- G4: the anti-slop kit's own fingerprint (found in blind review of its output) ----
    if (isMarkup) {
      const vis4 = ln.replace(/className=("[^"]*"|\{[^}]*\})/g, "").replace(/<[^>]+>/g, " ");
      if (/[A-Za-z]'[a-z]/.test(vis4) && !/(?:href|src|class|id|style|data-[\w-]+)=/.test(ln.slice(0, ln.indexOf("'"))) && chk("straight-quotes")) C.straight = (C.straight || []).concat([[file, L]]);
      if (/\b(?:Question|Step|Part|Section|Chapter) \d+ of \d+\b/.test(vis4) && chk("n-of-m")) C.nofm = (C.nofm || []).concat([[file, L]]);
      if (/\b(?:sample (?:written|document|clause|page)|for illustration|illustrative (?:page|sample|example)|the buttons work|try them\.)/i.test(vis4) && chk("self-disclosure")) add("self-disclosure", "warn", file, L, "Chatty self-disclosure of samples", "G4 tell: label samples once, discreetly (one small legal-style line), never narrate the demo.");
      if (/\b(?:nobody else\b|what \w+ is not\b|is not a (?:bench|agency|law firm|tool)\b|has no view\b|no junior\b|no account manager\b|not a (?:platform|vendor)\b)/i.test(vis4) && chk("negative-voice")) C.neg = (C.neg || []).concat([[file, L]]);
      if (/\bfor (?:firms|companies|teams|businesses) of \d+\s*(?:to|–|-)\s*\d+/i.test(vis4) && chk("audience-range")) C.aud = (C.aud || []).concat([[file, L]]);
      for (const m of ln.matchAll(/<(?:a|button)\b[^>]*>\s*([^<]{4,40}?)\s*<\/(?:a|button)>/g)) { const t = m[1].trim().toLowerCase(); if (t) C.cta[t] = (C.cta[t] || 0) + 1; }
    }

    // motion
    if (/@keyframes|animation\s*:|animate-|<motion\.|from ['"](?:framer-motion|motion\/react)['"]|gsap/.test(ln)) C.animations.push([file, L]);
    if ((/whileInView/.test(ln) || /initial=\{\{\s*opacity:\s*0,\s*y:/.test(ln) || /fade-?in-?up|fadeInUp|data-aos|animate-fade-up|animate-in fade-in slide-in-from-bottom/.test(ln)) && chk("fade-up")) C.fadeUp.push([file, L]);

    // tailwind default type scale usage
    if (/\btext-(?:5xl|6xl|7xl|8xl|9xl)\b/.test(ln)) C.defaultTextScale++;
  });
}

// ---------- cross-file heuristics ----------
if ((C.cbody || []).length > 1 && !allowRules.has("centred-body")) add("centred-body", "error", C.cbody[0][0], C.cbody[0][1], `text-center on body copy (${C.cbody.length}×)`, "Left-align body copy; centre only short display lines.");
if ((C.caps || []).length > 2 && !allowRules.has("caps-heading")) add("caps-heading", "error", C.caps[0][0], C.caps[0][1], `ALL-CAPS headings/labels (${C.caps.length}×)`, "Use sentence case. Caps labels were the client's top complaint; no exceptions without a brief requirement.");
if ((C.straight || []).length > 2 && !allowRules.has("straight-quotes")) add("straight-quotes", "warn", C.straight[0][0], C.straight[0][1], `Straight apostrophes in visible copy (${C.straight.length}×)`, "Use ’ and “ ” in copy; craft detail reviewers check.");
if ((C.nofm || []).length > 1 && !allowRules.has("n-of-m")) add("n-of-m", "warn", C.nofm[0][0], C.nofm[0][1], `'Question N of M' scaffolding labels (${C.nofm.length}×)`, "G4 tell.");
if ((C.neg || []).length > 1 && !allowRules.has("negative-voice")) add("negative-voice", "warn", C.neg[0][0], C.neg[0][1], `Negative-definition voice ('Nobody else.', 'What X is not') ×${C.neg.length}`, "G4 tell: state what it IS, confidently. One deliberate instance at most.");
if ((C.aud || []).length > 1 && !allowRules.has("audience-range")) add("audience-range", "warn", C.aud[0][0], C.aud[0][1], `'For firms of X to Y' audience line repeated (${C.aud.length}×)`, "G4 tell.");
{ const top = Object.entries(C.cta).sort((a, b) => b[1] - a[1])[0]; if (top && top[1] > 4 && !allowRules.has("cta-repeat")) add("cta-repeat", "warn", "(project)", 0, `Same CTA label "${top[0]}" ×${top[1]}`, "Consistent label, yes; five-plus repeats reads templated. Keep 2–3 deliberate placements."); }
if (!flags.has("--file-mode") && (C.pure || 0) > 6 && !allowRules.has("pure-absolute")) add("pure-absolute", "warn", "(project)", 0, `Pure black used ${C.pure}x as the system`, "White grounds are fine; ink should be a tinted near-black from the palette.");
if ((C.iconFp || 0) > 2 && !allowRules.has("icon-fingerprint")) add("icon-fingerprint", "warn", "(project)", 0, `Stock lucide 'AI' icon set (Zap/Rocket/Bot/ShieldCheck) x${C.iconFp}`, "Icons only where they inform.");
const firstOf = (arr) => arr.slice(0, 5).map(([f, l]) => `${f}:${l}`).join(", ");
const over = (arr, key, sev, rule, msg, hint) => { if (arr.length > T[key]) add(rule, sev, arr[0][0], arr[0][1], `${msg} (${arr.length}×) e.g. ${firstOf(arr)}`, hint); };
over(C.eyebrow, "eyebrow", "warn", "eyebrow", "ALL-CAPS tracked eyebrow/label pattern", "Gen-2 tell. Labels only where they inform; sentence case.");
over(C.arrow, "arrow", "warn", "arrow-suffix", "Arrow glyph/icon appended to links/buttons", "Gen-2 tell. Let the label say where it goes.");
over(C.middot, "middot", "warn", "middot", "'A · B · C' middot meta strings", "Gen-2 tell.");
over(C.grid3, "grid3", "warn", "grid3", "Three-column grids", "Hero + 3 cards is the gen-1 skeleton. Does content really come in threes?");
over(C.fadeUp, "fadeUp", "warn", "fade-up", "Fade-and-slide-up entrances", "One orchestrated moment beats per-section reveals.");
over(C.neutrals, "neutrals", "warn", "default-neutrals", "Default Tailwind neutrals used as the colour system", "Neutrals should be tinted tokens from DESIGN.md.");
over(C.monoLabels, "monoLabels", "warn", "mono-labels", "Tiny monospace data labels", "Gen-2 tell unless the subject is genuinely technical.");
over(C.numbered, "numbered", "warn", "numbered", "01/02/03 numbered markers", "Only for real sequences.");
over(C.emdash, "emdash", "warn", "emdash-copy", "Spaced em dashes in UI copy", "Em-dash confetti is a copy tell.");

const FILE_MODE = flags.has("--file-mode");
if (!FILE_MODE) {
const dominance = (counts) => { const e = Object.entries(counts).filter(([k]) => !/none/.test(k)); const tot = e.reduce((a, [, v]) => a + v, 0); if (tot < 8) return null; const [k, v] = e.sort((a, b) => b[1] - a[1])[0]; return { k, share: v / tot, tot }; };
const r = dominance(C.radius); if (r && r.share > T.uniformRadius && !allowRules.has("uniform-radius")) add("uniform-radius", "warn", "(project)", 0, `${Math.round(r.share * 100)}% of ${r.tot} radius usages are '${r.k}'`, "Vary radius by role, or make 'one radius' a stated DESIGN.md rule.");
const s = dominance(C.shadow); if (s && s.share > T.uniformShadow && !allowRules.has("uniform-shadow")) add("uniform-shadow", "warn", "(project)", 0, `${Math.round(s.share * 100)}% of ${s.tot} shadow usages are '${s.k}'`, "Same soft shadow under every card is the SaaS-kit look.");
if (C.animations.length && !C.reducedMotion && !allowRules.has("reduced-motion")) add("reduced-motion", "error", C.animations[0][0], C.animations[0][1], `Animations present (${C.animations.length}) but no prefers-reduced-motion handling`, "Add a reduced-motion path.");
if (C.defaultTextScale >= 3 && !C.customTypeScale && !allowRules.has("default-type-scale")) add("default-type-scale", "warn", "(project)", 0, "Only Tailwind's default type steps (text-5xl…9xl), no custom scale", "Define a modular scale as tokens (references/typography.md).");
if (C.fontsDeclared.size === 0 && files.length && !allowRules.has("no-font")) add("no-font", "warn", "(project)", 0, "No typeface declared anywhere", "Unstyled = system font = generic.");
}

// ---------- output ----------
const errs = findings.filter((f) => f.sev === "error"), warns = findings.filter((f) => f.sev === "warn");
if (flags.has("--json")) {
  console.log(JSON.stringify({ files: files.length, errors: errs.length, warnings: warns.length, fonts: Object.fromEntries(C.fontsDeclared), findings }, null, 2));
} else {
  const byRule = {};
  for (const f of findings) (byRule[f.rule] ||= []).push(f);
  if (!flags.has("--quiet")) console.log(`slop-lint: scanned ${files.length} files; fonts declared: ${[...C.fontsDeclared.keys()].join(", ") || "none"}\n`);
  for (const [rule, list] of Object.entries(byRule).sort((a, b) => (a[1][0].sev === "error" ? -1 : 1))) {
    const sev = list[0].sev.toUpperCase();
    console.log(`${sev === "ERROR" ? "✖" : "▲"} ${sev} [${rule}] ${list[0].hint}`);
    for (const f of list.slice(0, 8)) console.log(`    ${f.file}${f.line ? ":" + f.line : ""}  ${f.msg}`);
    if (list.length > 8) console.log(`    … +${list.length - 8} more`);
  }
  console.log(`\n${errs.length} error(s), ${warns.length} warning(s).${errs.length ? " Errors block 'done'." : warns.length ? " Fix or justify each warning in DESIGN.md §Exceptions." : " Clean. Now render and review; a clean lint is necessary, not sufficient."}`);
}
process.exit(errs.length && !flags.has("--warn-only") ? 1 : 0);
