import { FORMATS, getFormat, type Format } from './engine';

export const GALLERY_FORMAT_IDS = new Set([
  'mft',
  'apsc',
  'apsc-canon',
  'ff',
  'gfx',
  'phase-iq4',
  'compact-1in',
  'compact-2-3',
  'compact-1-1.7',
  'compact-1-2.3',
  'film-135',
  'film-645',
  'film-66',
  'film-67',
  'film-45',
  'xpan',
  'film-617',
  'film-612',
  'phone-1in',
  'phone-1-1.28',
  'phone-1-1.7',
  'phone-1-2.55',
]);

const GALLERY_FORMATS = FORMATS.filter((format) => GALLERY_FORMAT_IDS.has(format.id));

export interface GalleryFormatResolution {
  format: Format;
  fallbackUsed: boolean;
}

interface CanonicalGalleryFormatOptions {
  preferredFamily?: string;
}

export function resolveGalleryFormat(formatId: string | null | undefined): GalleryFormatResolution {
  const id = formatId?.trim();
  if (id && GALLERY_FORMAT_IDS.has(id)) {
    return { format: getFormat(id), fallbackUsed: false };
  }

  return { format: getFormat('ff'), fallbackUsed: true };
}

export function canonicalGalleryFormat(format: Format | null | undefined, options: CanonicalGalleryFormatOptions = {}): Format {
  if (!format) return getFormat('ff');
  if (GALLERY_FORMAT_IDS.has(format.id)) return getFormat(format.id);

  return GALLERY_FORMATS.reduce((best, candidate) => (
    galleryFormatScore(format, candidate, options) < galleryFormatScore(format, best, options) ? candidate : best
  ), getFormat('ff'));
}

function galleryFormatScore(source: Format, candidate: Format, options: CanonicalGalleryFormatOptions): number {
  const sourceDiagonal = Math.hypot(source.w, source.h);
  const candidateDiagonal = Math.hypot(candidate.w, candidate.h);
  const sourceAspect = source.w / source.h;
  const candidateAspect = candidate.w / candidate.h;
  const familyPenalty = options.preferredFamily && candidate.family !== options.preferredFamily ? 0.01 : 0;

  return Math.abs(Math.log(sourceDiagonal / candidateDiagonal))
    + Math.abs(Math.log(sourceAspect / candidateAspect)) * 0.25
    + familyPenalty;
}
