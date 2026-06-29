---
name: Light Table
colors:
  surface: '#161210'
  surface-dim: '#110d0b'
  surface-bright: '#352b24'
  surface-container-lowest: '#0d0a08'
  surface-container-low: '#1e1815'
  surface-container: '#221b17'
  surface-container-high: '#2c241e'
  surface-container-highest: '#372d26'
  on-surface: '#f3ece4'
  on-surface-variant: '#cdbba9'
  inverse-surface: '#f3ece4'
  inverse-on-surface: '#2a221c'
  outline: '#8a7560'
  outline-variant: '#4a3c30'
  surface-tint: '#f5a623'
  primary: '#f5a623'
  on-primary: '#2a1a00'
  primary-container: '#6b4a12'
  on-primary-container: '#ffe0a8'
  inverse-primary: '#8a5a00'
  secondary: '#d8c5b0'
  on-secondary: '#3a2c1d'
  secondary-container: '#4d3d2c'
  on-secondary-container: '#f0e0cc'
  tertiary: '#7fd1c4'
  on-tertiary: '#00382f'
  tertiary-container: '#27514a'
  on-tertiary-container: '#b3efe4'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe0a8'
  primary-fixed-dim: '#f5a623'
  on-primary-fixed: '#2a1a00'
  on-primary-fixed-variant: '#6b4a12'
  secondary-fixed: '#f0e0cc'
  secondary-fixed-dim: '#d8c5b0'
  on-secondary-fixed: '#251a0e'
  on-secondary-fixed-variant: '#4d3d2c'
  tertiary-fixed: '#b3efe4'
  tertiary-fixed-dim: '#7fd1c4'
  on-tertiary-fixed: '#00201b'
  on-tertiary-fixed-variant: '#27514a'
  background: '#161210'
  on-background: '#f3ece4'
  surface-variant: '#4a3c30'
typography:
  display-lg:
    fontFamily: Fraunces
    fontSize: 64px
    fontWeight: '500'
    lineHeight: '1.05'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Fraunces
    fontSize: 40px
    fontWeight: '500'
    lineHeight: '1.08'
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Fraunces
    fontSize: 26px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  caption-answer:
    fontFamily: Fraunces
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.16em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: '0'
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 56px
  radius-sm: 8px
  radius-md: 12px
  radius-lg: 16px
---

## Brand & Style
howmuchblur is a tool for photographers chasing a *look*, not a number. It translates
the field of view and background blur of one camera onto a different format. The
personality is warm, romantic, and creativity-encouraging — the feeling of laying film
on a loupe-lit light table, or flipping a beautifully art-directed photo magazine. It
is the opposite of a clinical instrument panel.

The style is **warm editorial darkroom**. Visual interest comes from real imagery, an
expressive serif voice, generous asymmetric layout, and a single amber "safelight"
glow — not from grids of numbers or surgical accents. The math is always available but
never the headline; the rendered look is the hero.

**Anti-patterns to avoid:** flat neutral-black "cinema dashboard" backgrounds; surgical
red as a primary accent; charts/graphs as the main surface; sharp 0px technical corners;
any screen with no photography in it.

## Colors
The palette is a **warm darkroom** anchored on toasted browns with an **amber
safelight** accent.

