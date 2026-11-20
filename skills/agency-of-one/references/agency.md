# Agency mode: how an exceptional studio builds a business site

The default for this skill. The goal: a client looks at it and assumes a top agency spent three months on it. **Business-forward, polished, credible, and unmistakably this company.** The wow comes from *everything coming together* (strategy, system, type, colour, composition, imagery, motion, copy, and finish), not from a gimmick.

Two failure modes to avoid:
- **AI slop**: the template every model produces (see `tells.md`).
- **Agency cliché**: the look of "trying to win an award": scroll-jacking, custom-cursor blobs, WebGL for nothing, gradient-mesh SaaS clones, abstract 3D shapes, oversized marquee text, stock handshakes. A great business site feels *inevitable*, not clever.

---

## Step 0: Ask for proof first (the biggest lever)
In blind reviews, credibility and imagery stall at about 6/10 without real people, contacts, client names, and photos, whatever the design quality. **When the user is present, ask for these before designing**: a photo of the people, 2–3 factual bio lines, client names or a case study, contact and legal details, and any real numbers. Unattended: proceed, slot them, and put "supply proof to unlock the last 20%" at the top of your report.

## Step 1: Strategy before pixels (write it in DESIGN.md §1)
1. **Positioning in one sentence:** *For [audience] who [need], [company] is the [category] that [difference], because [proof].*
2. **The one thing the visitor must believe** in the first 5 seconds.
3. **Category codes:** list 5 things every competitor's site does (visual and verbal). Mark each **keep** (needed for trust, e.g. clear pricing, real client names) or **break** (where distinction comes from). Break at least two.
4. **Brand idea:** one sentence the whole system expresses, e.g. *"Senior judgment, on call."*, *"Every clause, accounted for."*
5. **Personality:** three traits with a "but not" for each: *confident, not loud · precise, not cold · senior, not stuffy.*
6. **Proof inventory:** what real proof exists (clients, numbers, case studies, credentials, people)? Never invent any. Missing proof becomes a **proof slot** (see §5).

## Step 2: The identity system (the draw supplies the levers)
- **Wordmark:** if there's no logo, set a *typographic wordmark* with care: chosen face, custom spacing, maybe one modified letter. No icon + text by default and no generic monogram. It gets its own small spec in DESIGN.md.
- **Brand hue** (sampled): tune it into a working palette of a deep, a mid, a light tint, tinted neutrals, and ink. Test contrast. The hue should feel *owned*, not "a colour".
- **Type strategy** (drawn): pick faces via `typography.md`. In agency mode, prefer faces with real families (weights, italics, tabular figures, small caps) because business sites need range.
- **Grid & composition** (drawn): declare the grid and the composition system and apply them everywhere.
- **Brand device** (drawn): one recurring element applied with restraint. It's the thread that makes 10 pages feel like one brand.
- **Imagery style:** one sentence (e.g. *"Natural-light documentary photography of real work, tight crops on hands and materials, slightly cool grade"*) plus a crop system.
- **Motion principle:** one sentence (e.g. *"Things settle into place: short, firm, never bouncy"*) and the one choreographed moment.
- **Voice:** three rules plus banned words. Write as the company's **best marketer**, not a cautious assistant: confident claims built from the facts you have, no self-narration, no negative definitions ("Nobody else.", "What we are not"), no hedging. Label samples once, in one small legal-style line. If you can't fill a section with facts, **cut the section**; never describe what it would say (G4 tells in `tells.md`).

## Step 3: Page architecture for a business
Not a template; choose and order only the beats this business needs:
- **Hero:** the value proposition in the brand's voice, one primary action, and *immediate* proof (a real client line, a credential, a key figure, or a proof slot). The hero composition is the drawn composition system executed to perfection. It's the "set piece" in agency mode: no gimmick, just a flawless composition.
- **Proof:** case studies with outcomes (problem → what was done → result, with real numbers), client names, credentials. This is where business sites earn trust, so give it real design attention.
- **Offer:** what you get, how it works, how engagement or pricing works. Clarity is a luxury signal.
- **People:** real names, roles, a real photo slot. Senior people sell services.
- **Ask:** one clear next step, repeated at natural moments, with the same label every time.
- **Footer:** complete and calm: contact, locations, legal, a sign-off with the brand device.

