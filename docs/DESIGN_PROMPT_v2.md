# Design prompts v2 — howmuchblur, "Darkroom Bench"

Use these with Google Stitch (pairs with the token system in `design/DESIGN.md`).
Generate **DESIGN SCREEN 1 first** — it establishes the app chrome. Every later screen
prompt explicitly tells Stitch to reuse that chrome and only swap the working area, so
the app stays one coherent instrument. There is **no landing page** — Screen 1 is the home.

---

## SHARED THEME (read into every screen)

**Vibe:** a warm **darkroom workbench**, *semi-skeuomorphic* — built from real, functional
UI components dressed in analog photographic materials. Not flat, not a cinema-black
dashboard, not cartoon. Tactile and authored: knurled lens-barrel dials, brushed-metal
toggles, film-strip selectors, a loupe over a live image, contact-sheet grids,
chinagraph-pencil annotations, an amber **safelight** glow. The math is always reachable
but never the headline — the *rendered look* is the hero.

**References / touchstones:** a photographic enlarger column + safelight; a light table
with a loupe; film contact sheets; Leica / Hasselblad / Fujifilm lens barrels with
knurled focus + aperture rings; film canisters; the tactile premium feel of the Halide /
Kino camera apps and Teenage Engineering hardware UIs; Kodak Portra warmth.

**System:** use the `design/DESIGN.md` tokens — warm darkroom browns (`#161210` base),
**amber `#f5a623`** primary (the safelight; red is destructive-only), **Fraunces** for
display/headlines/the result caption, **Inter** for body/labels, **JetBrains Mono** with
tabular figures for every live number. Soft radii. Depth via warm tonal layers, hairline
borders, faint inner glow, and *light* skeuomorphic material (subtle brushed-metal /
film-grain / paper tooth) — restrained, never noisy.

**Density:** desktop-first dense console (this is a workstation tool, not a marketing
page). Most work happens on Screen 1; secondary screens are reached by buttons in the
top rail. Mobile collapses panels into stacked drawers. Honor `prefers-reduced-motion`
and WCAG AA.

**The non-negotiable idea:** *render* the blur on a live image and let people scrub it —
never lead with a graph. The graph is a secondary comparison tool only.

---

## DESIGN SCREEN 1 — The Bench (primary dense workspace + app chrome)

Design the home workstation for **howmuchblur**, a tool that translates the field of view
and background blur of one camera onto a different format. This screen defines the app
chrome reused everywhere else, so make the chrome deliberate.

**Chrome to establish (reused by all later screens):**
- A **top rail** styled like an enlarger crossbar / brushed-metal toolbar: wordmark left,
  a row of nav buttons right that route to the other screens — **Gallery · My Kit ·
  Compare (graph) · Suggestions** — plus a settings cog. Active screen gets an amber rim.
- The warm darkroom background with the ambient amber safelight glow at the top.
- A consistent **panel material** for control groups (light-table surface, hairline warm
  border, soft radius) and the dial/slider/film-strip component styles below.

**Working area (dense, single screen):**
- **Center — the Rendered Hero under a loupe:** a large image stage where background blur
  is rendered live; a draggable glass **loupe** magnifies the bokeh. Below it, the
  **Answer caption** in Fraunces with key numbers raised to amber: e.g. *"Shoot **50 mm**
  at **ƒ/2.2** on full frame cropped to **24:65** to match the **90 mm ƒ/4** look of the
  Hasselblad XPan."* A row of expandable **proof chips** (FOV, entrance pupil, FF-equiv).
- **Left panel — Source:** a **film-strip format picker** (frames drawn to scale, sprocket
  holes; XPan a long strip), and **knurled barrel dials** for focal length + aperture that
  snap to the real ƒ-stop ladder, value shown in JetBrains Mono.
- **Right panel — Target & match:** target film-strip picker, a **match-axis** toggle
  (Horizontal default for panoramas / Diagonal / Vertical), and an aspect-ratio cropper
  showing **MP retained** as a celebrated mono number.
- **Image source row:** a small **drop zone** ("I shot this") + a "pick from Gallery"
  button. On drop/select, EXIF pre-fills the source; if missing, ask plainly *"which lens
  was on it?"*.
- **Kit status strip (key feature):** a compact bar reading your owned kit against the
  current target — *"✓ Your 50/1.8 covers this"* or *"✗ Nothing in your kit reaches
  this — see Suggestions →"*, the button routing to Screen 4.

Deliver collapsed + physics-expanded states, and the no-EXIF ask state.

---

## DESIGN SCREEN 2 — Compare (blur graph & estimation options)

