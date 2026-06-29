import type { Camera, CatalogLens } from '../lib/gear';
import {
  LEGACY_CAMERAS as CATALOG_LEGACY_CAMERAS,
  LEGACY_LENSES as CATALOG_LEGACY_LENSES,
} from '../../../catalog/src/overrides/curated-gear.mjs';

export const LEGACY_CAMERAS: Camera[] = CATALOG_LEGACY_CAMERAS as Camera[];
export const LEGACY_LENSES: CatalogLens[] = CATALOG_LEGACY_LENSES as CatalogLens[];
