#!/usr/bin/env node
// update-check.mjs: tells Claude (and so the user) when a newer Agency of One release exists.
// Checks GitHub at most once a day (cached), with a 1.5s timeout so sessions never wait.
// Prints one line only when an update is available; silent otherwise or when offline.
// Opt out: AGENCY_OF_ONE_NO_UPDATE_CHECK=1
//
//   node update-check.mjs            (used by the SessionStart hook)
//   node update-check.mjs --force    (ignore the cache; prints status even when current)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

if (process.env.AGENCY_OF_ONE_NO_UPDATE_CHECK) process.exit(0);
const force = process.argv.includes("--force");
const here = dirname(fileURLToPath(import.meta.url));
const REPO = process.env.AGENCY_OF_ONE_REPO || "sam-pop/agency-of-one";
const local = (() => { try { return readFileSync(join(here, "..", "VERSION"), "utf8").trim(); } catch { return null; } })();
if (!local) process.exit(0);

const isPlugin = !!process.env.CLAUDE_PLUGIN_ROOT || /[\\/]plugins[\\/]/.test(here);
const cacheDir = process.env.CLAUDE_PLUGIN_DATA || join(os.homedir(), ".claude", "agency-of-one");
const cacheFile = join(cacheDir, "update-check.json");
const newer = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) > (y[i] || 0)) return true; if ((x[i] || 0) < (y[i] || 0)) return false; } return false; };

let latest = process.env.AGENCY_OF_ONE_TEST_LATEST || null; // test override
let prevNotified = null, cacheAt = 0;
try { const c = JSON.parse(readFileSync(cacheFile, "utf8")); prevNotified = c.notified || null; cacheAt = c.at; if (!latest && !force && Date.now() - c.at < 864e5) latest = c.latest; } catch {}
if (!latest) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 1500);
    const r = await fetch(`https://raw.githubusercontent.com/${REPO}/main/skills/agency-of-one/VERSION`, { signal: ctl.signal });
    clearTimeout(t);
    if (r.ok) { const v = (await r.text()).trim(); latest = /^\d+\.\d+\.\d+$/.test(v) ? v : null; if (latest) mkdirSync(cacheDir, { recursive: true }); writeFileSync(cacheFile, JSON.stringify({ at: Date.now(), latest, notified: prevNotified })); }
  } catch {}
}
if (latest && newer(latest, local)) {
  const how = isPlugin
    ? "`claude plugin marketplace update agency-of-one && claude plugin update agency-of-one@agency-of-one`, then restart Claude Code"
    : "`./update.sh` in your agency-of-one clone (or `./update.sh --global`)";
  // mention each new version at most once a day per machine, so it isn't repeated every session
  if (!force && !process.env.AGENCY_OF_ONE_TEST_LATEST && prevNotified === latest && Date.now() - cacheAt < 864e5) process.exit(0);
  if (!process.env.AGENCY_OF_ONE_TEST_LATEST) try { mkdirSync(cacheDir, { recursive: true }); writeFileSync(cacheFile, JSON.stringify({ at: cacheAt || Date.now(), latest, notified: latest })); } catch {}
  console.log(`Agency of One v${latest} is available (installed v${local}). Mention this to the user once, at a natural moment: update with ${how}. Release notes: https://github.com/${REPO}/blob/main/CHANGELOG.md`);
} else if (force) console.log(latest ? `Agency of One v${local} is up to date (latest v${latest}).` : `Agency of One v${local}; couldn't reach GitHub to check.`);
