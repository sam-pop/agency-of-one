# Typography: a procedure, not a recommendation list

**Read this first:** any typeface a skill *recommends* becomes the next AI tell. Space Grotesk happened that way; Fraunces, Instrument Serif, Geist, Bricolage Grotesque, and Satoshi are on the same path. So this file gives you **sources and a procedure**. The pools below exist to show you where to browse, not to give you something to pick from on autopilot. Your last 6 projects' faces are off-limits (see the design log).

## Procedure
1. **Voice → object.** Write 3 concrete voice words for the subject, then name **one physical object** in the subject's world whose lettering embodies them: the stencil on a feed sack, the engraved figures on a stock certificate, the dot-matrix on a parking ticket, the hand-painted price on a chalkboard.
2. **Object → letterform class.** What *class* of letter is on that object? Condensed industrial grotesque, engraved Didone, typewriter slab, DIN-style signage, rounded municipal sans, wedge serif, blackletter, stencil, dot-matrix, humanist sans, mid-century geometric, Clarendon… Write the class, not a font name.
3. **Shortlist 6** faces of that class from the **sources** below. Browse the source directly; don't rely on recall, because recall is the distribution. **Discard the first two that came to mind.**
4. **Test against the subject.** Set the hero sentence and one real data row (a price, a date, a code) in each of the remaining four. Keep the one where the numbers look like they belong to this world.
5. **Pairing (optional).** One family is often enough. If you use two, the contrast must sit on a real axis (serif vs sans, condensed vs wide, mechanical vs hand), never two near-identical sans.
6. **Check:** not in the overused list in `tells.md`; not used in your last 6 logged projects; license fits (see below); has the weights, figures (tabular? oldstyle?), and language support the content needs.

## Scale
- Pick **one ratio**: 1.2 (dense data), 1.25, 1.333 (balanced), 1.5 or 1.618 (dramatic, editorial). Generate about 5–7 steps from the base. Put them in CSS variables (`--step--1 … --step-5`) or Tailwind `@theme` `--text-*`.
- **Don't use Tailwind's default steps** (12/14/16/18/20/24/30/36/48/60/72); the computed-size set itself is a tell.
- Fluid `clamp()` only for display sizes. Body stays fixed (16–20px).
- Somewhere on the page, display ≥ 3× body. Use weight contrast deliberately (e.g. 300 vs 800), not 400 vs 600.
- Measure 45–75ch. Serif body gets about 0.05–0.1 more line-height than sans. `font-variant-numeric: tabular-nums` for data.
- Avoid layout shift: `font-display: swap` plus fallback metric overrides (`size-adjust`, `ascent-override`), or `next/font` which does it for you.

## Sources (browse these, don't recite them)
| Source | License | Notes |
|---|---|---|
| Google Fonts (sort by *trending* or *newest*, or filter by classification; skip page 1 of *popular*) | OFL (mostly) | Fine to self-host and commit |
| Velvetyne (velvetyne.fr) | mostly OFL, some GPL | Eccentric, high-personality display |
| Collletttivo (collletttivo.it) | OFL | Italian libre collective: display and serif |
| Use & Modify (usemodify.com) | mixed OFL/MIT/GPL/Apache, check each | Curated libre index; strong grotesques |
| The League of Moveable Type | OFL | Classic open-source display |
| Fontshare (fontshare.com) | ITF Free Font License: free commercial use, **no redistribution** | Load from their CDN; don't commit files to public repos. Satoshi, Clash, Cabinet, and General Sans are already overused |
| Etcetera Type Co, Uncut.wtf, Fontain, SUVA, Badass Libre Fonts by Womxn | varies, verify | Good hunting grounds |
| Pangram Pangram, Future Fonts, Dinamo, Klim, Commercial Type | paid / trial | Reference only, unless the client licenses them |

### Browse pools by class (starting points for step 3, not a menu)
Faces marked (v) were confirmed at that source by research; check the license for the rest before shipping.
- **Eccentric display:** Compagnon (v), Trickster (v), Sporting Grotesque (v), Happy Times at the IKOB (v), Lack (v), Le Murmure, Pilowlava, Basteleur (Velvetyne) · Mazius Display (v), Ortica (v), Ribes (v), Porpora (v) (Collletttivo) · Bluu (v), Savate (v), Terminal Grotesque (v) (Use & Modify)
- **Text & editorial serifs:** Halibut Serif (v), Sneaky Times (v), Messapia (v) (Collletttivo) · Redaction (v), Young Serif (v), Montagu Slab (v), Junicode (v), Bagnard (v), Avara (v) (U&M) · Fanwood (v), Linden Hill (v), Sorts Mill Goudy (v), Prociono (v) (League) · Piazzolla, Lustria, Brygada 1918, Literata, Petrona, Castoro, Gloock, IM Fell (Google) · Zodiak, Gambetta, Boska, Erode, Sentient, Bespoke Serif (Fontshare)
- **Grotesques & sans with character:** Apfel Grotezk (v), Mattone (v) (Collletttivo) · Karrik (v), Lil Grotesk (v), AUTHENTIC Sans (v), Violet Sans (v), Routed Gothic (v), Cotham Sans (v), Gap Sans (v), Lunchtype (v) (U&M) · League Gothic (v), League Spartan (v), Junction (v) (League) · Schibsted Grotesk, Familjen Grotesk, Hanken Grotesk, Anybody, Golos Text, Sofia Sans Condensed, Big Shoulders, Expletus Sans, Archivo (width axis), Chivo (Google) · Switzer, Tanker, Panchang, Telma, Technor (Fontshare)
- **Vernacular, signage & slab:** National Park Typeface (v), Alte DIN 1451 (v), DINish (v) (U&M) · Chunk (v), Blackout (v), Knewave (v) (League) · Ultra, Oi, Bungee Inline, Kenia, Ceviche One, Rye, Special Elite, Courier Prime (Google)
- **Mono, only when the subject is code or data:** Necto Mono (v), League Mono (v), Sometype Mono (v), Server Mono (v), Not Courier Sans (v), Victor Mono (v), Recursive (v), Azeret Mono (v), Martian Mono, Departure Mono, Commit Mono

## Overused: treat as tells unless DESIGN.md justifies them
Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Arial/Helvetica, system-ui · Space Grotesk, Syne · Fraunces, Instrument Serif/Sans, Playfair Display, Cormorant, Newsreader, Recoleta, Tiempos · Geist (+Mono), Mona Sans, Plus Jakarta Sans, DM Sans, Manrope, Outfit, Figtree, Sora, Bricolage Grotesque · Satoshi, General Sans, Clash Display, Cabinet Grotesk · IBM Plex, JetBrains Mono, Space Mono · Bebas Neue, Oswald.
