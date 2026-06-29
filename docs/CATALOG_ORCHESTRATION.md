# Catalog Orchestration Plan

## Goal

Maintain one canonical camera and lens catalog for the app, fed by real upstream
datasets and deterministic transforms. The app should consume generated catalog
artifacts, not hand-maintained duplicate camera/lens seed files.

## Current State

- `catalog/src/` contains source adapters, deterministic normalizers, curated
  overrides, local build/check scripts, and the full catalog assembler.
- Cloudflare Worker `compareblur-catalog-sync` fetches CameraDatabase and
  LensDB, snapshots raw sources to R2, publishes one full app-ready export, and
  records run metadata in D1.
- `app/src/store/CatalogProvider.tsx` consumes the full Cloudflare export first,
  then falls back to the generated static `app/public/catalog.fallback.json`.
- `app/src/data/gear.seed.ts`, `cameras.seed.ts`, and `legacy.seed.ts` are now
  emergency fallback re-exports from catalog-owned curated override modules.

## Source Strategy

Use source adapters rather than direct app imports:

| Source | Use | Notes |
| --- | --- | --- |
| LensDB | Interchangeable lens baseline | Fetched by the catalog Worker/build script; license is CC BY-NC-SA 4.0. |
| CameraDatabase | Digital camera bodies and fixed-lens compact specs | MIT; has sensor size, crop factor, 35mm-equivalent focal range, max aperture, optical zoom. |
| Lensfun compact XML | Fixed-lens compact bindings and focal samples | Good cross-check for compact body-to-lens identity; not a complete product-spec source. |
| Curated overrides | Film compacts, missing fields, corrections | Required for Ricoh GR1/GR1s/GR1v and other non-digital compacts. |

Raw source records should be snapshotted before transformation so updates are
auditable and reproducible.

## Canonical Model

Store normalized catalog entities:

- `catalog_sources`: upstream source metadata, license, URL, fetch cadence.
- `source_snapshots`: raw object key, content hash, fetched date, source id.
- `cameras`: maker, model, slug, format/sensor dimensions, crop factor, mount
  or fixed-lens marker, release metadata.
- `lenses`: maker, model, lens type, focal range, aperture range, image-circle
  coverage, autofocus, price metadata.
- `lens_aperture_points`: focal length to maximum aperture samples.
- `camera_lens_bindings`: body-to-lens relationships, with `fixed` bindings for
  compact cameras and normal mount compatibility for interchangeable systems.
- `catalog_overrides`: curated corrections layered after upstream transforms.
- `catalog_runs`: sync status, source hashes, validation result, publish status.

Fixed-lens compacts should become normal lens records plus a fixed binding, not
special cases in app UI code. Example:

```text
camera: ricoh-gr-iii
lens: ricoh-gr-iii-fixed-18-3mm-f2-8
binding: fixed
```

## Aperture Curves

Replace single widest-aperture assumptions with aperture points:

```json
[
  { "focal": 24, "maxAperture": 1.8 },
  { "focal": 70, "maxAperture": 2.8 }
]
```

Primes use one point. Constant-aperture zooms use two equal points. Variable
zooms use wide and tele points at minimum, with optional intermediate points
when a source provides them. Recommendation code should evaluate the required
aperture at the requested focal length instead of using one `apMax` for the
whole zoom range.

## Cloudflare Architecture

Use Cloudflare first; keep Ploi or a VPS as a fallback only if source ingestion
needs long-running browser scraping or a larger relational database.

Proposed resources:

- Pages project: existing `compareblur`.
- D1 database: `compareblur-catalog`.
- R2 bucket: `compareblur-catalog`.
- Worker/Workflow: `compareblur-catalog-sync`.

R2 object layout:

```text
sources/{source}/{yyyy-mm-dd}/{hash}.json
exports/catalog.latest.json
exports/catalog.{runId}.json
reports/{runId}.json
```

D1 stores normalized records and run state. R2 stores immutable source snapshots
and generated app exports.

Use a scheduled Workflow when available because it gives durable multi-step
runs, retries, and clear step boundaries:

1. Fetch upstream source manifests and raw data.
2. Store raw snapshots in R2 with content hashes.
3. Transform each source into canonical records.
4. Apply curated overrides.
5. Validate invariants.
6. Write D1 in a transaction-friendly sequence.
7. Generate app export JSON.
8. Publish export to R2.
9. Record run summary and diff report.

If Workflows are too much for the first pass, start with a Worker Cron Trigger
and keep each step idempotent.

## Validation Rules

- Every camera must resolve to a known engine format or explicit sensor
  dimensions.
- Every lens must have at least one aperture point.
- Every variable-aperture zoom must have distinct wide and tele aperture points
  when source data provides a range.
- Every fixed-lens compact must have exactly one `fixed` binding unless it has
  documented conversion lenses.
