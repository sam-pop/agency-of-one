---
name: agency-of-one
description: Use before building, restyling, or extending ANY website, landing page, app screen, or UI component where visual design is decided. Produces beautiful, on-brand, agency-grade design that doesn't look AI-generated or templated. Starts from the client's own brand (logo colours, photos, references), then runs strategy and a randomized direction process (draw, five directions, an independent critic, a scripted pick, hero comps, DESIGN.md), a craft finish pass, a lint hook, rendered beauty checks, a plan-vs-render diff, and a blind review that scores desirability and brand fit first.
---

# Agency of One

## Why this exists
Asked for a website, a model produces the most likely website. Banning that look just moves it to the next most likely one (cream + serif + clay, black + acid green, ALL-CAPS eyebrows, `→` on links: the second-wave tells). And "creative" isn't the fix either: a business site has to look like **an exceptional agency made it**, credible and polished, where everything comes together.

**Priority order: 1) beautiful and right for the client, 2) clear and credible, 3) distinctive (not AI-looking).** Avoiding AI tells is necessary but not sufficient: a page that is distinctive but plain or off-brand has failed.

So this skill **starts from the brand the client already has, takes the riskiest choices away from the builder, and holds the output to a world-class finish and beauty standard**:
1. **The client's brand and assets first**, then strategy: logo colours, real photos, references, positioning, proof, brand idea.
2. **Real randomness, brand-locked colour**: a script draws the levers (composition, brand device, palette strategy, type strategy). Colour comes from the client's logo when there is one, otherwise from a curated, contrast-checked palette library, never from the model's taste.
3. **An independent critic** scores five directions for typicality *and* strength; a script picks among the atypical-and-strong ones.
4. **A craft standard** (`craft.md`) and a **hero set piece** built in isolation first.
5. **Checks you can't argue with**: lint on every edit, rendered measurement, plan-vs-render diff, cross-project memory, rendered beauty checks, and a blind reviewer scoring desirability and brand fit first, then craft and distinctiveness.

**When rules conflict, this order wins:** the client's brief and brand assets > beauty (craft.md Priority, §2b) > the drawn palette and cards > the tells list. A card or a tell-avoidance rule never justifies something uglier or off-brand.

`$S` = this skill's folder: the base directory Claude Code shows when the skill loads (`${CLAUDE_PLUGIN_ROOT}/skills/agency-of-one` as a plugin; `.claude/skills/agency-of-one` or `~/.claude/skills/agency-of-one` as a drop-in). Run scripts from the repo root: `node $S/scripts/<name>.mjs`. The session hook prints the absolute scripts path; **pass that absolute path to every subagent** (they can't resolve `$S` themselves). **Never open `references/decks.json`.** Cards come only from the script.

## Mode
- **Agency (default):** business-forward, professional, polished. Read `references/agency.md`.
- **Expressive** (`--mode expressive`): only when the brief asks for something experimental, artistic, editorial, campaign, or event-like. It uses non-web reference media and constraints; read `references/process-notes.md`.

## Gate
- **`DESIGN.md` exists** → follow it exactly; go to Phase 3. Propose amendments; never drift silently. **If it has no `<!-- agency-of-one design v1.1 -->` marker it predates brand-first colour:** run `brand-extract.mjs`; if the palette clashes with the brand assets (plan-diff reports the clash), propose a §4 colour amendment to the user before building on it.
- **The brief pins a direction or brand guide** → the brief wins, even if it names a known tell. Record it (and its exceptions in §9); go to Phase 3.
- **Otherwise** → Phases 1–2, even for "small" pages.

