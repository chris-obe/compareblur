import type { Lens } from '../lib/types';

export const KIT_SEED: Lens[] = [
  {
    id: 'k-50-18',
    name: '50mm ƒ/1.8',
    type: 'prime',
    focalMin: 50,
    focalMax: 50,
    apMax: 1.8,
    apMin: 22,
    mount: 'E',
    formatId: 'ff',
  },
  {
    id: 'k-2470-28',
    name: '24–70mm ƒ/2.8',
    type: 'zoom',
    focalMin: 24,
    focalMax: 70,
    apMax: 2.8,
    apMin: 22,
    mount: 'E',
    formatId: 'ff',
  },
  {
    id: 'k-35-2',
    name: '35mm ƒ/2',
    type: 'prime',
    focalMin: 35,
    focalMax: 35,
    apMax: 2,
    apMin: 16,
    mount: 'E',
    formatId: 'ff',
  },
];
