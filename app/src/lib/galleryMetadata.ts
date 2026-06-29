import { extractExif } from './exif';
import {
  lensesForCamera,
  maxApertureAtFocal,
  type Camera,
  type CatalogLens,
} from './gear';

export type MetadataConfidence = 'exact' | 'likely' | 'fallback' | 'none';

export interface GalleryMetadataSuggestion {
  title: string;
  formatId: string;
  camera: string;
  cameraCatalogId?: string;
  cameraConfidence: MetadataConfidence;
  lens: string;
  lensCatalogId?: string;
  lensConfidence: MetadataConfidence;
  focal: number;
  aperture: number;
  width?: number;
  height?: number;
  source: {
    exif: {
      make?: string;
      model?: string;
      lensModel?: string;
      focal?: number;
      focal35?: number;
      aperture?: number;
      guessedFormat: boolean;
    };
    cameraMatch?: {
      id: string;
      confidence: MetadataConfidence;
      reason: string;
    };
    lensMatch?: {
      id: string;
      confidence: MetadataConfidence;
      reason: string;
    };
  };
}

interface Scored<T> {
  item: T;
  score: number;
}

export async function suggestGalleryMetadata(
  file: File,
  cameras: Camera[],
  lenses: CatalogLens[],
): Promise<GalleryMetadataSuggestion> {
  const exif = await extractExif(file);
  const title = titleFromFile(file.name);
  const focal = exif.focal ?? exif.focal35 ?? 50;
  const aperture = exif.aperture ?? 1.8;
  const cameraInput = [exif.make, exif.model].filter(Boolean).join(' ').trim();
  const cameraMatch = matchCamera(cameraInput, cameras);
  const candidateLenses = cameraMatch.item ? lensesForCamera(cameraMatch.item, lenses) : lenses;
  const lensMatch = matchLens(exif.lensModel, focal, aperture, candidateLenses);

  const camera = cameraMatch.item;
  const lens = lensMatch.item;
  const formatId = camera?.formatId ?? exif.format.id;

  return {
    title,
    formatId,
    camera: camera?.name ?? (cameraInput || 'Unknown camera'),
    cameraCatalogId: camera?.id,
    cameraConfidence: cameraMatch.confidence,
    lens: lens?.name ?? exif.lensModel ?? `${Math.round(focal)}mm`,
    lensCatalogId: lens?.id,
    lensConfidence: lensMatch.confidence,
    focal,
    aperture,
    width: exif.width,
    height: exif.height,
    source: {
      exif: {
        make: exif.make,
        model: exif.model,
        lensModel: exif.lensModel,
        focal: exif.focal,
        focal35: exif.focal35,
        aperture: exif.aperture,
        guessedFormat: exif.guessedFormat,
      },
      cameraMatch: camera
        ? {
            id: camera.id,
            confidence: cameraMatch.confidence,
            reason: cameraMatch.reason,
          }
        : undefined,
      lensMatch: lens
        ? {
            id: lens.id,
            confidence: lensMatch.confidence,
            reason: lensMatch.reason,
          }
        : undefined,
    },
  };
}

function matchCamera(input: string, cameras: Camera[]): {
  item?: Camera;
  confidence: MetadataConfidence;
  reason: string;
} {
  const normalized = normalize(input);
  if (!normalized) return { confidence: 'none', reason: 'No EXIF camera make/model' };

  const exact = cameras.find((camera) => cameraKeys(camera).some((key) => key === normalized));
  if (exact) return { item: exact, confidence: 'exact', reason: 'EXIF make/model matched catalog camera' };

  const scored = bestScore(cameras, (camera) => Math.max(...cameraKeys(camera).map((key) => tokenScore(normalized, key))));
  if (scored && scored.score >= 0.62) {
    return { item: scored.item, confidence: 'likely', reason: 'EXIF make/model was close to catalog camera' };
  }

  return { confidence: 'none', reason: 'No catalog camera match' };
}

function matchLens(
  lensModel: string | undefined,
  focal: number,
  aperture: number,
  lenses: CatalogLens[],
): {
  item?: CatalogLens;
  confidence: MetadataConfidence;
  reason: string;
} {
  const normalized = normalize(lensModel ?? '');
  if (normalized) {
    const exact = lenses.find((lens) => lensKeys(lens).some((key) => key === normalized));
    if (exact) return { item: exact, confidence: 'exact', reason: 'EXIF lens model matched catalog lens' };

    const scored = bestScore(lenses, (lens) => Math.max(...lensKeys(lens).map((key) => tokenScore(normalized, key))));
    if (scored && scored.score >= 0.58) {
      return { item: scored.item, confidence: 'likely', reason: 'EXIF lens model was close to catalog lens' };
    }
  }

  const compatible = lenses.filter((lens) => focal >= lens.focalMin && focal <= lens.focalMax);
  const apertureCompatible = compatible.filter((lens) => maxApertureAtFocal(lens, focal) <= aperture + 0.2);
  const fallback = apertureCompatible[0] ?? compatible[0];
  if (fallback) return { item: fallback, confidence: 'fallback', reason: 'Matched by focal length and aperture' };

  return { confidence: 'none', reason: lensModel ? 'No catalog lens match' : 'No EXIF lens model' };
}

function cameraKeys(camera: Camera): string[] {
  return unique([camera.name, `${camera.maker} ${camera.name}`, camera.name.replace(camera.maker, '')].map(normalize));
}

function lensKeys(lens: CatalogLens): string[] {
  return unique([lens.name, `${lens.maker} ${lens.name}`, lens.name.replace(lens.maker, '')].map(normalize));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ƒ/g, 'f')
    .replace(/\bf\s*\/\s*/g, 'f')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.86;

  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  const overlap = [...aTokens].filter((token) => bTokens.has(token)).length;
  const total = new Set([...aTokens, ...bTokens]).size;
  return total === 0 ? 0 : overlap / total;
}

function bestScore<T>(items: T[], score: (item: T) => number): Scored<T> | null {
  let best: Scored<T> | null = null;
  for (const item of items) {
    const next = score(item);
    if (!best || next > best.score) best = { item, score: next };
  }
  return best;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function titleFromFile(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
