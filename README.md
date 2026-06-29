# CompareBlur

A ground-up revamp of the classic [howmuchblur](https://github.com/maakbaas/how-much-blur)
background-blur calculator — rebuilt around a portable optics **engine** and a modern,
task-oriented frontend that translates the *look* of one camera/lens/format onto another.

Instead of only "viewing a graph", the goal is to answer real photographer questions:
*"I shot this on an XPan at 90mm ƒ/4 — what do I need on full frame to match it?"* and
*"does anything in my kit already get me there, or should I buy a lens?"*

## Repository layout

| Path        | What it is |
|-------------|------------|
| `app/`      | Vite + React + TypeScript frontend. Compare, Gallery, My Kit, Suggestions, and Admin surfaces. |
| `engine/`   | Framework-agnostic optics engine. Handles field of view, blur matching, crops, formats, and equivalent-system math. |
| `catalog/`  | Source adapters and deterministic transforms for the generated camera/lens catalog. |
| `workers/`  | Cloudflare Worker for scheduled catalog refresh and R2 export publishing. |
| `functions/` | Cloudflare Pages Functions for admin, gallery, image, and catalog proxy APIs. |
| `migrations/` | D1 migrations for app-owned data such as gallery metadata. |
| `scripts/`  | Operational scripts, including gallery seed migration into Cloudflare. |
| `docs/`     | Design and catalog orchestration notes. |

## The engine

The core insight, generalised from the original calculator: two systems produce the same
field of view **and** background blur when their **equivalent focal length** (`focal × ratio`)
and **equivalent aperture** (`aperture × ratio`) match — where `ratio` is the sensor
dimension ratio along the matched axis. Picking the *horizontal* axis is what makes
panoramic formats (XPan, 6×17) work, where a diagonal crop factor would mislead.

Key exports (`engine/index.js`): `matchSystem`, `blurFraction`, `blurCurve`,
`cropToAspect`, `fieldOfView`, `focusDistanceForFraming`, `nearestFStop`, `FORMATS`.

## Running the app

From the repository root (recommended with [Bun](https://bun.sh)):

```bash
bun run setup    # install app dependencies
bun run dev      # http://localhost:5174 (pinned; strictPort)
bun run build    # type-check + production bundle (npm ci for Cloudflare Pages)
```

Or from `app/` directly:

```bash
cd app
bun install
bun run dev      # http://localhost:5174
bun run build    # type-check + production bundle
```

The app imports the engine from the sibling `engine/` directory via a Vite alias
(`@engine`), so the engine stays shared rather than copied.

## Catalog data

The app uses one generated catalog surface rather than parallel hand-maintained
camera/lens datasets. The catalog pipeline fetches LensDB and CameraDatabase,
layers curated overrides, validates the result, and writes:

- `app/public/catalog.fallback.json` for static fallback builds.
- `exports/catalog.latest.json` in R2 via the `compareblur-catalog-sync` Worker.

Useful commands:

```bash
bun run catalog:build
bun run catalog:check
bun run catalog:worker:deploy
```

The generated catalog currently includes camera bodies, fixed-lens compact
cameras, interchangeable lenses, curated GF/legacy lenses, aperture points, and
fixed compact camera/lens bindings.

## Cloudflare Pages

This project deploys the React/Vite app as a static Cloudflare Pages site. The
blur graph/math path is still fully client-side through `engine/`; mutable data
uses Cloudflare serverless services.

Use these Pages build settings from the connected GitHub repository:

| Setting | Value |
|---------|-------|
| Root directory | repository root |
| Build command | `cd app && npm ci && npm run build` |
| Build output directory | `app/dist` |

The root `wrangler.toml` records `app/dist` as the Pages output directory, and
`app/public/_redirects` preserves client-side routing on Cloudflare Pages.
The root `package.json` also supports Pages projects currently configured with
`bun run build`; that command delegates to the same app build above.

Cloudflare-backed data paths:

- Catalog refresh/export: Worker + D1 + R2.
- Gallery metadata/moderation: Pages Functions + D1.
- Gallery image objects: R2.
- Admin operations: same-origin Pages Functions that inject server-side secrets
  and/or verify Auth0/Cloudflare Access identity.

## Credits

Original concept and calculator by [maakbaas](https://github.com/maakbaas/how-much-blur);
online version hosted by Gijs de Koning.

Lens catalog data from [LensDB](https://github.com/Luminoid/lens-db) (lens.luminoid.dev),
used under CC BY-NC-SA 4.0 — this project is non-commercial and shares the derived dataset
under the same license. See `app/src/data/LENSDB.md`.