## Step 4: Where the wow actually comes from
1. **Scale contrast**: one very large thing per screen and everything else disciplined.
2. **Perfect alignment**: everything sits on the grid; images, type, and rules share edges.
3. **Confident space**: more whitespace than feels safe, used on purpose.
4. **Type set like print**: hand-broken display lines, tight optical spacing, refined text (see `craft.md` §2).
5. **Colour with intent**: mostly quiet, with one confident moment (a full-bleed brand-hue band, the footer, the CTA).
6. **Imagery that looks commissioned**: consistent crops, grade, and subject, or slots specified like a shot list.
7. **Rhythm**: sections differ in density and ground; the page has a beginning, middle, and end.
8. **Detail density**: designed hover states, focus rings, captions, numerals, a 404, OG image, favicon, and print styles: the hundred small decisions.
9. **Motion that feels engineered**: one load sequence and responsive feedback; nothing floats or bounces.
10. **Consistency**: the same device, spacing, and voice on every section. Consistency is what reads as "expensive".

## Step 5: Proof and image slots (professional placeholders)
When real assets are missing, don't fake them, and **never ship visible "to be supplied" text** (blind reviewers treat a visible placeholder as disqualifying). Slots must look **finished** on the page while staying unmistakable for the team:
- **Photo slot:** prefer, in order: (1) **design the section to stand without the image** (a typographic or data beat in place of the picture); (2) build the panel from the page's **own working material**, such as the product representation, the diagram or illustration stroke system, or the data device, so it carries information; (3) only then a quiet tinted panel. **Never a giant monogram, a cropped wordmark, or colour bands captioned as a person**: blind reviewers read those as missing images. Never caption a non-photo as if it were a photo. Cap slot height (≤ 60svh); a full screen of flat colour on mobile reads as broken. Put the shot spec in `data-slot="Photo · Sam with a client's operations lead, whiteboard behind, 3:2, natural light"` and list it in DESIGN.md §7. Add a review toggle: `html.show-slots [data-slot]::after { content: attr(data-slot) }`, enabled by `?slots` in the URL, so specs are visible only on demand.
- **Client logo slot:** a typeset row of *real* client names if given; otherwise a single slot line, *"Client names: to be confirmed with Keelson"*, set in the caption style. Never fabricate logos.
- **Metric slot:** the metric's label and unit with the value marked as TBC (*"— % reduction in cloud spend · TBC"*), never a made-up number.
- **Product UI:** real screenshots if supplied. Otherwise a faithful, *labelled* representation of the actual workflow (e.g. a real clause and a real redline), never a generic fake dashboard with charts.

## Step 5b: Every page needs a second register
Type-only pages read as one texture top to bottom. Give the page at least one non-typographic register, built honestly in code: a faithful **product representation** (the real workflow, real document, real output, labelled as a sample), a **data visualisation** of real or clearly sample figures, an **illustration system** (one stroke, one corner logic, the palette), or composed **photo slots** (above). Big business sites alternate registers: type, image, product, data, people.

## Step 6: Business credibility checklist
- [ ] A visitor knows what this is, who it's for, and what to do next within 5 seconds.
- [ ] Every claim is specific and supportable; nothing is invented.
- [ ] Pricing or engagement model is clear, or the reason it isn't is stated.
- [ ] Real people and contact details (or clear slots).
- [ ] It looks like it costs more than the competitors' sites, without looking like it's trying.
- [ ] Legal and trust details are present where the category needs them (security, compliance, privacy, regulators).
