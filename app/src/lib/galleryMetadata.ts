import { extractExif } from './exif';
import {
  cameraFormat,
  lensesForCamera,
  maxApertureAtFocal,
  type Camera,
  type CatalogLens,
} from './gear';
import { isPhoneMake } from './devices';
import { canonicalGalleryFormat } from './galleryFormat';
import type { Format } from './engine';

export type MetadataConfidence = 'exact' | 'compatible' | 'none';

export interface GalleryMetadataSuggestion {
  title: string;
  formatId: string;
  format: Format;
  camera: string;
  cameraCatalogId?: string;
  cameraConfidence: MetadataConfidence;
  lens: string;
  lensCatalogId?: string;
  lensConfidence: MetadataConfidence;
  focal: number;
  aperture: number;
  shutterSpeed?: string;
  iso?: number;
  capturedAt?: string;
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
      shutterSpeed?: string;
      iso?: number;
      capturedAt?: string;
      detectedFormatId?: string;
      detectedFormatName?: string;
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
  const detectedFormat = camera ? cameraFormat(camera) : exif.format;
  const format = canonicalGalleryFormat(detectedFormat, {
    preferredFamily: isPhoneMake(exif.make) ? 'phone' : undefined,
  });
  const formatId = format.id;

  return {
    title,
    formatId,
    format,
    camera: camera?.name ?? (cameraInput || 'Unknown camera'),
    cameraCatalogId: camera?.id,
    cameraConfidence: cameraMatch.confidence,
    lens: lens?.name ?? exif.lensModel ?? `${Math.round(focal)}mm`,
    lensCatalogId: lens?.id,
    lensConfidence: lensMatch.confidence,
    focal,
    aperture,
    shutterSpeed: exif.shutterSpeed,
    iso: exif.iso,
    capturedAt: exif.capturedAt,
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
        shutterSpeed: exif.shutterSpeed,
        iso: exif.iso,
        capturedAt: exif.capturedAt,
        detectedFormatId: detectedFormat.id,
        detectedFormatName: detectedFormat.name,
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

  return { confidence: 'none', reason: 'No exact catalog camera match' };
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
  const targetAperture = apertureFromLensModel(lensModel) ?? aperture;
  if (normalized) {
    const exact = lenses.find((lens) => lensKeys(lens).some((key) => key === normalized));
    if (exact) return { item: exact, confidence: 'exact', reason: 'EXIF lens model matched catalog lens' };
  }

  const compatible = lenses.filter((lens) => {
    if (focal < lens.focalMin || focal > lens.focalMax) return false;
    return Math.abs(maxApertureAtFocal(lens, focal) - targetAperture) <= 0.1;
  });
  const fallback = compatible[0];
  if (fallback) return { item: fallback, confidence: 'compatible', reason: 'Matched by exact focal length and maximum aperture' };

  return {
    confidence: 'none',
    reason: lensModel
      ? 'No exact catalog lens match'
      : 'No catalog lens with matching focal length and aperture',
  };
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

function apertureFromLensModel(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(?:f|ƒ)\s*\/?\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const aperture = Number(match[1]);
  return Number.isFinite(aperture) ? aperture : null;
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
