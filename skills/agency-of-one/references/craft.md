# Craft: the F50 finishing standard

Distinctive is the floor. The bar is **"could this sit next to the best site in its category, and the best brand sites anywhere, without embarrassment?"** What separates world-class from merely unusual is almost never the concept. It's **finish**: a thousand small decisions made on purpose. This file is the checklist for those decisions. The reviewer scores against it.

## 0. The three things that make people stop scrolling
1. **One engineered set piece.** A single moment built to a level most sites never attempt: an interactive object, a scroll-choreographed sequence, a live specimen of the product, a typographic construction. It's built and polished *in isolation first* (Phase 3a), and it's the hero or immediately after it.
2. **Typography set by hand.** Display type treated as an image: optically tightened, kerned, sized to the measure, with line breaks chosen and not left to chance.
3. **Rhythm.** The page breathes in a deliberate pattern: dense, then open, then dense. Every section has a different job and looks it, and nothing is uniform by default.

Everything below serves those three.

## 1. Narrative
- Plan the page as **5–7 beats**, not sections: *hook (the one true thing) → proof it's real → how it works → what it costs / what you get → who's behind it → the ask*. Each beat gets one idea and one visual device.
- Cut any beat that doesn't move the visitor toward the ask. F50 pages are often *shorter* than templates.
- The first screen must work as a poster on its own: if someone screenshots only the fold (1440×900 **and** 390×844), it should still carry the brand **and show the set piece's payoff state** (the flagged clause, the decided number, the product doing its job), not its preamble.

## 2. Typography (finishing)
- **Display:** set `text-wrap: balance`; break lines by hand (`<br>` or `&nbsp;`) so no line ends on an article or preposition; tighten tracking in proportion to size (about −0.01em at 48px, −0.02 to −0.03em at 96px+; never on small text); line-height 0.9–1.05 for display, opening up as size drops; use the font's optical size axis (`font-optical-sizing: auto` / `opsz`) when it has one.
- **Body:** `text-wrap: pretty`; measure 55–70ch; line-height 1.45–1.6 (serif higher); paragraph spacing equal to one line, not an arbitrary gap; 17–20px base on desktop.
- **Details that signal craft:** real quotes and apostrophes (’ “ ”), en dash for ranges (10–12), × for dimensions, non-breaking spaces in "$15 / month" and "10 am"; `font-variant-numeric: tabular-nums` in tables and `oldstyle-nums` in running text if the face has them; `hanging-punctuation: first` where supported; small caps via the font's `smcp` feature, never fake; `font-kerning: normal`; ligatures on for text and checked off for code.
- **Hierarchy with few sizes:** 5–7 steps on one ratio, and contrast through weight, width, colour, and space before size.
- **No orphans** in headings or short paragraphs (`text-wrap` plus manual `&nbsp;`).
- **Font loading:** subset to the needed glyphs and weights; `font-display: swap` with metric-matched fallbacks (`size-adjust`, `ascent-override`) so nothing jumps; preload only the hero face.

## 3. Space and grid
- Derive spacing from the type: a base unit equal to the body line-height (e.g. 28px), with spacing steps as multiples or halves of it.
- One declared grid (e.g. 12 columns, 24px gutters, max 1320px). **Every edge aligns to it**, and deliberate breaks of the grid are rare, large, and obvious.
- **Vary section rhythm on purpose:** for example, a tight 2-unit section, then a 6-unit section, then full-bleed. Equal padding on every section is a template tell.
- Optical alignment: hang large punctuation and numerals outside the text edge, and nudge icons and round shapes so they *look* aligned.
- Use whitespace as a material. Things you want noticed get more space, not more decoration.

## 4. Colour
- The palette card names *materials*; your job is to make them **beautiful**. Tune the values in OKLCH for harmony: related chroma, deliberate lightness steps, one accent at about 5–10% of visual weight.
- Grounds that come from a card (pea green, formica, manila) must be tuned until they feel **expensive, not drab**: usually lower chroma and a precise lightness, with ink that is not pure black but harmonised with the ground.
- **Grounds:** pure white is allowed and often right for business sites; a tinted off-white everywhere has become its own fingerprint (G4). Choose the ground per the palette strategy, not by habit. Cards are allowed too, when the content is genuinely a set of objects; hairline rules everywhere is a fingerprint as well.
- Test every text and ground pair for WCAG AA (APCA Lc 60+ for body is better), including hover and disabled states.
- `::selection` gets the brand colours. Focus rings are designed in the brand language (offset outline, the accent colour), never the browser default and never removed.
- Dark mode only if designed as its own composition; otherwise ship one excellent theme.

