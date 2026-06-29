# Design prompt — howmuchblur, reimagined

Paste the block below into Google Stitch or Claude (design mode). It is written to
produce a concrete, opinionated UI — not a graph toy. Everything it asks for maps to
an engine function that already exists in `/engine` (`matchSystem`, `cropToAspect`,
`fieldOfView`, `blurCurve`), so the generated screens are wireable, not hypothetical.

---

## PROMPT

You are designing **howmuchblur**, a web app (mobile-first, works on desktop) for
photographers who think in *gear and looks*, not graphs. The core idea the app makes
intuitive: **any field of view + background blur can be reproduced on a different
camera format** — the app does the translation. The original product only drew a blur
curve; we are replacing that with a task-oriented tool.

### Voice & feeling
Calm, confident, photographic. Think a well-made light meter app or a Leica manual —
generous whitespace, one clear answer per screen, real photographic vocabulary
(formats, lenses, stops, "the look"). Dark mode first; the app is used in the field.
No dashboards, no clutter, no abstract math on the primary surface (math lives behind
a "show the physics" disclosure).

### The single most important screen: the Answer Card
Most flows end here. It states the result as a sentence a photographer would say out loud:

> **Shoot 50 mm at ƒ/2.2** on your full-frame body cropped to **24:65** (≈ 25 MP left)
> to match the **90 mm ƒ/4** look of the **Hasselblad XPan**.

Below the sentence, a quiet row of "proof" chips that can expand: matched field of view
(39.7° wide), entrance pupil (22.5 mm, identical), full-frame equivalent. A small
side-by-side aspect-ratio diagram showing the source frame shape vs the target crop
shape, drawn to scale. A "nearest your lens has" note that snaps ƒ/2.22 → ƒ/2.2.

### The three primary flows (design all three; they share the Answer Card)

1. **Match a look across formats.** User picks a source camera/format, a lens focal
   length, and an aperture; then picks the target format ("I want this on my…"). App
   returns the Answer Card. Format pickers should feel like choosing gear: grouped as
   Digital / Film / Panoramic, with sensor-shape thumbnails, not a dropdown of numbers.

2. **"I shot this — what would match it?" (image-led).** User drops in a photo. App
   reads EXIF if present (camera, focal length, aperture) and pre-fills; if EXIF is
   missing or it's a film/panoramic scan, the app asks plainly: *"Which lens was on
   it?"* and offers the known formats. Then → Answer Card, with the option to choose
   the target. Show the dropped image with the predicted framing overlaid.

3. **Panoramic & oddball guidance.** A dedicated path for XPan, 6×17, 6×12, etc. The
   app explains the trade in human terms: *"The XPan's 90 mm sees a 39.7° horizontal
   sweep. On full frame you can't get that shape natively — crop to 24:65 and you keep
   ~25 MP. Use a 50 mm at ƒ/2.2 for the same sweep and blur."* Make the **resolution
   cost of cropping** a first-class, visible number, with a little area diagram.

### Secondary, on demand (progressive disclosure)
- A **blur-vs-distance** view (the old graph), redesigned as an elegant, optional
  "see the falloff" panel — comparison of up to ~4 systems, but never the landing
  experience.
- A **"show the physics"** drawer on the Answer Card: the equivalence law
  (focal × ratio, aperture × ratio), entrance pupil identity, and the framing distance.

### Inputs to design as reusable components
- **Format picker** (grouped, with sensor-shape glyphs drawn to scale).
- **Focal + aperture steppers** that snap to real lens values (the ƒ-stop ladder).
- **Aspect-ratio cropper** — pick or type an aspect; preview the crop on the chosen
  sensor and show MP retained.
- **Match-axis toggle** — Horizontal (default for panoramas) / Diagonal (classic crop
  factor) / Vertical — explained in one line each, not jargon-dumped.

### Hard requirements
- Mobile-first responsive; one primary action per screen.
- Accessible: WCAG AA contrast, full keyboard nav, every result also expressible as text.
- Result sentences must read naturally with substituted numbers (design the templating).
- Light + dark themes; dark is default.
- No skeuomorphic camera chrome; clean, typographic, photographic restraint.

### Deliverables
Hi-fi mockups for: landing/flow chooser, each of the 3 primary flows, the Answer Card
(expanded + collapsed), the format picker, the optional blur-falloff comparison, and
the empty/error states for the image-drop flow (no EXIF, unsupported file). Provide a
small design-token set (type scale, spacing, color for light/dark, the format glyph
style) so the build can be themed consistently.

---

### Notes for whoever wires it up (not part of the prompt)
- Every result the UI shows comes from `engine/optics.js`:
  `matchSystem(source, targetFormat, {axis})` → the Answer Card; `cropToAspect()` →
  the cropper + MP-retained number; `fieldOfView()` → the proof chips; `blurCurve()` →
  the optional falloff panel.
- The format list (with sensor-shape glyphs) is `engine/formats.js → FORMATS`,
  pre-grouped via each entry's `family` (`digital | film | pano | crop`).
- EXIF reading is a frontend concern (e.g. `exifr`); map its `FocalLength` / `FNumber`
  / `Model` onto a `System`. Film/pano scans won't have it — that's why flow 2 must
  gracefully ask for the lens.
