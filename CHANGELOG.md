# Changelog

## v1.1.1 (2026-11-20): fixes

### Fixed
- **Lint hook in worktrees:** the edit hook skipped every path containing `.claude/`, so pages built inside a Claude Code worktree (`.claude/worktrees/<name>/`) were never linted. It now skips only the project's own `.claude/` config and lints worktrees from the worktree's root, so that worktree's DESIGN.md and lint config apply.
- **Screenshot security (shipped in v1.1.0, now documented):** `screenshot.mjs --file` no longer launches Chromium with `--allow-file-access-from-files`, which let any script on the page read any file on disk. It serves pages from `127.0.0.1` instead: only files under the current folder, never dotfiles (`.env`, `.git`), and only requests whose Host header is `127.0.0.1:<port>`. **Behaviour change:** `--file` pages must sit inside the folder you run it from; `cd` to the site folder first.
- **Rule count:** the plugin description said 57 rules; the linter has 61.

## v1.1.0 (2026-11-20): beauty first, brand first
v1.0 succeeded at not looking AI-made, but a real client build looked plain and off-brand. v1.1 changes the priority: **beautiful and right for the client first, then distinctive.**

### Tested
A real nonprofit client site (three pages) that v1.0 built "not AI, but not good", rebuilt with v1.1 and judged blind against the original by three independent reviewers (a client stakeholder, an agency creative director, an AI-design skeptic). All three picked the v1.1 rebuild. Means: desirability **4.3 → 7.5**, brand fit **2.8 → 8.8**, "looks AI-made" **60% → 35%**, "a top agency made this" **5% → 45%**.

### New
- **`brand-extract.mjs`:** finds the logo (word-boundary filename matching, skipping sponsor and partner folders) and takes the brand colour verbatim from its dominant chromatic colour, plus a text-safe variant, a second logo colour as accent, and the photo backdrops. Monochrome logos are recognised. People photos never become brand colours. Writes `.design-review/brand.json`.
- **Automatic brand lock:** once `brand.json` exists, `draw.mjs` locks colour to the logo; overriding needs `--no-brand "<reason>"`. plan-diff fails any palette whose colours are more than 25° (OKLCH hue) from the logo colour. New brands draw from a **curated library of 22 palettes**, each contrast-checked for ink, muted text, brand, text on brand and text on accent.
- **Hero comps gate:** before committing, the pick and the runner-up are built as quick hero comps and a fresh reviewer makes a blind forced choice on desirability.
- **Desirability-first review:** the reviewer scores beauty and brand fit first and reviews every page (a site's verdict is its weakest page). It quotes one concrete observation per screenshot, captures its own benchmark sites when none are supplied, and lists missing client assets separately instead of marking imagery down for them.
- **Beauty checks** at render time, at desktop and 390px: content hidden by animations or without JavaScript, initials avatars, photo groups with mixed crops, sizes or backdrops (it names the odd ones out), centred text blocks, uppercase labels, divider bars (including `::before`/`::after`), and pages without a designed header. Exemptions cover menus, hover captions, dialogs, progress bars and device mockups.
- **`photo-normalise.mjs`:** one crop ratio, head position and backdrop for every people photo; cleans up pre-cropped circular avatars from old sites.
- **`references/patterns.md`:** proven recipes for page headers, people grids, scholars, proof bands, events, giving, forms and footers.
- **Lint:** `caps-heading`, `divider-bar`, `initials-avatar` and the new `centred-body` are errors; new `invented-seal` warning. CSS inside `<style>` blocks is linted too. Colours planned in DESIGN.md's tokens are exempt from colour rules. Warnings now reach Claude while it edits (hook `additionalContext`).
- **Multi-page capture:** `screenshot.mjs --file a.html b.html c.html` captures each page; plan-diff reports per page.
- **Update path:** a daily, cached update check tells you (through Claude) when a new release exists, once per version. Plugin: `claude plugin marketplace update agency-of-one && claude plugin update agency-of-one@agency-of-one`. Drop-in: `./update.sh`. In projects with an older DESIGN.md, the session hook tells Claude to run `/agency-of-one:upgrade-design`.

### Changed
- **Precedence when rules conflict:** the brief and brand assets, then beauty, then the drawn cards, then the tells list.
- **Phase 1 order:** ask for real assets and extract the brand before strategy.
- **Verdict rules:** desirability or brand fit ≤ 6, hidden content or a lint error means REWORK. AI-resemblance on a page that already scores ≥ 8 for desirability means FIX FIRST, not a restart.
- In agency mode the direction pick takes the **strongest** directions (s ≥ 8, within 0.5 of the best), excluding only the clearly generic (t ≥ 0.7). After two rounds it takes the strongest non-generic direction.
- The direction critic weighs beauty and brand fit most.
- The design log ignores the same project, skips colour when brand-locked, and is advisory in agency mode (a reused display face still blocks).
- Pure white grounds are no longer flagged; only pure black as the system is.
- New tells section (G5) from the blind panel: invented seals, one hero stamped on every page, content shown twice, photo availability driving hierarchy, dropped content, self-quoting, and a mobile fold without the action.

### Upgrading from v1.0
1. Update the plugin (above) and restart Claude Code. Drop-in installs from v1.0 don't have `update.sh` yet: run `git pull && ./install.sh` once in your clone (with the flags you installed with, e.g. `--global`); after that, `./update.sh` works.
2. In each project with a DESIGN.md, run `/agency-of-one:upgrade-design`. It checks your palette against your brand assets and proposes changes; nothing is applied without your OK.

## v1.0.0 (2026-11-20)
First public release.

**What it is:** a Claude Code plugin (and drop-in `.claude/` kit) that makes Claude design business-forward, agency-grade websites that stop looking AI-generated.

### Highlights
- **Blind-tested.** Independent reviewers who didn’t know which pages used the kit: the share who’d say “AI made this” fell from **65% to 37%** (neutral reviewer), and “a top agency made this” rose from **25% to 55%**. The top kit build was ranked #1 by both panels. Method and caveats are in the README.
- **Agency mode (default):** strategy first; crypto-random design levers (composition, brand device, palette strategy, type strategy, quality reference) and an OKLCH brand hue sampled outside the default zones, giving ~100 million combinations.
- **Independent direction critic:** five directions scored for typicality *and* strength by a separate agent; a script picks among atypical and strong ones.
- **Craft standard:** hero set piece built first, then the page, then a line-by-line finish pass (`craft.md`).
- **57-rule slop linter** covering four generations of AI-design tells, run on every edit via a PostToolUse hook.
- **Measurement:** screenshots at desktop, mobile, scroll positions, extra widths and interactive states; rendered-font and colour report; plan-vs-render diff.
- **Blind two-axis reviewer:** distinctiveness plus 10 craft axes against named category benchmarks; SHIP only at ≥ 8 everywhere; max 3 rounds, keep the best.
- **Cross-project design log** that blocks repeating your own last look.
- **Expressive mode** (`--mode expressive`) for campaign, editorial and experimental work.
- About **366 tokens always-on**; core rules injected only in frontend repos.

### Known limits
- Code can’t produce photography or client proof; without them, credibility and imagery stall around 6/10. The kit asks for them up front and slots them professionally when missing.
- A full run is token-heavy; expect usage limits on the Pro plan.
- Reviewer scores come from model reviewers on a small sample: directional, not a benchmark.
