import exifr from 'exifr';
import { FORMATS, cropFactor, getFormat } from './engine';
import type { ExtractedExif } from './types';

// Pick the engine format whose crop factor best matches an observed crop factor
// (derived from FocalLengthIn35mmFormat ÷ FocalLength). Restricted to digital
// formats since EXIF comes from digital cameras.
function formatFromCropFactor(cf: number): string {
  const candidates = FORMATS.filter((f) => f.family === 'digital');
  let best = getFormat('ff');
  let bestErr = Infinity;
  for (const f of candidates) {
    const err = Math.abs(cropFactor(f) - cf);
    if (err < bestErr) {
      bestErr = err;
      best = f;
    }
  }
  return best.id;
}

export async function extractExif(file: File): Promise<ExtractedExif> {
  let raw: Record<string, unknown> = {};
  try {
    raw = (await exifr.parse(file, {
      pick: [
        'FocalLength',
        'FocalLengthIn35mmFormat',
        'FNumber',
        'ApertureValue',
        'Make',
        'Model',
        'LensModel',
        'ExifImageWidth',
        'ExifImageHeight',
      ],
    })) ?? {};
  } catch {
    raw = {};
  }

  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && isFinite(v) ? v : undefined;

  const focal = num(raw.FocalLength);
  const focal35 = num(raw.FocalLengthIn35mmFormat);
  const aperture = num(raw.FNumber) ?? num(raw.ApertureValue);

  let formatId = 'ff';
  let guessedFormat = true;
  if (focal && focal35 && focal > 0) {
    formatId = formatFromCropFactor(focal35 / focal);
    guessedFormat = false;
  }

  return {
    focal,
    focal35,
    aperture,
    make: typeof raw.Make === 'string' ? raw.Make : undefined,
    model: typeof raw.Model === 'string' ? raw.Model : undefined,
    lensModel: typeof raw.LensModel === 'string' ? raw.LensModel : undefined,
    width: num(raw.ExifImageWidth),
    height: num(raw.ExifImageHeight),
    guessedFormat,
    formatId,
  };
}
