import type { Kit, OwnedCamera, OwnedLens } from '../lib/types';

// A small starter kit so the verdict + Compare "From Kit" have something to
// work with. Users edit it on the My Kit screen (persisted to localStorage).
const a7iv: OwnedCamera = {
  id: 'seed-cam-a7iv',
  catalogId: 'sony-a7iv',
  name: 'Sony α7 IV',
  maker: 'Sony',
  mount: 'E',
  formatId: 'ff',
};

const lens = (
  id: string, catalogId: string, name: string, type: 'prime' | 'zoom',
  focalMin: number, focalMax: number, apMax: number,
): OwnedLens => ({
  id, catalogId, name, maker: 'Sony', type, focalMin, focalMax, apMax, apMin: 22,
  mount: 'E', coversFormatIds: ['ff', 'apsc', 'apsc-canon', 'film-135'], af: true,
});

export const KIT_SEED: Kit = {
  cameras: [a7iv],
  lenses: [
    lens('seed-lens-50', 'sony-fe-50-14gm', 'Sony FE 50mm F1.4 GM', 'prime', 50, 50, 1.4),
    lens('seed-lens-2470', 'sony-fe-2470gm2', 'Sony FE 24-70mm F2.8 GM II', 'zoom', 24, 70, 2.8),
  ],
};
