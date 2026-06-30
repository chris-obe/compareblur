interface GalleryFormat {
  id: string;
  w: number;
  h: number;
  family: string;
}

const GALLERY_FORMATS: GalleryFormat[] = [
  { id: 'mft', w: 17.3, h: 13, family: 'digital' },
  { id: 'apsc', w: 23.5, h: 15.6, family: 'digital' },
  { id: 'apsc-canon', w: 22.3, h: 14.9, family: 'digital' },
  { id: 'ff', w: 36, h: 24, family: 'digital' },
  { id: 'gfx', w: 44, h: 33, family: 'digital' },
  { id: 'phase-iq4', w: 53.4, h: 40, family: 'digital' },
  { id: 'compact-1in', w: 13.2, h: 8.8, family: 'compact' },
  { id: 'compact-2-3', w: 8.8, h: 6.6, family: 'compact' },
  { id: 'compact-1-1.7', w: 7.53, h: 5.64, family: 'compact' },
  { id: 'compact-1-2.3', w: 6.16, h: 4.62, family: 'compact' },
  { id: 'film-135', w: 36, h: 24, family: 'film' },
  { id: 'film-645', w: 56, h: 41.5, family: 'film' },
  { id: 'film-66', w: 56, h: 56, family: 'film' },
  { id: 'film-67', w: 70, h: 56, family: 'film' },
  { id: 'film-45', w: 121, h: 97, family: 'film' },
  { id: 'xpan', w: 65, h: 24, family: 'pano' },
  { id: 'film-617', w: 168, h: 56, family: 'pano' },
  { id: 'film-612', w: 112, h: 56, family: 'pano' },
  { id: 'phone-1in', w: 13.2, h: 8.8, family: 'phone' },
  { id: 'phone-1-1.28', w: 9.8, h: 7.35, family: 'phone' },
  { id: 'phone-1-1.7', w: 7.53, h: 5.64, family: 'phone' },
  { id: 'phone-1-2.55', w: 5.02, h: 3.76, family: 'phone' },
];

export const GALLERY_FORMAT_IDS = new Set(GALLERY_FORMATS.map((format) => format.id));

export function galleryFormatIdOrDefault(value: unknown, fallback = 'ff'): string | null {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const trimmed = value.trim();
  if (GALLERY_FORMAT_IDS.has(trimmed)) return trimmed;
  return nearestDetectedGalleryFormatId(trimmed);
}

function nearestDetectedGalleryFormatId(id: string): string | null {
  const detected = detectedFormatFromId(id);
  if (!detected) return null;

  return GALLERY_FORMATS.reduce((best, candidate) => (
    formatScore(detected, candidate) < formatScore(detected, best) ? candidate : best
  ), GALLERY_FORMATS.find((format) => format.id === 'ff') ?? GALLERY_FORMATS[0]).id;
}

function detectedFormatFromId(id: string): GalleryFormat | null {
  const sensor = id.match(/^sensor-(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (sensor) {
    return { id, w: Number(sensor[1]), h: Number(sensor[2]), family: 'detected' };
  }

  const crop = id.match(/^crop-(\d+(?:\.\d+)?)$/);
  if (!crop) return null;
  const cropFactor = Number(crop[1]);
  if (!Number.isFinite(cropFactor) || cropFactor <= 0) return null;

  const diagonal = Math.hypot(36, 24) / cropFactor;
  const h = diagonal / Math.hypot(4 / 3, 1);
  return { id, w: h * (4 / 3), h, family: 'detected' };
}

function formatScore(source: GalleryFormat, candidate: GalleryFormat): number {
  const sourceDiagonal = Math.hypot(source.w, source.h);
  const candidateDiagonal = Math.hypot(candidate.w, candidate.h);
  const sourceAspect = source.w / source.h;
  const candidateAspect = candidate.w / candidate.h;

  return Math.abs(Math.log(sourceDiagonal / candidateDiagonal))
    + Math.abs(Math.log(sourceAspect / candidateAspect)) * 0.25;
}
