import type { Camera, CatalogLens } from '../lib/gear';

// Representative seed — not exhaustive. Schema matches lensfun (maker/model/
// mount/format), so the full lensfun catalog can be imported later. Mounts:
// E (Sony), Z (Nikon), RF (Canon), X (Fuji APS-C), G (Fuji GFX), L (L-mount),
// MFT (Micro Four Thirds).

export const CAMERAS: Camera[] = [
  { id: 'sony-a7iv', name: 'Sony α7 IV', maker: 'Sony', mount: 'E', formatId: 'ff' },
  { id: 'sony-a6700', name: 'Sony α6700', maker: 'Sony', mount: 'E', formatId: 'apsc' },
  { id: 'nikon-z6iii', name: 'Nikon Z6 III', maker: 'Nikon', mount: 'Z', formatId: 'ff' },
  { id: 'nikon-zfc', name: 'Nikon Z fc', maker: 'Nikon', mount: 'Z', formatId: 'apsc' },
  { id: 'canon-r6ii', name: 'Canon EOS R6 II', maker: 'Canon', mount: 'RF', formatId: 'ff' },
  { id: 'canon-r7', name: 'Canon EOS R7', maker: 'Canon', mount: 'RF', formatId: 'apsc-canon' },
  { id: 'pana-s5ii', name: 'Panasonic Lumix S5 II', maker: 'Panasonic', mount: 'L', formatId: 'ff' },
  { id: 'fuji-xt5', name: 'Fujifilm X-T5', maker: 'Fujifilm', mount: 'X', formatId: 'apsc' },
  { id: 'fuji-gfx100ii', name: 'Fujifilm GFX100 II', maker: 'Fujifilm', mount: 'G', formatId: 'gfx' },
  { id: 'om-1', name: 'OM System OM-1', maker: 'OM System', mount: 'MFT', formatId: 'mft' },
];

const ff = ['ff', 'apsc', 'apsc-canon']; // a full-frame image circle also covers APS-C bodies
const prime = (
  id: string, name: string, maker: string, focal: number, apMax: number,
  mounts: string[], coversFormatIds: string[],
  opts: Partial<CatalogLens> = {},
): CatalogLens => ({
  id, name, maker, type: 'prime', focalMin: focal, focalMax: focal, apMax, apMin: 16,
  mounts, coversFormatIds, af: true, thirdParty: false, ...opts,
});
const zoom = (
  id: string, name: string, maker: string, fMin: number, fMax: number, apMax: number,
  mounts: string[], coversFormatIds: string[],
  opts: Partial<CatalogLens> = {},
): CatalogLens => ({
  id, name, maker, type: 'zoom', focalMin: fMin, focalMax: fMax, apMax, apMin: 22,
  mounts, coversFormatIds, af: true, thirdParty: false, ...opts,
});

export const LENSES: CatalogLens[] = [
  // Sony FE (full frame)
  prime('sony-fe-50-14gm', 'FE 50mm F1.4 GM', 'Sony', 50, 1.4, ['E'], ff),
  prime('sony-fe-85-14gm', 'FE 85mm F1.4 GM', 'Sony', 85, 1.4, ['E'], ff),
  zoom('sony-fe-2470gm2', 'FE 24-70mm F2.8 GM II', 'Sony', 24, 70, 2.8, ['E'], ff),
  // Sony E (APS-C only)
  zoom('sony-e-1655g', 'E 16-55mm F2.8 G', 'Sony', 16, 55, 2.8, ['E'], ['apsc']),
  // Nikon Z
  prime('nikon-z-50-18s', 'NIKKOR Z 50mm f/1.8 S', 'Nikon', 50, 1.8, ['Z'], ff),
  prime('nikon-z-85-12s', 'NIKKOR Z 85mm f/1.2 S', 'Nikon', 85, 1.2, ['Z'], ff),
  zoom('nikon-z-2470s', 'NIKKOR Z 24-70mm f/2.8 S', 'Nikon', 24, 70, 2.8, ['Z'], ff),
  // Canon RF
  prime('canon-rf-50-12l', 'RF 50mm F1.2 L', 'Canon', 50, 1.2, ['RF'], ff),
  prime('canon-rf-85-2', 'RF 85mm F2 Macro', 'Canon', 85, 2, ['RF'], ff),
  // Panasonic L
  prime('lumix-s-50-18', 'LUMIX S 50mm F1.8', 'Panasonic', 50, 1.8, ['L'], ff),
  // Fujifilm X (APS-C)
  prime('fuji-xf-35-14', 'XF 35mm F1.4 R', 'Fujifilm', 35, 1.4, ['X'], ['apsc']),
  prime('fuji-xf-56-12', 'XF 56mm F1.2 R', 'Fujifilm', 56, 1.2, ['X'], ['apsc']),
  // Fujifilm GFX (medium format)
  prime('fuji-gf-110-2', 'GF 110mm F2 R LM WR', 'Fujifilm', 110, 2, ['G'], ['gfx']),
  // Micro Four Thirds
  prime('om-45-18', 'M.Zuiko 45mm F1.8', 'OM System', 45, 1.8, ['MFT'], ['mft']),
  prime('om-25-12', 'M.Zuiko 25mm F1.2 PRO', 'OM System', 25, 1.2, ['MFT'], ['mft']),
  // Third parties (multi-mount, scoped by `mounts`)
  prime('sigma-35-14dgdn', 'Sigma 35mm F1.4 DG DN Art', 'Sigma', 35, 1.4, ['E', 'L'], ff, { thirdParty: true }),
  prime('sigma-85-14dgdn', 'Sigma 85mm F1.4 DG DN Art', 'Sigma', 85, 1.4, ['E', 'L'], ff, { thirdParty: true }),
  zoom('tamron-2875g2', 'Tamron 28-75mm F2.8 G2', 'Tamron', 28, 75, 2.8, ['E', 'Z'], ff, { thirdParty: true }),
  prime('viltrox-56-14', 'Viltrox 56mm F1.4', 'Viltrox', 56, 1.4, ['X', 'Z', 'E'], ['apsc'], { thirdParty: true }),
  prime('samyang-35-14', 'Samyang 35mm F1.4 (MF)', 'Samyang', 35, 1.4, ['E'], ff, { af: false, thirdParty: true }),
];