**Backgrounds (`surface` / `background` #161210):** deep warm brown-black, never a flat
neutral. An ambient radial amber glow sits behind the top of long pages.
**Primary — Amber `#f5a623`:** the safelight. Used for the key number in a result, active
states, primary CTAs, and highlight glints. It signals *attention and warmth*, not alarm.
**Secondary — Cream `#d8c5b0`:** warm neutral for supporting type and quiet chrome.
**Tertiary — Film cyan `#7fd1c4`:** a cool counterpoint used sparingly for informational
links, the "show the physics" affordance, and diagram secondary lines.
**Error / Red:** reserved *exclusively* for destructive or genuinely wrong states
(delete, unsupported file). Red is never decorative and never a CTA color.
**Functional warmth:** the surface-container ramp climbs from #0d0a08 to #372d26 to build
depth in warm tones; `on-surface-variant` (#cdbba9) carries metadata and secondary copy.

Use amber for large or bold text (display, the result number, mono readouts); for small
body copy prefer `on-surface` for legibility against the warm dark.

## Typography
A three-voice system that reads as *authored*, not computed:

- **Fraunces** (display, headline, and the result caption): an expressive editorial
  serif with optical sizing and soft terminals. It carries the warmth, romance, and the
  whimsy the product wants. Use its higher optical/soft settings at display sizes.
- **Inter** (body, labels, UI): neutral and highly legible for instructions, input
  labels (via `label-caps`), and running copy.
- **JetBrains Mono** (`data-mono`): for every number that changes — focal length,
  f-stop, FOV, MP retained. Always use **tabular lining figures** so values do not jump
  while a slider is dragged.

The result sentence is set in `caption-answer` (Fraunces) and laid over the rendered
image like a magazine caption, with the key numbers raised to amber.

## Layout & Spacing
**Fluid, mobile-first, editorial.** A single-column stack on mobile (steppers and
sliders sized for one-handed use); on desktop a relaxed asymmetric layout — the rendered
image hero is large and dominant, inputs sit beneath or beside it, never crowding it.

Spacing rides a 4px baseline with generous `stack-lg` (56px) between major sections so
the page breathes like a printed spread. One primary action per screen. Whitespace is a
material, not leftover space.

## Elevation & Depth
Depth comes from **warm tonal layers, hairline borders, and soft glow** — not hard drop
shadows.

- **Level 0 (Base):** #161210 with the ambient amber radial glow.
- **Level 1 (Cards / inputs):** `surface-container-low` (#1e1815) with a 1px
  `outline-variant` (#4a3c30) border.
- **Level 2 (Answer / featured):** `surface-container` to `-high`, optionally with a
  faint amber inner glow on the active result.
- **Texture:** a subtle film-grain / paper tooth on large surfaces (very low opacity) to
  warm the flatness — never noisy.
- **Interactive states:** elements warm and brighten slightly on hover/focus; the active
  format frame gains an amber rim. Honor `prefers-reduced-motion`.

## Shapes
**Soft, not sharp.** Radii of `radius-md` (12px) for cards and inputs, `radius-lg` (16px)
for the hero stage and featured answer, `radius-sm` (8px) for chips and small controls.
The softness reads as crafted and human, the antidote to the previous sharp "technical"
language. Exceptions: format glyphs are drawn as accurate physical film-frame outlines.

## Components

### Rendered Hero (the centerpiece)
A large image stage where background blur is **rendered live** and responds in real time
— open the aperture and the background blooms into bokeh discs. This replaces any
blur-vs-distance graph as the primary surface. `radius-lg`, full-bleed image, the result
caption gradient-anchored along the bottom edge.

### Answer Caption
The result stated as a sentence over the hero in `caption-answer` (Fraunces), key
numbers raised to amber (`primary`). Beneath it, a row of expandable **proof chips** and
a "nearest your lens has" snap note.

### Format Picker — film frames
Formats render as their **actual frame shapes drawn to scale**: 35mm with sprocket holes,
6×7 chunky, **XPan a long sprocket-edged strip, 6×17 longer still**. Grouped Digital /
Film / Panoramic. The active frame gets an amber rim and a soft glow — selecting a format
should feel like choosing gear, and the shape itself should sell the panoramic trade.

### Steppers & Sliders
Focal-length and aperture controls snap to the **real f-stop ladder**. Large tap targets,
warm hairline separators, the live value centered in `data-mono`. Amber accent on the
active track/thumb.

### Aspect-Ratio Cropper
Pick or type an aspect; preview the crop on the chosen film frame and show **MP retained**
as a celebrated `data-mono` number with a small film-strip diagram — make the resolution
cost of cropping feel like information, not a penalty.

### Proof Chips
Small pill badges (`radius-sm`, 1px `outline-variant`) with `label-caps` label and a
`data-mono` value — "39.7° FOV", "22.5mm pupil", "FF equivalent". Tappable to expand into
the physics drawer.

### Buttons
Primary: solid `primary` (amber) with `on-primary` (#2a1a00) text, `radius-md`. Secondary:
ghost with a 1px `outline` border and `on-surface` text. Destructive only: `error`.

### "Show the Physics" Drawer
A quiet, collapsible disclosure (tertiary film-cyan affordance) revealing the equivalence
law (focal × ratio, aperture × ratio), the shared entrance pupil, and the framing
distance — for the curious, never in the primary path.

### Input Fields
Warm-dark fill (`surface-container-low`), 1px `outline-variant` border that warms to
amber on focus, `radius-md`. Numeric inputs use `data-mono` with tabular figures.

### Image Drop (for "I shot this")
A generous dashed warm-border drop zone; on drop, the photo becomes the rendered hero.
Empty, no-EXIF ("which lens was on it?"), and unsupported-file states are first-class and
written in plain, friendly language.
