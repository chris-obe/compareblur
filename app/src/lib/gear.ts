import { getFormat, type Format } from './engine';

// A camera body: its lens mount + sensor format (the format gives the crop
// factor via the engine). Modeled to match lensfun's maker/model/mount/crop.
export interface Camera {
  id: string;
  name: string;
  maker: string;
  mount: string;
  formatId: string;
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
  mounts: string[];
  coversFormatIds: string[];
  af: boolean;
  thirdParty: boolean;
  // reserved for the future "cheapest / AF lens to get this look" feature:
  // usd = current street price, msrpUsd = new/launch price (lower/upper bounds).
  price?: { usd?: number; msrpUsd?: number };
}

export function cameraFormat(cam: Camera): Format {
  return getFormat(cam.formatId);
}

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
