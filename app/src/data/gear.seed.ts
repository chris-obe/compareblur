import type { Camera, CatalogLens } from '../lib/gear';
import { LENSDB_LENSES } from '../lib/lensdb';

// Camera bodies are curated here (LensDB is lenses-only). Mounts: E (Sony),
// Z (Nikon), RF (Canon), L (L-mount), X (Fuji APS-C), G (Fuji GFX), MFT.
export const CAMERAS: Camera[] = [
  { id: 'sony-a7iv', name: 'Sony α7 IV', maker: 'Sony', mount: 'E', formatId: 'ff' },
  { id: 'sony-a1', name: 'Sony α1', maker: 'Sony', mount: 'E', formatId: 'ff' },
  { id: 'sony-a6700', name: 'Sony α6700', maker: 'Sony', mount: 'E', formatId: 'apsc' },
  { id: 'nikon-z6iii', name: 'Nikon Z6 III', maker: 'Nikon', mount: 'Z', formatId: 'ff' },
  { id: 'nikon-z8', name: 'Nikon Z8', maker: 'Nikon', mount: 'Z', formatId: 'ff' },
  { id: 'nikon-zfc', name: 'Nikon Z fc', maker: 'Nikon', mount: 'Z', formatId: 'apsc' },
  { id: 'canon-r6ii', name: 'Canon EOS R6 II', maker: 'Canon', mount: 'RF', formatId: 'ff' },
  { id: 'canon-r5ii', name: 'Canon EOS R5 II', maker: 'Canon', mount: 'RF', formatId: 'ff' },
  { id: 'canon-r7', name: 'Canon EOS R7', maker: 'Canon', mount: 'RF', formatId: 'apsc-canon' },
  { id: 'pana-s5ii', name: 'Panasonic Lumix S5 II', maker: 'Panasonic', mount: 'L', formatId: 'ff' },
  { id: 'leica-sl3', name: 'Leica SL3', maker: 'Leica', mount: 'L', formatId: 'ff' },
  { id: 'sigma-fp', name: 'Sigma fp', maker: 'Sigma', mount: 'L', formatId: 'ff' },
  { id: 'fuji-xt5', name: 'Fujifilm X-T5', maker: 'Fujifilm', mount: 'X', formatId: 'apsc' },
  { id: 'fuji-xh2', name: 'Fujifilm X-H2', maker: 'Fujifilm', mount: 'X', formatId: 'apsc' },
  { id: 'fuji-gfx100ii', name: 'Fujifilm GFX100 II', maker: 'Fujifilm', mount: 'G', formatId: 'gfx' },
  { id: 'om-1', name: 'OM System OM-1', maker: 'OM System', mount: 'MFT', formatId: 'mft' },
];

// Curated Fujifilm GF (medium format) lenses — LensDB has no G mount, so GFX
// bodies would otherwise show nothing.
const GF_LENSES: CatalogLens[] = [
  { id: 'gf-63-28', name: 'GF 63mm F2.8 R WR', maker: 'Fujifilm', type: 'prime', focalMin: 63, focalMax: 63, apMax: 2.8, apMin: 32, mounts: ['G'], coversFormatIds: ['gfx'], af: true, thirdParty: false },
  { id: 'gf-110-2', name: 'GF 110mm F2 R LM WR', maker: 'Fujifilm', type: 'prime', focalMin: 110, focalMax: 110, apMax: 2, apMin: 22, mounts: ['G'], coversFormatIds: ['gfx'], af: true, thirdParty: false },
  { id: 'gf-3264-4', name: 'GF 32-64mm F4 R LM WR', maker: 'Fujifilm', type: 'zoom', focalMin: 32, focalMax: 64, apMax: 4, apMin: 32, mounts: ['G'], coversFormatIds: ['gfx'], af: true, thirdParty: false },
  { id: 'gf-250-4', name: 'GF 250mm F4 R LM OIS WR', maker: 'Fujifilm', type: 'prime', focalMin: 250, focalMax: 250, apMax: 4, apMin: 32, mounts: ['G'], coversFormatIds: ['gfx'], af: true, thirdParty: false },
];

export const LENSES: CatalogLens[] = [...LENSDB_LENSES, ...GF_LENSES];
