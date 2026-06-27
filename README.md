# compareblur

A ground-up revamp of the classic [howmuchblur](https://github.com/maakbaas/how-much-blur)
background-blur calculator — rebuilt around a portable optics **engine** and a modern,
task-oriented frontend that translates the *look* of one camera/lens/format onto another.

Instead of only "viewing a graph", the goal is to answer real photographer questions:
*"I shot this on an XPan at 90mm ƒ/4 — what do I need on full frame to match it?"* and
*"does anything in my kit already get me there, or should I buy a lens?"*

## Repository layout

| Path        | What it is |
|-------------|------------|
| `engine/`   | Framework-agnostic optics engine (pure ES modules, zero deps). The equivalence math: field of view, background blur, cross-format matching, panoramic crops. Shared by the app and demos. |
| `app/`      | The new frontend — Vite + React + TypeScript + Tailwind. Gallery, EXIF upload + matching, kit awareness. |
| `demo/`     | Minimal reference pages that wire the engine directly (incl. a live "render the blur" concept). Serve over HTTP. |
| `docs/`     | Design system + design-direction prompts. |
| `legacy/`   | The original jQuery `howmuchblur` site, preserved as-is. |

## The engine

The core insight, generalised from the original calculator: two systems produce the same
field of view **and** background blur when their **equivalent focal length** (`focal × ratio`)
and **equivalent aperture** (`aperture × ratio`) match — where `ratio` is the sensor
dimension ratio along the matched axis. Picking the *horizontal* axis is what makes
panoramic formats (XPan, 6×17) work, where a diagonal crop factor would mislead.

Key exports (`engine/index.js`): `matchSystem`, `blurFraction`, `blurCurve`,
`cropToAspect`, `fieldOfView`, `focusDistanceForFraming`, `nearestFStop`, `FORMATS`.

## Running the app

```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
```

The app imports the engine from the sibling `engine/` directory via a Vite alias
(`@engine`), so the engine stays shared rather than copied.

## Credits

Original concept and calculator by [maakbaas](https://github.com/maakbaas/how-much-blur);
online version hosted by Gijs de Koning.
