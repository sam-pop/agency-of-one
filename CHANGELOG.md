# Changelog

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