**Setup once per repo:** `npm i -D playwright && npx playwright install chromium` (as a devDependency, so later `npm i` doesn't prune it).

## Phase 1: Assets, brand, strategy (DESIGN.md §1)
1. **Real assets: ask first** (agency.md Step 0). Logo, photos of the people, bio facts, client names or a case study, contact and legal details, real numbers, product screenshots. In blind reviews, credibility and imagery stall at about 6/10 without them, however good the design. Missing ones become professional **slots** (agency.md Step 5), and your report leads with what to supply.
2. **The brand you already have** (agency.md Step 0a). If there's a logo, crest, existing site or people photos, run `node $S/scripts/brand-extract.mjs` (auto-discovers, or pass paths). It writes `.design-review/brand.json`; from then on `draw.mjs` is **brand-locked** automatically and plan-diff fails any palette that loses the logo colour. Attended: confirm the extracted brand colour with the user in one line. Never fight the brand's own colours.
3. **References (attended):** ask for 2–3 sites the client finds beautiful (any industry). Save screenshots in `design-references/`. The reviewer compares against them. They set the quality bar, not the look.
4. **Human taste (attended only):** ask once, *"2–3 brands or objects you admire, and one competitor site you don't want to resemble."*
5. **Strategy** (agency mode, agency.md Step 1): positioning sentence, the one belief, 5 category codes marked keep/break (break ≥ 2), brand idea, personality with "but not", proof inventory (never invent proof).
6. **Subject inventory:** 8+ real artifacts, places, materials, and vernacular from the client's world (12+ in expressive mode). In agency mode these feed imagery direction, the brand device, and copy, not costume.
7. **Draft the hero sentence and primary action label** in the brand's voice. You may refine them after the draw.

## Phase 2: Draw → baseline → diverge → critic → pick → commit
**2a. Draw.** `node $S/scripts/draw.mjs --project "<name>"` (agency mode by default) deals a quality reference, composition system, brand device, palette strategy and type strategy. Colour is **brand-locked** automatically when `.design-review/brand.json` exists (override only with `--no-brand "<reason>"`, e.g. a rebrand the client asked for); otherwise it comes from a **curated, contrast-checked palette library**: beautiful starting points, never raw random hues. Paste it into DESIGN.md §2. One veto with a written reason: `--redraw <slot>`. If a card mandates something on the tells list (e.g. a visible grid), it's allowed as a **card-mandated exception**: log it in §9 as `card: <reason>` and execute it as structure, not decoration.

**2b. Baselines.** Write two twins: the **AI twin** (what a model would make for this brief: fonts, hexes, hero, sections) and, in agency mode, the **agency-cliché twin** (the award-bait version). Check both against `references/tells.md`.

**2c. Diverge.** Write **5 directions (A–E)** to `.design-review/directions.md`, along with a short brief summary and the §1 inventory. Each direction gets a brand idea expression, how each drawn lever is applied, the hero composition (a small ASCII wireframe), face *classes* (not specific faces yet), a palette sketch, and the brand device. **Don't score them yourself.** At least 3 must differ in page architecture, not just skin.

**2d. Independent critic.** Run the `direction-critic` subagent (`agency-of-one:direction-critic` as a plugin) and give it only the path. It returns typicality *t* and strength *s* for each direction, plus a `PICK_ARG`.

**2e. Pick.** `node $S/scripts/draw.mjs --pick "<PICK_ARG>"`. In agency mode it takes the **strongest** directions (s ≥ 8, within 0.5 of the best), excluding only the clearly generic (t ≥ 0.7). In expressive mode it favours the atypical. Exit code 3 means none qualify: write 3 new directions (graft in the critic's STRONGEST_IDEA_TO_STEAL) and rerun the critic. **Build what the script picks.** Attended: show the pick plus the runner-up in one line each and let the user override.

**2e′. Hero comps (the beauty gate).** Before committing, build the hero (fold + first scroll, desktop and mobile) for the pick **and** the runner-up as two quick static comps with real assets. Screenshot both (`screenshot.mjs --file comp-a.html comp-b.html`), then give a fresh `design-reviewer` only the two fold and mobile-fold images, unlabelled, and ask one forced choice: *which would the client be prouder to send, and why?* Build the winner. If the reviewer calls both plain or off-brand, redraw rather than polish.

**2f. Diff.** Fill the DESIGN.md §3 table against both twins. Any matching axis must change unless the brief requires it. Swap test: would a competitor's name fit? If yes, pull more from §1.

**2g. Commit tokens.** Complete `templates/DESIGN.md` → `DESIGN.md`, including the **machine-readable `tokens` block** that plan-diff reads.
- **Type:** `references/typography.md`. Render your shortlist with `node $S/scripts/type-specimen.mjs` and choose by looking. Use one ratio scale; mark fluid display sizes as `fluid`.
- **Colour:** start from brand.json's proposal (or the curated palette): brand verbatim, brandForText for text on light grounds, deep / light tints, tinted neutrals and ink (craft.md §4). Test AA. Keep the logo colour recognisable.
- **Repeat check:** `node $S/scripts/designlog.mjs check --project "<name>" [--brand-locked] --display … --body … --ground … --accent … --layout … --medium "<composition or primary medium>"`. If it reports REPEAT, change the repeated axes.

## Phase 3: Build to the craft standard
**3a. Hero set piece first, in isolation.** Build just the hero (agency mode: the drawn composition executed flawlessly; expressive mode: the signature mechanic). Screenshot it (`screenshot.mjs`, with `--state` for interactive states) and iterate until it would score ≥ 8 on every relevant craft axis in `references/craft.md`. Only then build the rest.

**3b. Build the page** from tokens only (CSS variables / Tailwind v4 `@theme`), following agency.md Step 3 architecture or the expressive skeleton. shadcn/Radix supply behaviour only; restyle every primitive. Copy is specific, sentence case, and in the brand voice; proof is real or slotted. The lint hook flags tells on every edit, so fix them as they come.

**3c. Finish pass.** Go through `references/craft.md` §1–10 line by line: typographic details, grid audit, rhythm, colour and contrast, imagery and slots, motion and states, responsive composition at 1440/1024/768/390, copy edit (−30%), technical finish. This pass is where "agency-made" comes from. Don't skip it.

## Phase 4: Verify (max 3 rounds, keep the best)
1. **Snapshot first:** commit (or copy) the current state before each round so a worse revision can be rolled back.
2. `node $S/scripts/slop-lint.mjs`: zero errors; every warning fixed or justified in §9 + `slop-lint.config.json`.
3. `node $S/scripts/screenshot.mjs --url <dev url> --routes / /about …` (or `--file index.html about.html …` for static; **every page, not just home**) `--state <name>=click:<sel>|hash:<#id>|scroll:<sel>|hover:<sel>` for every signature state. **Look at** the fold, mobile fold, scroll50, and state shots.
4. `node $S/scripts/plan-diff.mjs`: the logo colour is in the palette, planned faces loaded, palette rendered, scale applied, no off-plan grounds, **and the beauty checks** at desktop and 390px: no content left invisible by animations or hidden without JS, no initials avatars, consistent photo groups (crop, size, backdrop), no centred multi-line text, no caps labels, no divider bars, a designed page header on every page.
5. **Blind review:** the `design-reviewer` subagent (`agency-of-one:design-reviewer`) gets only the URL or file, routes, and `.design-review/`. It scores **desirability and brand fit first**, then craft and distinctiveness, against `design-references/` if present. SHIP requires desirability, brand fit and every craft axis ≥ 8. **A multi-page site's verdict is its weakest page.**
6. Fix and re-render. **Keep a revision only if the reviewer scores it higher than the previous best.** Stop after 3 rounds and report what's still open.
7. **Mirror:** remove one decoration that doesn't serve the brand idea; note it in DESIGN.md §11.
8. **Log:** `node $S/scripts/designlog.mjs add --project "…" …same flags as check… --media "<draw summary>" --signature "<device / set piece>"` (`--log <path>` to keep the log in the repo).
9. **Report:** direction (one line), brand idea, set piece, lint/plan-diff/review results with craft scores, open exceptions, every slot and assumption the client must fill or confirm.

## Reference files
| File | When |
|---|---|
| `references/agency.md` | Agency mode: strategy, identity system, business architecture, slots, credibility |
| `references/craft.md` | 3a, 3c, Phase 4: the finish standard, alignment, photo system, page headers, scoring |
| `references/patterns.md` | 3b: proven recipes for people grids, page headers, proof bands, events, giving, forms |
| `references/palettes.json` | Curated palette library (read by draw.mjs; you may browse it) |
| `references/tells.md` | 2b, 2f, Phase 4: AI tells (gen 1–3) with signatures and sources |
| `references/typography.md` | 2g: font procedure, sources, licences, scale |
| `references/process-notes.md` | Expressive mode: interpreting cards; worked examples |
| `templates/DESIGN.md` | 2g |