- Generated app exports must be deterministic for the same source snapshots and
  overrides.
- License and attribution metadata must be carried through generated exports.

## Repo Integration

Current package layout:

```text
catalog/
  src/
    source-camera-database.mjs
    source-lensdb.mjs
    normalize.mjs
    normalize-lensdb.mjs
    full-catalog.mjs
    build.mjs
    check.mjs
    overrides/
workers/
  catalog-sync/
```

The app should consume catalog artifacts through `CatalogProvider` rather than
importing large generated datasets directly. During migration, keep small
fallback JSON assets checked in for deterministic builds, then prefer the
published R2 export once the Cloudflare sync path is proven.

### Implemented Local Slice

The initial local implementation lives in `catalog/src/`:

- `source-camera-database.mjs` fetches the live CameraDatabase JSON feed.
- `source-lensdb.mjs` fetches the live LensDB JSON feed.
- `normalize.mjs` converts selected fixed-lens compact cameras into canonical
  app camera, lens, and fixed-binding records.
- `normalize-lensdb.mjs` converts LensDB records into app `CatalogLens` records
  with aperture points.
- `overrides/curated-gear.mjs` holds project-curated bodies and lenses used by
  both the catalog pipeline and the app's emergency fallback seeds.
- `overrides/compact-cameras.mjs` adds curated film compact records such as
  Ricoh GR1/GR1s/GR1v.
- `full-catalog.mjs` assembles all sources into one export containing
  `cameras`, `lenses`, `bindings`, `compact`, and `stats`.
- `build.mjs` writes the full `app/public/catalog.fallback.json`.
- `check.mjs` validates required body cameras, compact cameras, LensDB lenses,
  curated lenses, aperture points, and fixed-lens invariants.

The local generated export currently contains 228 cameras, 794 lenses, and 69
fixed compact bindings.

### Cloudflare Sync Worker

The Cloudflare implementation lives in `workers/catalog-sync/`.

Resources:

- D1 database: `compareblur-catalog`
- R2 bucket: `compareblur-catalog`
- Worker: `compareblur-catalog-sync`

Routes:

- `GET /health` — unauthenticated liveness check.
- `GET /catalog/latest` — public generated catalog export from R2.
- `GET /admin/status` — admin-only settings, last run, and export metadata.
- `PATCH /admin/settings` — admin-only refresh settings.
- `POST /admin/refresh` — admin-only manual refresh trigger.

The Worker has a daily Cron Trigger but stores `refresh_interval_days` in D1.
Default is 30 days, so normal operation is monthly while still allowing the
admin UI to shorten or lengthen the interval without redeploying Worker config.

The deployed Worker currently publishes the same full export shape as the local
build script. The latest verified remote run was
`run-2026-06-28T23-48-23-340Z` with 228 cameras, 794 lenses, and 69 bindings.

Admin requests currently use a bearer token:

```http
Authorization: Bearer <CATALOG_ADMIN_TOKEN>
```

The deployed secret is `CATALOG_ADMIN_TOKEN`. The generated local copy for this
workspace is stored in `.context/catalog-admin-token.txt`, which is gitignored.
Do not put this token in the Vite bundle. The admin UI should either call these
endpoints from a trusted server/Admin Function or, later, replace this shared
token check with Auth0 JWT validation in the Worker.

Example admin calls:

```bash
TOKEN="$(tr -d '\n' < .context/catalog-admin-token.txt)"

curl -H "Authorization: Bearer $TOKEN" \
  https://compareblur-catalog-sync.christian-obe.workers.dev/admin/status

curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"refreshIntervalDays":30,"autoRefreshEnabled":true}' \
  https://compareblur-catalog-sync.christian-obe.workers.dev/admin/settings

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://compareblur-catalog-sync.christian-obe.workers.dev/admin/refresh
```

Public export:

```text
https://compareblur-catalog-sync.christian-obe.workers.dev/catalog/latest
```

## Cloudflare Access Check

Verified from this workspace on 2026-06-28:

- Wrangler OAuth is active for account `Lightpilot LTD`.
- `wrangler pages project list` can see `compareblur` with
  `compareblur.pages.dev` and `blur.lightpilot.co`.
- D1 database `compareblur-catalog` exists.
- R2 bucket `compareblur-catalog` exists.
- Worker `compareblur-catalog-sync` is deployed at
  `https://compareblur-catalog-sync.christian-obe.workers.dev`.

The root catalog Worker scripts use `npx wrangler@latest` so they do not depend
on a global Wrangler install.

## Implementation Phases

1. Add JSON schema validation for the full export shape.
2. Add Lensfun compact enrichment/cross-check.
3. Persist normalized records into D1 tables, not just run metadata and R2
   exports.
4. Add source diff reports for admin review.
5. Replace bearer-token admin calls with Auth0/Access-backed server-side auth.
