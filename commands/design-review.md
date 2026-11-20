---
description: Lint, screenshot, and independently review the current UI for AI-generated or familiar-looking design
argument-hint: "[dev-server-url] [routes...]  e.g. http://localhost:3000 / /pricing"
---

Run the agency-of-one verification loop on this project.

Arguments: $ARGUMENTS (first is the dev server URL, default http://localhost:3000; the rest are routes, default /)

1. Find the `agency-of-one` skill folder: `${CLAUDE_PLUGIN_ROOT}/skills/agency-of-one` when installed as a plugin, otherwise `.claude/skills/agency-of-one` or `~/.claude/skills/agency-of-one` (use whichever exists; call it `$SKILL`).
2. Run `node $SKILL/scripts/slop-lint.mjs` and keep the output.
3. Make sure the dev server is reachable at the URL. If it isn't running, start it in the background with the project's dev script and wait until it responds.
4. Run `node $SKILL/scripts/screenshot.mjs --url <url> --routes <routes>`. If Playwright is missing, install it as a dev dependency (`npm i -D playwright && npx playwright install chromium`) and retry.
5. Run `node $SKILL/scripts/plan-diff.mjs` (if DESIGN.md exists) and keep the output.
6. Launch the **design-reviewer** subagent (named `agency-of-one:design-reviewer` when installed as a plugin). Give it ONLY: the URL, the routes, and the location of `.design-review/`. Do not tell it what you intended, what the direction is, or what you think of the result.
7. Report to me: the reviewer's verdict block verbatim, the lint and plan-diff summary lines, and the paths of the fold screenshots.
8. If the verdict is FIX FIRST or REWORK, propose the fixes (don't apply them unless I say go), grouped as: violates DESIGN.md / tells / craft.
