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

export function galleryFormatIdOrDefault(value: unknown, fallback = 'ff'): string | null {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const trimmed = value.trim();
  return GALLERY_FORMAT_IDS.has(trimmed) ? trimmed : null;
}