## 5. Imagery and illustration
- **No stock, no generated photorealism.** Real photography from the client, or a clearly marked **art-direction slot**: a placeholder that states the shot (subject, framing, light, crop ratio, grade), e.g. *"Photo: Sam at a client's server cupboard, 3:2, available light, slightly underexposed, desaturated greens."* An art-direction slot reads as a professional comp. A grey box doesn't.
- Illustration and diagrams drawn in code (SVG) use **one stroke weight, one corner logic, and the palette only**, and they must explain something real (the product, the process, the subject's object).
- Every image has a reason, a consistent crop system, and real `alt` text.

## 6. Motion
- **One choreographed moment** (usually the set piece or the page load): staggered with deliberate timing (60–120ms offsets), under about 900ms in total, with easing that has character (e.g. `cubic-bezier(.2,.7,0,1)` for arrivals; no bounce).
- Prefer CSS scroll-driven animations (`animation-timeline: view()`) or View Transitions for state changes; JS only where needed.
- Motion responds to the user: hover, press, open/close, flip. Each state change shows what changed.
- Content is visible without JS and without motion. `prefers-reduced-motion` gets an instant, still-beautiful version.
- Never animate layout properties; use transform and opacity only, at 60fps.

## 7. Interaction and states
- Every interactive element has designed **hover, active, focus-visible, disabled, and loading** states.
- Forms: labels always visible, real validation messages in the brand voice, a success state that feels like an event, and an error state that says how to fix it.
- Links in text are distinguishable without colour alone.
- The cursor and pointer affordances are correct; touch targets are at least 44px.

## 8. Responsive as art direction
- Design the **390px composition** as its own layout: re-order, re-scale, and re-crop. Don't just stack the desktop.
- Check 1440, 1024, 768, and 390. Use container queries for components that live in different widths.
- Display type uses `clamp()` so the composition holds at every width; check line breaks at each breakpoint.

## 9. Copy (an editor's pass)
- Every sentence earns its place: cut about 30% in a final pass.
- Specific nouns, numbers with units, verbs that say what happens. Sentence case. No exclamation marks.
- Headline test: could a competitor run it unchanged? If yes, rewrite it.
- Microcopy (buttons, labels, errors, empty states) gets the same care as the hero.

## 10. Technical finish
- **No dead ends:** every link goes somewhere real or is removed; no claim ("set out in full", "see pricing") points at something the page doesn't deliver. Footer says who the company is (legal entity, contact, address/regulator where the category needs it), as composed slots if unknown.
- Avoid stacks of `position: fixed` layers clipped per section (they break anchor jumps and captures); use one element and update it.
- Lighthouse performance ≥ 95, CLS 0, LCP under 2s on a mid-range phone, no console errors.
- Semantic HTML landmarks, a single h1, a logical heading order, a skip link.
- Favicon (SVG, in the brand language), Open Graph image designed as a mini-poster, `theme-color`, and a meaningful `<title>` and description.
- Print stylesheet if the subject is document-like (it often is).

## Craft scoring (used by the reviewer, 0–10 each)
| Axis | 10 looks like |
|---|---|
| Concept & set piece | One unforgettable, subject-native moment, executed fully |
| Typography | Hand-set display, impeccable text, real typographic details |
| Layout & rhythm | A visible grid, deliberate variation, optical alignment |
| Colour | Harmonious, expensive-feeling, accessible, disciplined accent |
| Imagery & illustration | Purposeful, consistent, art-directed (or professional slots) |
| Motion & interaction | One choreographed moment; every state designed |
| Responsive | Mobile composed, not stacked |
| Copy | Specific, short, could only be this company |
| Technical finish | Fast, accessible, no rough edges at any width |

**F50 bar: every axis ≥ 8.** A single 6 means it isn't done.
