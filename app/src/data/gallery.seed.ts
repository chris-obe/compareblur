import type { GalleryItem } from '../lib/types';

// Placeholder imagery via picsum (grayscale handled by CSS, color on hover).
// Seeded by a fixed id so the set is stable across reloads.
const img = (seed: string, w = 800, h = 800) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const GALLERY_SEED: GalleryItem[] = [
  {
    id: 'g1', title: 'Window Light', author: 'A. Lindqvist', src: img('hmb-portrait-1', 800, 1000),
    formatId: 'ff', camera: 'Sony A7 IV', lens: '85mm ƒ/1.4', focal: 85, aperture: 1.4,
    tags: ['portrait', 'bokeh', 'indoor'],
  },
  {
    id: 'g2', title: 'Crossing', author: 'M. Berg', src: img('hmb-street-1', 800, 800),
    formatId: 'apsc', camera: 'Fujifilm X-T5', lens: '23mm ƒ/2', focal: 23, aperture: 2,
    tags: ['street', 'urban'],
  },
  {
    id: 'g3', title: 'Coastal Sweep', author: 'J. Holm', src: img('hmb-pano-1', 1200, 480),
    formatId: 'xpan', camera: 'Hasselblad XPan', lens: '90mm ƒ/4', focal: 90, aperture: 4,
    tags: ['panorama', 'landscape', 'film'],
  },
  {
    id: 'g4', title: 'Studio Still', author: 'C. Obe', src: img('hmb-mf-1', 900, 1100),
    formatId: 'gfx', camera: 'Fujifilm GFX 100', lens: '110mm ƒ/2', focal: 110, aperture: 2,
    tags: ['portrait', 'studio', 'bokeh'],
  },
  {
    id: 'g5', title: 'Morning Run', author: 'S. Falk', src: img('hmb-mft-1', 800, 800),
    formatId: 'mft', camera: 'OM-1', lens: '45mm ƒ/1.8', focal: 45, aperture: 1.8,
    tags: ['sport', 'outdoor'],
  },
  {
    id: 'g6', title: 'Dunes', author: 'L. Norén', src: img('hmb-617-1', 1400, 460),
    formatId: 'film-617', camera: 'Fuji GX617', lens: '105mm ƒ/8', focal: 105, aperture: 8,
    tags: ['panorama', 'landscape', 'film'],
  },
  {
    id: 'g7', title: 'Quiet Table', author: 'A. Lindqvist', src: img('hmb-still-1', 800, 800),
    formatId: 'ff', camera: 'Nikon Z6', lens: '50mm ƒ/1.8', focal: 50, aperture: 1.8,
    tags: ['still life', 'minimal'],
  },
  {
    id: 'g8', title: 'Rooftops', author: 'M. Berg', src: img('hmb-street-2', 800, 1000),
    formatId: 'film-67', camera: 'Pentax 67', lens: '105mm ƒ/2.4', focal: 105, aperture: 2.4,
    tags: ['film', 'landscape', 'bokeh'],
  },
  {
    id: 'g9', title: 'Backlit', author: 'J. Holm', src: img('hmb-portrait-2', 800, 1000),
    formatId: 'ff', camera: 'Canon R5', lens: '135mm ƒ/1.8', focal: 135, aperture: 1.8,
    tags: ['portrait', 'bokeh', 'outdoor'],
  },
  {
    id: 'g10', title: 'Market', author: 'S. Falk', src: img('hmb-street-3', 800, 800),
    formatId: 'apsc', camera: 'Fujifilm X100VI', lens: '23mm ƒ/2', focal: 23, aperture: 2,
    tags: ['street', 'urban', 'travel'],
  },
  {
    id: 'g11', title: 'Cold Field', author: 'L. Norén', src: img('hmb-land-1', 900, 700),
    formatId: 'film-45', camera: 'Sinar 4×5', lens: '150mm ƒ/5.6', focal: 150, aperture: 5.6,
    tags: ['landscape', 'film', 'large format'],
  },
  {
    id: 'g12', title: 'Glass', author: 'C. Obe', src: img('hmb-min-1', 800, 800),
    formatId: 'ff', camera: 'Sony A7 IV', lens: '90mm ƒ/2.8 Macro', focal: 90, aperture: 2.8,
    tags: ['macro', 'minimal', 'still life'],
  },
];

export const ALL_TAGS: string[] = [...new Set(GALLERY_SEED.flatMap((g) => g.tags))].sort();
