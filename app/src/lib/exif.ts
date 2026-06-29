import exifr from 'exifr';
import { cropFactorFormat, sensorFormat, getFormat, type Format } from './engine';
import { isPhoneMake, lookupDeviceSensor } from './devices';
import type { ExtractedExif } from './types';

// resolution unit → mm per unit (EXIF FocalPlaneResolutionUnit: 2=inch,3=cm,4=mm)
const UNIT_MM: Record<number, number> = { 2: 25.4, 3: 10, 4: 1 };

/**
 * Resolve the capture format from EXIF, most-reliable signal first:
 *   1. FocalLengthIn35mmFormat ÷ FocalLength → exact, lens-aware crop factor
 *      (this is how phones — incl. iPhones on any of their lenses — are handled).
 *   2. FocalPlaneResolution tags → the real physical sensor size.
 *   3. Curated device table (phones with no useful EXIF).
 *   4. Phone make but nothing else → a small default sensor (never MFT).
 *   5. Give up → full frame, flagged as a guess.
 */
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
        'FocalPlaneXResolution',
        'FocalPlaneYResolution',
        'FocalPlaneResolutionUnit',
      ],
    })) ?? {};
  } catch {
    raw = {};
  }

  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && isFinite(v) ? v : undefined;
  const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

  const focal = num(raw.FocalLength);
  const focal35 = num(raw.FocalLengthIn35mmFormat);
  const aperture = num(raw.FNumber) ?? num(raw.ApertureValue);
  const make = str(raw.Make);
  const model = str(raw.Model);
  const imgW = num(raw.ExifImageWidth);
  const imgH = num(raw.ExifImageHeight);
  const device = [make, model].filter(Boolean).join(' ').trim();

  // image aspect ratio (long/short) for synthesizing a sensor rectangle
  const ar = imgW && imgH ? Math.max(imgW, imgH) / Math.min(imgW, imgH) : 4 / 3;

  let format: Format;
  let guessedFormat = false;

  if (focal && focal35 && focal > 0) {
    // 1) exact crop factor straight from EXIF
    const cf = focal35 / focal;
    format = cropFactorFormat(cf, {
      ar,
      name: `${device || 'Camera'} (≈${cf.toFixed(1)}× crop)`,
    });
  } else if (
    num(raw.FocalPlaneXResolution) &&
    num(raw.FocalPlaneYResolution) &&
    imgW &&
    imgH
  ) {
    // 2) physical sensor size from focal-plane resolution
    const unit = UNIT_MM[num(raw.FocalPlaneResolutionUnit) ?? 2] ?? 25.4;
    const w = (imgW / (raw.FocalPlaneXResolution as number)) * unit;
    const h = (imgH / (raw.FocalPlaneYResolution as number)) * unit;
    format = sensorFormat(w, h, { name: `${device || 'Camera'} sensor` });
  } else {
    // 3) curated device table
    const dev = lookupDeviceSensor(make, model);
    if (dev) {
      format = sensorFormat(dev.w, dev.h, { name: dev.label });
    } else if (isPhoneMake(make)) {
      // 4) known phone brand, unknown model → small default, not MFT
      format = sensorFormat(7.6, 5.7, { name: `${device || 'Phone'} (assumed 1/1.7″)` });
      guessedFormat = true;
    } else {
      // 5) last resort
      format = getFormat('ff');
      guessedFormat = true;
    }
  }

  return {
    focal,
    focal35,
    aperture,
    make,
    model,
    lensModel: str(raw.LensModel),
    width: imgW,
    height: imgH,
    guessedFormat,
    format,
  };
}
