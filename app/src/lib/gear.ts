import { getFormat, type Format } from './engine';

// A camera body: its lens mount + sensor format (the format gives the crop
// factor via the engine). Modeled to match lensfun's maker/model/mount/crop.
export interface Camera {
  id: string;
  name: string;
  maker: string;
  mount: string;
  formatId: string;
  fixedLensId?: string;
  source?: string;
  sourceType?: 'external' | 'curated' | 'derived';
  sources?: CatalogSourceRef[];
  curatedReason?: string;
  derivedFrom?: string[];
  year?: number;
}

export interface AperturePoint {
  focal: number;
  maxAperture: number;
}

// A catalog lens. `mounts` lists every mount it's sold in (third parties ship
// the same optic in several), and `coversFormatIds` is the set of sensor
// formats whose image circle it covers — together these scope which lenses are
// available for a given body. `af` and `price` are reserved for the future
// "cheapest / autofocus lens to get this look" feature.
export interface CatalogLens {
  id: string;
  name: string;
  maker: string;
  type: 'prime' | 'zoom';
  focalMin: number;
  focalMax: number; // == focalMin for primes
  apMax: number; // widest aperture (smaller number)
  apMin: number;
  aperturePoints?: AperturePoint[];
  mounts: string[];
  coversFormatIds: string[];
  af: boolean;
  thirdParty: boolean;
  fixed?: boolean;
  source?: string;
  sourceType?: 'external' | 'curated' | 'derived';
  sources?: CatalogSourceRef[];
  curatedReason?: string;
  derivedFrom?: string[];
  // reserved for the future "cheapest / AF lens to get this look" feature:
  // usd = current street price, msrpUsd = new/launch price (lower/upper bounds).
  price?: { usd?: number; msrpUsd?: number };
}

export interface CatalogSourceRef {
  id: string;
  recordId?: string;
  url?: string;
  license?: string;
  fetchedAt?: string;
  confidence?: number;
  fields?: string[];
}

export function cameraFormat(cam: Camera): Format {
  return getFormat(cam.formatId);
}

// Friendly names for mount codes, for the kit's mount group headers.
export const MOUNT_LABELS: Record<string, string> = {
  E: 'Sony E', RF: 'Canon RF', Z: 'Nikon Z', L: 'L-Mount', X: 'Fujifilm X',
  G: 'Fujifilm G', MFT: 'Micro Four Thirds', M: 'Leica M', EF: 'Canon EF',
  F: 'Nikon F', K: 'Pentax K', A: 'Sony / Minolta A', HV: 'Hasselblad V',
  M645: 'Mamiya 645', P67: 'Pentax 67',
};
export const mountLabel = (mount: string): string =>
  mount.startsWith('fixed-') ? 'Fixed-lens compact' : (MOUNT_LABELS[mount] ?? mount);

// Lenses available for a body: right mount AND its image circle covers the
// body's sensor format. Sorted by maker then focal for a sane dropdown.
export function lensesForCamera(cam: Camera, lenses: CatalogLens[]): CatalogLens[] {
  return lenses
    .filter((l) => l.mounts.includes(cam.mount) && l.coversFormatIds.includes(cam.formatId))
    .sort((a, b) => a.maker.localeCompare(b.maker) || a.focalMin - b.focalMin);
}

// A sensible default focal for a lens (primes: the focal; zooms: the wide end).
export function defaultFocal(l: CatalogLens): number {
  return l.focalMin;
}

export function maxApertureAtFocal(
  lens: Pick<CatalogLens, 'apMax' | 'aperturePoints'>,
  focal: number,
): number {
  const points = [...(lens.aperturePoints ?? [])].sort((a, b) => a.focal - b.focal);
  if (points.length === 0) return lens.apMax;
  if (focal <= points[0].focal) return points[0].maxAperture;
  const last = points[points.length - 1];
  if (focal >= last.focal) return last.maxAperture;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (focal <= b.focal) {
      const t = (focal - a.focal) / (b.focal - a.focal || 1);
      return Math.round((a.maxAperture + (b.maxAperture - a.maxAperture) * t) * 10) / 10;
    }
  }
  return lens.apMax;
}

export function apertureRangeLabel(lens: Pick<CatalogLens, 'apMax' | 'apMin' | 'aperturePoints'>): string {
  const points = lens.aperturePoints ?? [];
  const widest = points.length ? Math.min(...points.map((p) => p.maxAperture)) : lens.apMax;
  const slowest = points.length ? Math.max(...points.map((p) => p.maxAperture)) : lens.apMax;
  return widest === slowest ? `ƒ/${widest}` : `ƒ/${widest}–${slowest}`;
}

// Lenses for a mount whose image circle covers at least one of the given sensor
// formats (the formats of the bodies owned on that mount). Sorted maker, focal.
export function lensesForMount(
  mount: string,
  formatIds: Set<string>,
  lenses: CatalogLens[],
): CatalogLens[] {
  return lenses
    .filter((l) => l.mounts.includes(mount) && l.coversFormatIds.some((f) => formatIds.has(f)))
    .sort((a, b) => a.maker.localeCompare(b.maker) || a.focalMin - b.focalMin);
}
