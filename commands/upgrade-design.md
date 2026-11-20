---
description: Upgrade this project's DESIGN.md to the current Agency of One standard (brand-first colour, beauty checks)
---

Run the Agency of One DESIGN.md upgrade check for this project.

1. Find the skill folder `$S` (`${CLAUDE_PLUGIN_ROOT}/skills/agency-of-one`, `.claude/skills/agency-of-one` or `~/.claude/skills/agency-of-one`) and read `$S/SKILL.md`, `$S/references/agency.md` (Step 0a) and `$S/references/craft.md` (Priority, §2b, §5, §7b).
2. If there's no `DESIGN.md` at the repo root, say so and stop.
3. Run `node $S/scripts/brand-extract.mjs` (confirm the extracted brand colour with the user), then run plan-diff, which fails when DESIGN.md's palette doesn't contain the logo colour. Report any clash plainly.
4. Render the current site (`node $S/scripts/screenshot.mjs --url <dev url> --routes / …` or `--file index.html about.html …`, every page) and run `node $S/scripts/plan-diff.mjs`. List every beauty-check failure: invisible content, initials avatars, inconsistent photos, centred paragraphs, caps headings, divider bars, photo/palette clash.
5. Propose a DESIGN.md amendment as a diff: brand-locked colour tokens, a people-photo system, a page-header system, and alignment rules. Add the `<!-- agency-of-one design v1.1 -->` marker. **Don't apply it until the user approves**, because DESIGN.md is their source of truth.
6. After approval, update DESIGN.md, then offer to apply the changes to the site and run `/agency-of-one:design-review` (`/design-review` for drop-in installs).
