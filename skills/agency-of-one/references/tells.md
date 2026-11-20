# AI-design tells catalog (as of Nov 2026)

A tell is evidence of an **unchosen default**, not proof of machine authorship. Many of these predate AI (Bootstrap, Tailwind UI, SaaS templates). Any of them is fine **if the brief or DESIGN.md chose it on purpose and says why**. None is fine by default.

Generations: **G1** = the original SaaS look (2023–24). **G2** = the "tasteful AI" look that appeared once G1 was banned (2025–26). **G3** = what appears once G2 is banned (emerging; least documented). Expect a G4: the next most likely thing after whatever you just avoided. The deck and the subject excavation exist for exactly that reason.

`lint` = caught by slop-lint.mjs · `render` = measured by screenshot.mjs · `eye` = reviewer judgement

## Typography
| Tell | Signature | Gen | Check |
|---|---|---|---|
| Default sans everywhere | Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Arial, Helvetica, system-ui as the face | G1 | lint |
| "Edgy default" grotesk | Space Grotesk; Syne as display | G1→2 | lint |
| "Tasteful" second-wave faces | Fraunces, Instrument Serif/Sans, Geist (+Mono), Mona Sans, Plus Jakarta Sans, Recoleta, Newsreader, Tiempos, DM Sans, Bricolage Grotesque, Satoshi, Clash Display, Cabinet Grotesk, General Sans; `--font-sans: var(--font-geist-sans)` | G2 | lint |
| Italic serif display headline | oversized serif H1 in italic | G2 | lint/eye |
| One accented word in a headline | single `<em>/<i>/<span>` in an h1–h3 with a different style, colour, or weight | G2 | lint |
| Tracked ALL-CAPS labels / eyebrows | ≤15px text, `uppercase` + `letter-spacing > .03em`; an inert line above every heading; pill badge above H1 | G1 (pill) / G2 (text) | lint + render |
| Monospace as costume | mono on labels, captions, or meta when the content isn't code or data | G2 | lint |
| Tailwind default type scale | computed sizes ⊆ {12,14,16,18,20,24,30,36,48,60,72,96} | G1 | render |
| Flat hierarchy | adjacent size steps ratio < 1.2 | G1 | render |
| Crushed display tracking, 5-line H1 | very negative tracking; a headline that fills the first viewport | G2–3 | eye |
| Title Case Everywhere | | G1 | eye |

## Colour
| Tell | Signature | Gen | Check |
|---|---|---|---|
| House indigo/violet | `#6366f1 #8b5cf6 #7c3aed #a855f7 #9333ea #667eea #764ba2`; Tailwind purple/violet/indigo/fuchsia | G1 | lint |
| Purple→blue (or pink→purple, cyan→blue) gradient | gradient stops in hue 200–330 | G1 | lint |
| Gradient text | `background-clip: text` | G1 | lint |
| Neon on dark, coloured glows | zero-offset coloured `box-shadow`/`text-shadow` on a dark ground | G1 | lint |
| "Claude look" | ground near `#F4F1EA` (L ≥ 90, hue 55–105) + high-contrast serif display + terracotta/clay accent near `#D97757` (hue 15–55) | G2 | lint |
| Beige-and-brass "premium" | ivory ground + muted olive/clay/brass, airy spacing | G2–3 | eye |
| Dark signal | near-black + exactly one acid-green or vermilion accent | G2 | lint |
| Near-black stand-ins | `#0B0B0B #111 #0a0a0a #09090b`, `bg-zinc-950`, `text-zinc-400` on `bg-zinc-900` | G2–3 | lint |
| Pure black as the system | `#000` / `bg-black` for all ink and dark grounds (pure white grounds are fine) | G1 | lint |
| Untouched shadcn | zinc/slate tokens, `--radius: 0.625rem`, default oklch block | G1–2 | lint |
| Zero-chroma greys beside a brand hue | neutrals not tinted toward the ground | G2 | eye |
| Default status colours | emerald `#10B981` success; rainbow status pills | G1 | eye |
| Model house styles (DesignArena, 64k pages) | OpenAI: cream + italic serif · Anthropic: dark, glowing, purple · Google: navy dashboards with sidebars · Meta: loud magazine blocks | — | eye |