**Reuse the EXACT app chrome from DESIGN SCREEN 1** — same top rail, color tokens,
typography, panel material, dials/sliders, spacing, and safelight background. Only replace
the working area. Mark "Compare" active in the rail.

This is the heir to the original howmuchblur graph, redesigned. Working area:
- A large **blur-vs-distance graph** (background blur as % of frame width across distance),
  drawn as if on light-table graph film — warm gridlines, amber active trace. Plot up to
  ~4 systems at once to **illustrate blur similarity** between candidate lens options and
  the target look (the target shown as a reference band).
- A **customise panel** mirroring the original options: subject framing (Head / Person /
  custom width), distance range, and which systems to plot — pulled from the current match,
  the user's kit, and suggested options.
- A toggle to **show/hide the graph** (so it can sit collapsed on Screen 1 too).
- A legend as film-canister chips, each toggleable. Reading the graph should answer
  "how close is this lens to the look I want?" at a glance.

---

## DESIGN SCREEN 3 — My Kit (lens inventory management)

**Reuse the EXACT app chrome from DESIGN SCREEN 1** (top rail, tokens, type, panel
material, components). Mark "My Kit" active. Only the working area changes.

A place to manage the user's owned gear, because the app uses it to decide whether they
already own the look or need to buy.
- **Bodies** section: owned cameras/formats as cards (sensor film-frame glyph, name).
- **Lenses** section: each lens as a **lens-barrel / film-canister card** showing focal
  length (or range for zooms) and **aperture range** (max–min ƒ), with knurled-ring detail.
- Add / edit / remove a lens via a tactile form (focal min–max, aperture max–min, mount,
  prime vs zoom). Quick "add common lens" presets.
- A subtle **coverage map** visual: the focal × aperture space the kit covers, so gaps are
  visible. Empty state invites adding the first lens.

---

## DESIGN SCREEN 4 — Suggestions (should you buy a lens?)

**Reuse the EXACT app chrome from DESIGN SCREEN 1** (top rail, tokens, type, panels,
components, safelight). Mark "Suggestions" active. Only the working area changes.

Triggered when the user matches a look or drops/selects an image and their kit can't
reproduce it. Working area = the target look at top (small rendered hero + the result
sentence), then **tiered recommendation cards**, each showing the lens, the exact
focal/aperture to use, a **blur-similarity score vs the target** with a mini sparkline of
the Screen 2 graph, and a clear **"You already own this"** vs **"Consider buying"** flag:

1. **Minimal** — the smallest change: reuse/adapt what's closest in the kit, or one
   versatile addition. ("Closest with what you have.")
2. **The Prime** — the ideal prime lens for the look (best blur + rendering match).
3. **Close enough / budget** — a cheaper lens that approximates the look acceptably, with
   an honest note on where it falls short.
4. **Zoom** — a zoom that covers the focal length, for flexibility over ultimate blur.

Each card: price tier, why-this-one one-liner, and a "compare on graph →" button routing
to Screen 2 with that option preloaded. Make owned-vs-buy unmistakable at a glance.

---

## DESIGN SCREEN 5 — Public Gallery (contact sheet)

**Reuse the EXACT app chrome from DESIGN SCREEN 1** (top rail, tokens, type, panel
material, components). Mark "Gallery" active. Only the working area changes.

A community browse view styled as a **darkroom contact sheet / light table**: a dense grid
of photographs, each frame edged like film with a chinagraph-pencil caption of its
**camera · lens · format · ƒ-stop**. Hover lifts the frame slightly with a soft glow.
- Filter strip (by format, focal range, look — e.g. "panoramic", "creamy bokeh").
- Selecting an image **loads it as the target look into Screen 1** and immediately runs the
  kit check — surfacing *"you can shoot this with your 85/1.8"* or *"needs a lens you don't
  own → Suggestions"*. Make that the payoff of browsing.
- An image detail/loupe state showing the full optical breakdown.

---

### Wiring notes (not part of the prompts)
- Rendered hero blur: `blurFraction(system, focusDist, bgDist)` × frame width in px
  (see `/demo/blur-hero.html`). Answer: `matchSystem(source, target, {axis})`.
  Crop + MP: `cropToAspect()`. Proof chips: `fieldOfView()`. Graph: `blurCurve()`.
- Formats + groups: `engine/formats.js → FORMATS` (each has `family`). EXIF via `exifr`.
- Kit check / suggestions: compare each kit lens's focal+aperture range against the
  `matchSystem()` target; rank by `blurFraction` similarity across distance to score "how
  close". The four tiers are a ranking + filtering policy over the kit and a lens catalog.
