import type { Camera, CatalogLens } from '../lib/gear';
import { BODY_CAMERAS, CURATED_LENSES } from '../../../catalog/src/overrides/curated-gear.mjs';

// Emergency fallback only. The primary catalog surface is loaded at runtime from
// the generated Cloudflare/local catalog export.
export const CAMERAS: Camera[] = BODY_CAMERAS as Camera[];

export const LENSES: CatalogLens[] = CURATED_LENSES as CatalogLens[];
