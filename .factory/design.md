# Visual thesis — The Listening Garden

## Direction and rationale

Transcript Study View is a **surreal editorial scenery** system: spoken words become a quiet landscape of paper paths, timestamp stones, and a suspended listening moon. It makes the modality switch legible without pretending to create or reinterpret the source. The reader itself stays typographically calm; the scenery lives at the entry points and recedes once reading begins.

The scene is intentionally tactile and slightly impossible rather than a generic software gradient. A narrow copper path represents timestamp navigation, pale paper terraces represent paragraphs, and a cobalt orb represents audio that remains available when the reader wants to return to it.

## Palette

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--canvas` | `#F4F0E7` | `#141711` | warm reading ground |
| `--paper` | `#FFFDF6` | `#20241D` | lifted content surface |
| `--ink` | `#18231D` | `#F2EFE4` | primary text |
| `--muted` | `#59675F` | `#B7C0B7` | secondary text |
| `--moss` | `#254D3D` | `#86B8A1` | primary action and landscape |
| `--copper` | `#A44121` | `#F0A17D` | timestamps, focus, active trail |
| `--cobalt` | `#2D4C9C` | `#91AAEF` | audio mode |
| `--success` | `#236746` | `#86D4A8` | confirmed state |
| `--warning` | `#875712` | `#F2C66D` | partial/unsupported state |
| `--danger` | `#9A2F29` | `#FF9B92` | errors |

All body combinations meet WCAG AA. Color is always paired with a label, icon, or shape.

## Typography

- **Source Serif 4** (self-hosted variable WOFF2, SIL OFL) for the long-form transcript and display quotations: editorial, open, and comfortable at generous leading.
- **Atkinson Hyperlegible Next** (self-hosted variable WOFF2, SIL OFL) for controls, metadata, and dyslexia-friendly mode: differentiated letterforms and high legibility.
- Scale: 14 / 16 / 18 / 24 / 36 / clamp(44–72) px. Transcript default is 20px at 1.72 line height and a 68-character measure.

## Spacing and shape

An 8px base rhythm with 4px micro-spacing. Main intervals: 8, 16, 24, 32, 48, 72, 96. Controls are at least 44px. Surfaces use asymmetric `24px 24px 24px 8px` cuts, echoing stacked paper sheets; pills are reserved for timestamps and small state labels. The desktop reader has a 280px study rail and a 68ch reading column. At 390px, the rail becomes a normal-flow toolbar and nonessential explanatory copy is removed.

## Interaction grammar

- Timestamp links are copper “trail markers.” Activating one focuses the source tab and seeks the existing player—never a downloaded copy.
- A selection creates a local highlight with an immediate paper-flash confirmation and an Undo action.
- The current spoken paragraph receives a cobalt edge. TTS uses the browser voice and can be stopped at any time.
- `J`/`K` move between paragraphs; `/` focuses search; `Space` toggles reading when focus is not inside a control; `Esc` stops speech.
- Empty, loading, unsupported, offline, and source-closed states each state what happened and the next useful action.

## Motion policy

UI transitions last 160–240ms and animate only opacity/transform. Paper surfaces enter upward from their trail marker; a highlight fades in where selected. Nothing loops. Under `prefers-reduced-motion: reduce`, movement and smooth scrolling become instant while hierarchy, edges, and state labels remain.

## Asset plan and provenance

One original wide hero illustration anchors the landing page and popup empty state. Art direction prompt:

> Use case: stylized-concept. Asset type: wide landing-page hero illustration. A calm surreal editorial landscape made from ivory paper terraces shaped like transcript paragraphs, a winding rust-copper timestamp path, deep moss-green cut-paper hills, and one small cobalt listening moon suspended above the path; tactile paper fibers, subtle risograph grain, long soft morning shadows, refined magazine illustration, wide composition with generous quiet negative space at upper left; palette of parchment, forest moss, oxidized copper, ink, and cobalt. No people, no devices, no interface mockup, no letters, no text, no logos, no watermark, no recognizable brands, no gradients, no neon, no glossy 3D.

Generated with the factory `factory-image` deployment on 2026-08-27. The selected original PNG and exact prompt sidecar are retained in `assets/src/`; WebP/AVIF derivatives are produced for the site. Generated imagery is original project artwork. Product icons are hand-authored SVG line symbols and use no external icon set.
