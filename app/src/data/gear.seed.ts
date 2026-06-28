import type { CatalogLens } from '../lib/gear';
import { LENSDB_LENSES } from '../lib/lensdb';

// Camera bodies live in cameras.seed.ts (a comprehensive mirrorless dataset);
// re-exported here so existing imports keep working.
export { CAMERAS } from './cameras.seed';

// Curated Fujifilm GF (medium format) lenses — LensDB has no G mount, so GFX
// bodies would otherwise show nothing.
const GF_LENSES: CatalogLens[] = [
  { id: 'gf-63-28', name: 'GF 63mm F2.8 R WR', maker: 'Fujifilm', type: 'prime', focalMin: 63, focalMax: 63, apMax: 2.8, apMin: 32, mounts: ['G'], coversFormatIds: ['gfx'], af: true, thirdParty: false },
  { id: 'gf-110-2', name: 'GF 110mm F2 R LM WR', maker: 'Fujifilm', type: 'prime', focalMin: 110, focalMax: 110, apMax: 2, apMin: 22, mounts: ['G'], coversFormatIds: ['gfx'], af: true, thirdParty: false },
  { id: 'gf-3264-4', name: 'GF 32-64mm F4 R LM WR', maker: 'Fujifilm', type: 'zoom', focalMin: 32, focalMax: 64, apMax: 4, apMin: 32, mounts: ['G'], coversFormatIds: ['gfx'], af: true, thirdParty: false },
  { id: 'gf-250-4', name: 'GF 250mm F4 R LM OIS WR', maker: 'Fujifilm', type: 'prime', focalMin: 250, focalMax: 250, apMax: 4, apMin: 32, mounts: ['G'], coversFormatIds: ['gfx'], af: true, thirdParty: false },
];

export const LENSES: CatalogLens[] = [...LENSDB_LENSES, ...GF_LENSES];
