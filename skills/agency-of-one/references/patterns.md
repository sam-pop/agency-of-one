# Patterns: proven recipes for the pages every business site has

These pages are where AI-built sites fall apart. They get skipped in direction work, and then the builder improvises them: centred text, caps labels, divider bars, mixed photo crops, initials circles. A good agency doesn't reinvent these pages. It runs a proven recipe and executes it flawlessly in the brand's tokens. Use these recipes as written. The brand device, the type and the art direction make them distinctive, not new layouts.

All recipes assume: body copy left-aligned, sentence case, tokens only, one crop ratio per image group, and a 390px version designed rather than just stacked.

## Page header (every page that isn't home)
```
┌──────────────────────────────────────────────────────────┐
│ Leadership                       [optional photo, 5:4,   │
│ The trustees and officers who    bleeding off the right  │
│ steward the foundation.          or bottom edge]         │
│ ─ breadcrumb or section nav (quiet, small)               │
└──────────────────────────────────────────────────────────┘
```
- h1 at display size (≥ 48px desktop, ≥ 34px mobile), left-set on the grid's first column, with a one or two-line standfirst under it at about 20–24px.
- Ground: either the brand colour (h1 in white, standfirst ~80% white) or the page ground with a single real photograph. Never just a grey band with a small centred title.
- 30–45vh tall on desktop; the first content starts inside the first viewport.
- Section navigation for long pages: a quiet row of links under the standfirst, not a sticky pill bar.

## People grid (board, team, trustees)
```
[photo][photo][photo][photo]      4 cols ≥1200 · 3 ≥900 · 2 ≥560 · 2 at 390
Name Surname                      name: 18–20px, ink, weight 600
Role, one line                    role: 15–16px, muted
```
- **Normalise the photos first:** `node $S/scripts/photo-normalise.mjs <dir> --ratio 4:5 --backdrop <brand-or-backdrop hex>`. Pre-cropped circles from an old site become clean circles on one backdrop; show those in a circular frame.
- One frame for everyone (all 4:5 rectangles, or all circles), the same size, the same backdrop. Never mix cut-outs on white with studio shots on blue.
- Left-aligned name and role under the photo. No caps, no divider bars, no social icon rows unless they're real and wanted.
- **Peers get one treatment.** Don't let photo availability decide who looks important: normalise every real photo first, and give the people without one the same frame with the no-photo tile.
- Leaders (chair, president) can lead at 2× size in the first row, with the same treatment.
- **Missing photo:** the same frame holding a quiet tile from the brand pattern or the crest, at low contrast. If more than a third are missing, use a text-only roster (two columns of name and role) instead of a grid. **Never use initials circles.**
- Bios: open in a dialog or an expanding row on click. Don't print every bio in full on the grid.

## Scholars / recipients / alumni
- The same people-grid recipe, plus one line of specifics (school, year, field) in tabular figures.
- A short featured story (one recipient, one real quote, one photo at a larger size) beats 40 identical cards. Put the full list in a filterable table or by year.

## Proof band
```
"A real quote from a real person, set large."     — Name, Role, Organisation
[3–6 real logos, one height, monochrome in ink at 60%]
```
- Only real proof. Missing proof becomes a slot (agency.md Step 5), never invented numbers.
- Figures: one or two big, sourced numbers with a sentence each. Never a row of four stat tiles with `+` suffixes.

## Events
- Upcoming events as a list, not cards: date block (day large, month small, tabular), title, place, one action. Past events move to an archive.
- One event photograph per event if real ones exist; otherwise no images at all.
- A "no upcoming events" state that says what to do (subscribe, contact), never an empty grid.

## Giving / donate
- Lead with what a gift does, in one concrete sentence with a real figure if the client has one.
- 3–4 preset amounts plus "other", with one primary action. Recurring gifts as a clear toggle.
- Trust details close by: registered status, tax ID or receipt note, where the money goes. Small, plain and visible, not hidden in a footer.

## Forms (contact, application, sign-up)
- Labels above fields, left-aligned, sentence case. Placeholders are examples, not labels.
- Fields share one width per column. The primary action is the full field width on mobile.
- Inline validation that says how to fix the problem. The success state uses the action's verb ("Application sent").
- Long forms are split into named steps, with progress shown as text ("Step 2: Your school"). No "Question N of M" scaffolding.

## Footer
- Three or four short columns: the crest or wordmark with one sentence, navigation, contact (real address, email), and legal lines (registered status, copyright).
- The brand ground or the page ground, never a grey dump.
