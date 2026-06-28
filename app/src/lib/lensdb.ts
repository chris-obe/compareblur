import lensesRaw from '../data/lensdb.lenses.json';
import type { CatalogLens } from './gear';

// LensDB (github.com/Luminoid/lens-db) — vendored, trimmed. CC BY-NC-SA 4.0.
interface LensDbRecord {
  id: string;
  brand: string;
  model: string;
  series?: string | null;
  mounts: string[];
  format: string;
  lensType: 'Prime' | 'Zoom';
  focalMin: number;
  focalMax: number;
  apertureMaxWide: number;
  apertureMin?: number | null;
  autofocus?: boolean | null;
  priceUSD?: number | null;
  priceMSRPUSD?: number | null;
}

const MOUNT_MAP: Record<string, string> = {
  'Sony E': 'E',
  'Canon RF': 'RF',
  'Nikon Z': 'Z',
  'L-Mount': 'L',
  'Fujifilm X': 'X',
  'Micro Four Thirds': 'MFT',
  'Leica M': 'M',
};

// A lens's image circle covers these sensor formats (used to scope by body).
const COVERAGE: Record<string, string[]> = {
  // 35mm film (film-135) is 36×24 like full frame, so FF lenses cover it too.
  'Full Frame': ['ff', 'apsc', 'apsc-canon', 'film-135'],
  'APS-C': ['apsc', 'apsc-canon'],
  MFT: ['mft'],
  'Medium Format': ['gfx'],
};

const THIRD_PARTY = new Set([
  'Sigma', 'Tamron', 'Samyang', 'Zeiss', 'Viltrox', 'Voigtländer', 'Voigtlander',
  'Laowa', 'Tokina', 'Rokinon', 'TTArtisan', '7Artisans', 'Meike', 'Yongnuo',
  'Cosina', 'Venus Optics', 'Lensbaby',
]);

function toLens(r: LensDbRecord): CatalogLens {
  const mounts = r.mounts.map((m) => MOUNT_MAP[m]).filter(Boolean) as string[];
  const price =
    r.priceUSD != null || r.priceMSRPUSD != null
      ? { usd: r.priceUSD ?? undefined, msrpUsd: r.priceMSRPUSD ?? undefined }
      : undefined;
  return {
    id: r.id,
    name: r.model,
    maker: r.brand,
    type: r.lensType === 'Zoom' ? 'zoom' : 'prime',
    focalMin: r.focalMin,
    focalMax: r.focalMax,
    apMax: r.apertureMaxWide,
    apMin: r.apertureMin ?? 22,
    mounts,
    coversFormatIds: COVERAGE[r.format] ?? [],
    af: r.autofocus !== false,
    thirdParty: THIRD_PARTY.has(r.brand),
    price,
  };
}

// Built once at module load. Drop any record whose mounts we don't map.
export const LENSDB_LENSES: CatalogLens[] = (lensesRaw as LensDbRecord[])
  .map(toLens)
  .filter((l) => l.mounts.length > 0 && l.coversFormatIds.length > 0);
