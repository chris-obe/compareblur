import { FORMATS, getFormat, type Format } from './engine';

export interface GalleryFormatResolution {
  format: Format;
  fallbackUsed: boolean;
}

export function resolveGalleryFormat(formatId: string | null | undefined): GalleryFormatResolution {
  const id = formatId?.trim();
  if (id && FORMATS.some((format) => format.id === id)) {
    return { format: getFormat(id), fallbackUsed: false };
  }

  return { format: getFormat('ff'), fallbackUsed: true };
}

