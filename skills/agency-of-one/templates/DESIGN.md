<!-- agency-of-one design v1.1 -->
# DESIGN.md: <Project>

> Visual source of truth for this repo. Claude reads this before any UI work and follows it.
> Change it on purpose, never silently mid-task. Mode: <agency | expressive>. Created <date> via the agency-of-one skill.

## 1. Strategy and subject
- **Positioning:** For <audience> who <need>, <company> is the <category> that <difference>, because <proof>.
- **The one belief (first 5 seconds):** <…>
- **Category codes** (what every competitor does): 1. <…> keep/break · 2. … · 3. … · 4. … · 5. …
- **Brand idea:** <one sentence>
- **Personality:** <trait>, not <x> · <trait>, not <y> · <trait>, not <z>
- **Proof inventory:** real: <…> · missing → slots: <…>
- **Subject inventory** (artifacts, places, materials, vernacular): <…>
- **Real assets supplied:** <logo / photos / screenshots / client names / numbers, or none>
- **Brand colours (brand-extract.mjs):** <hues + proposed palette, or "new brand: curated palette">
- **Client references (design-references/):** <sites, or none>
- **People-photo system:** <crop ratio, size, backdrop, frame; what happens when a photo is missing>
- **Human taste input:** <…, or "skipped: unattended">
- **Hero sentence:** <…> · **Primary action label:** <…>

## 2. Draw
<paste draw.mjs output>
- **Veto (max 1) + reason:** <none | slot: card, reason>

## 3. Baselines, directions, pick, diff
- **AI twin:** fonts <…> · ground <hex> · accent <hex> · hero <shape> · sections <list> · radius/shadow <…> · motion <…> · headline <…>
- **Agency-cliché twin** (agency mode): <…>
- **Directions:** in `.design-review/directions.md` (A–E)
- **Critic output:** <paste the scores line by line + STRONGEST_IDEA_TO_STEAL>
- **Pick:** <paste> → **Building <X>.** Runner-up: <Y>.

| Axis | AI twin / cliché | This design |
|---|---|---|
| Ground colour | | |
| Display face | | |
| Text face | | |
| Accent / brand hue | | |
| Page architecture | | |
| Hero composition | | |
| Radius / shadow / rules | | |
| Motion | | |
| Copy voice | | |

**Swap test:** <would a competitor's name fit? no, because …>

## 4. Identity system
- **Wordmark:** <face, weight, spacing, any modified letter>
- **Brand device:** <what it is, and where it appears>
- **Imagery style:** <one sentence + crop system>
- **Motion principle:** <one sentence> · **Choreographed moment:** <…> · **Reduced motion:** <…>
- **Voice:** <3 rules> · **Banned words:** <…>

### Type
| Role | Face (source, licence) | Weights / features | Why |
|---|---|---|---|
| Display | | | |
| Text | | | |
| Utility (optional) | | | |
- **Scale:** base <px>, ratio <n> → <steps>; fluid: <which roles use clamp()>
- **Setting rules:** measure, leading, tracking per size, numerals, small caps

### Colour
| Token | Value | Role | Contrast vs ground |
|---|---|---|---|
| `--ground` | | | |
| `--ink` | | | |
| `--brand-deep` | | | |
| `--brand` | | | |
| `--brand-light` | | | |
| `--muted` | | | |

### Layout
- **Grid:** <columns, gutter, max width, margins per breakpoint>
- **Composition system:** <…> · **Spacing unit:** <…> · **Section rhythm:** <…>
- **Radius / shadow / rule system by role:** <…>
- **Mobile composition:** <how 390px is designed, not stacked>

### Machine-readable tokens (read by plan-diff; keep in sync)
```tokens
{
  "fonts": { "display": "<Face>", "text": "<Face>", "utility": null },
  "colors": { "ground": "#000000", "ink": "#000000", "brand": "#000000" },
  "scale": { "base": 18, "ratio": 1.25, "fluid": ["display"] }
}
```

## 5. Hero set piece
<what it is; states; how it was iterated; craft scores it reached in isolation>

## 6. Page architecture
<beats in order: purpose, device, proof used or slotted>

## 7. Slots the client must fill or confirm
<every photo / logo / metric / quote / legal slot, and every assumed fact>

## 8. Not doing
<items from both twins that were rejected>

## 9. Exceptions (mirror in slop-lint.config.json)
- <rule/font>: <brief requirement | card: reason>

## 10. Stack conventions
<framework; where tokens live; component library used for behaviour only; styling method>

## 11. Verification log
- Mirror removal: <…>
- Round 1: lint <…> · plan-diff <…> · review <verdict + craft scores>
- Round 2 / 3: <…>
- Design log entry: <added / path>