## Layout
| Tell | Signature | Gen | Check |
|---|---|---|---|
| Stock page order | hero → logo row → 3 features → testimonials → 3-tier pricing → CTA → 4-col footer | G1 | eye |
| Centred hero stack | pill + H1 + sub + 2 buttons on one axis; > 70% of text centred | G1 | render |
| Three equal icon cards | `grid-cols-3` of identical children, icon tile on top | G1 | lint |
| Hero metric strip | 2+ big numbers with small labels; count-up | G1 | eye |
| Broadsheet cosplay | global zero radius + hairline rules everywhere + dense columns on non-editorial content | G2 | eye |
| Bento grid | mixed-span rounded tiles | G1–2 | eye |
| Metronome sections | identical section gaps and dividers; spacing collapsed to ≤ 3 values | G1–2 | eye/render |
| 01/02/03 markers without a real sequence | | G2 | lint |
| Decorative text furniture | rotated vertical text, "scroll" cues, version/BETA pill, locale or weather strip, mono-caps strip under the hero | G3 | eye |
| `h-screen` / `100vh` hero | use `svh/dvh`, and ask whether it needs to be full-height at all | G1 | lint |
| Ends on a newsletter sign-up that isn't the page's job | | G3 | eye |
| Reference averaging | bold references flattened into the safe middle (dark→cream, acid→clay, sharp→rounded) | G2–3 | eye |

## Components and chrome
| Tell | Signature | Gen | Check |
|---|---|---|---|
| SaaS card kit | one radius everywhere (`rounded-2xl`), the same `rgba(0,0,0,.1)` / `shadow-lg` under every card, gradient washes | G1 | lint |
| Hairline border + wide soft shadow on the same card | | G2 | lint |
| Side-tab accent stripe | `border-l-4` on a rounded card | G1–2 | lint |
| Nested cards / everything in a card | | G1 | eye |
| Glass | `backdrop-blur` nav or panels | G1 | lint |
| Template punctuation | `A · B · C` meta, `→` glued to links/buttons, `WORD — fragment` labels, decorative status dots | G2 | lint |
| Fake liveness | `animate-pulse`/`animate-ping` dot or "live" chip with nothing live | G2–3 | lint |
| Icon-set fingerprint | lucide `Sparkles Zap Rocket Bot ShieldCheck ArrowRight` at default size; emoji as icons | G1 | lint |
| Fake product chrome | drawn browser bars, device frames, div-built "dashboards" with neon under-glow | G1–2 | eye |
| Background furniture | grid lines, radial spotlight, aurora/mesh blobs | G2–3 | lint/eye |
| Neobrutalist escape hatch | hard unblurred offset shadow ≥ 4px + thick borders + saturated flats | G3 | lint |
| Every button primary; ghost button beside primary by reflex | | G1 | eye |
| Equal 4-column footer; glass sticky nav | | G1 | eye |
| Missing states | no `:focus-visible`, hover, empty, loading, or error states | G1 | eye |

## Motion
| Tell | Signature | Gen | Check |
|---|---|---|---|
| Fade-and-slide-up on every section | repeated `whileInView` / IntersectionObserver entrance; content at `opacity:0` before JS | G1 | lint |
| Identical hover lift or zoom on every card | | G1 | eye |
| Bounce/elastic easing | overshoot `cubic-bezier`, `animate-bounce` | G1 | lint |
| `transition: all` | | G1 | lint |
| Marquee logo strip, ticker bars | | G2 | lint |
| Count-up stats on scroll | | G1 | eye |
| Shimmer or streaming text, decorative blinking cursor | | G2–3 | eye |
| No reduced-motion path | | — | lint |

