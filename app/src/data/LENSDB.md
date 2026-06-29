# Lens catalog attribution

Lens data is ingested by the catalog orchestration pipeline from **LensDB**:

- Source: https://github.com/Luminoid/lens-db (lens.luminoid.dev)
- License: **CC BY-NC-SA 4.0** (Attribution, NonCommercial, ShareAlike)

The pipeline fetches LensDB during catalog refresh, transforms records into the
app's `CatalogLens` shape, and publishes them inside the generated full catalog
export (`/catalog/latest` in Cloudflare and `app/public/catalog.fallback.json`
locally). Do not maintain a separate app-local LensDB JSON copy.

Camera bodies and project-curated lenses live in `catalog/src/overrides` and are
project data, not LensDB data.