## Copy
| Tell | Signature | Gen | Check |
|---|---|---|---|
| Any-company headline | "Build the future of…", "Your all-in-one…", "Scale without limits", "Elevate your…" | G1 | lint |
| Buzzwords | seamless, effortless, robust, cutting-edge, best-in-class, world-class, powerful, streamline, unlock, supercharge, empower, leverage, transform | G1 | lint |
| Rebuttal cadence | "Not a tool. A language." / "No X. Just Y." (≥ 2 per page) | G2 | lint |
| Punchy triplets, staccato fragments | "Fast. Simple. Secure." | G2 | lint |
| Em-dash confetti | spaced em dashes throughout UI copy | G2 | lint |
| Fashionable model vocabulary | "load-bearing", "seams", "grain", "craft", "quietly", "…is theater", "thoughtfully" | G3 | lint |
| Generic CTAs | "Get Started", "Learn More", "Book a demo" | G1 | lint |
| Invented proof | round or fake stats (10x, 99.9%, 10,000+), invented testimonials, "Sarah M., Marketing Director", fake logo walls | G1 | lint |
| Placeholder names | John/Jane Doe, Acme, Globex, Initech | G1 | lint |
| Subhead restates heading | | G1 | eye |
| "Powered by AI" badges | | G1 | eye |

## Imagery
| Tell | Signature | Gen |
|---|---|---|
| Gradient-block placeholders where a picture belongs | | G1 |
| CSS/SVG "illustrations" assembled from circles and blobs | | G2 |
| Plastic AI renders (over-smooth, garbled signage, wrong hands) | | G1 |
| DiceBear / generated avatars on testimonials | `api.dicebear.com` | G1 |
| Text-only collapse of an image-led brief | | G2–3 |
| Four-pointed-star "AI" logo marks | | G1 |

## Builder fingerprints (code)
`lovable-uploads`, `*.lovable.app`, `cdn.gpteng.co`, `bolt.host`, `api.dicebear.com`; the shadcn + Radix + Lucide + Tailwind-defaults + Geist stack untouched; class attributes over 200 characters; `framer-motion` with `transition-all`.

## "Familiar but not AI" (trend sameness, 2025–26)
Bento grids · glassmorphism / "liquid glass" · gradients on everything · soulless minimalism · unreadable maximalism · Y2K/90s revival · mocked-up stationery · big grotesk + grey grid + blurred screenshot · the AI-lab homepage (off-white, warm greys, oversized sans with serif accents, one accent, blurred-gradient imagery, research-paper tone) · serif-as-humanity ("tasteslop"). Muzli reported look-alikes rising to about 1 in 200 in its 2025–26 archive, up from about 1 in 1,100 in 2021.

## Why convergence happens (keep in mind)
- The most probable output is the centre of the training data; the shared stack (React + Tailwind + shadcn + Lucide) decides the look before any choice is made.
- **Banning a look moves the mode; it doesn't widen the distribution.** Anthropic's own skill rewrite now names the cream/serif/terracotta look because it became the new default.
- Iteration makes it worse: each revision starts from an average output. Blending several references regresses to the mean.
- Rules the agent never loads do nothing (Hallmark: the `transition: all` rate didn't move while the rule sat in an unloaded file).
- Anti-slop kits can create their own house look, so this kit avoids recommending specific fonts or palettes and uses randomness plus history instead.

## Sources
Anthropic frontend-design skill (June 2026 rewrite): github.com/anthropics/skills · Hallmark gates: github.com/Nutlope/hallmark · Impeccable: impeccable.style/slop, github.com/pbakaus/impeccable · pixelslop: npm pixelslop · taste-skill: github.com/Leonxlnx/taste-skill · Refero anti-slop: github.com/referodesign/refero_skill · aiseo design_slop.rs (docs.rs aiseo) · ux-skill wiki: github.com/Laith0003/ux-skill · avoid-ai-design (capitalandcompute.net) · ai-design-tells (PyPI) · Jim Nielsen, "The AI Aesthetic" (blog.jim-nielsen.com/2026/ai-aesthetic) · Muzli, "Are we out of new things?" · uxdesign.cc, "AI design isn't ugly, it's fluent" · utsubo.com "Built with AI" trust signals 2026 · Creative Boom trends creatives are over in 2026 · DesignArena 64k-page study (via Digg) · New Yorker on Claude Design (via secondary summaries).

## G3: the anti-slop house style (seen in blind review of this kit's own expressive output)
When models are pushed off the defaults they converge again, one level up: **the page built as a paper artefact from the subject's world** (score sheet, ledger, coupon book, pleading paper, timetable) + hairline-ruled cells + lettered keys (A–E, Fig. 1) + a muted tinted ground + flat colour + mono annotations + zero photography + a plain "what this is not" voice. Once is a point of view; across projects it reads as a system prompt. Agency mode is the default for this reason. In expressive mode, use it at most once per design log window.

## G4: the fingerprint of anti-slop output itself (found by blind panels on this kit's agency-mode builds)
Pages that avoid every G1–G3 tell still converge, this time on the **"honest assistant" register**:
- **Voice:** negative definition ("Nobody else.", "What X is not", "has no view"); self-disclosing demos ("An illustrative page. The buttons work. Try them."); sections that describe what an answer *would* contain instead of answering; every claim hedged; no em dashes anywhere because the writer was told to avoid them.
- **Scaffolding:** "Question N of 5" labels; "For firms of X to Y" under every CTA; the same CTA label five-plus times; a small grey qualifier under each button.
- **Imagery:** zero photography, every visual a code-drawn diagram (timeline strip, line-art buildings, document mock).
- **Palette & structure:** tinted off-white ground (never white), one dark band, hairline rules instead of any card, heading-left/content-right on every section, ending in a short form on a dark band plus a minimal footer with a disclaimer.
- **Craft slips:** straight apostrophes, hyphens rendering as en dashes in some faces.
Fixes: write as the company's best marketer, not a cautious assistant (confident, factual, no self-narration); label samples once in a small legal line; omit sections you can't fill rather than describing them; get real photography; vary ground (white is allowed), structure, and ending; use typographic quotes. `slop-lint` flags the code-detectable parts.

## G5: what the brand-first build still did (blind panel on a v1.1 client rebuild)
The palette, type and people treatment fixed the client's complaints, and the panel picked the rebuild 3 of 3. What it still caught:
- **Invented marks:** a made-up seal or roundel ("BM" in a circle of text-on-path), often clipped, repeated near the real logo. A second mark competes with the client's own. Use the client's mark or nothing. (`slop-lint` flags `<textPath>`.)
- **One hero stamped on every page:** the same set piece reused on each page, with only the order changed. Interior pages need their own header and content first (craft.md §7b).
- **Shown twice:** the same people as a hero row and again as a list one scroll later; a pre-footer link band repeating the footer.
- **Asset availability as hierarchy:** whoever had a usable photo got the big treatment and everyone else got a grey list. Normalise what exists (`photo-normalise.mjs`) and give peers one treatment.
- **Dropped content:** real photos and nav items from the old site left out of the rebuild. A redesign never loses what the client already had without asking.
- **Self-quoting:** quotes attributed to the organisation itself ("The Foundation, on Jaden"). Use a real person's words, or no quote.
- **Fake success:** a form that shows "Thank you" with no endpoint; images upscaled past their pixels (soft on retina; plan-diff warns).
- **Mobile fold without the action:** a six-line headline that pushes the primary action below the fold at 390px.

## Agency clichés (the "trying to win an award" look, wrong for business sites)
Scroll-jacking and hijacked wheel speed · custom cursor blobs or trails · WebGL or 3D for no reason · gradient-mesh / aurora SaaS heroes · abstract glossy 3D shapes · giant marquee type bands · split-text letter-by-letter animations everywhere · noise and grain over everything · "Awwwards" preloaders with counters · horizontal scroll for the whole site · ultra-thin grey body text · stock handshake / skyline / people-at-laptops photography · enormous footer wordmark as the default ending.
