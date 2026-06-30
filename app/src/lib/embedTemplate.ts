import type { EmbedFieldId, EmbedTemplate } from './galleryApi';

export const EMBED_FIELD_OPTIONS: Array<{ id: EmbedFieldId; label: string }> = [
  { id: 'camera', label: 'Camera' },
  { id: 'lens', label: 'Lens' },
  { id: 'focal', label: 'Focal length' },
  { id: 'aperture', label: 'Aperture' },
  { id: 'shutter', label: 'Shutter' },
  { id: 'iso', label: 'ISO' },
  { id: 'capturedAt', label: 'Captured date' },
  { id: 'format', label: 'Format' },
  { id: 'subject', label: 'Framing' },
];

export const EMBED_METADATA_LIMIT = 6;
export const EMBED_SIZE_PRESETS = [
  { label: 'WordPress content', value: 720 },
  { label: 'Classic blog column', value: 640 },
  { label: 'Wide article', value: 960 },
  { label: 'Forum large', value: 800 },
  { label: 'Forum compact', value: 560 },
  { label: 'Full bleed', value: 1200 },
] as const;

export const DEFAULT_EMBED_MAX_LONG_EDGE = 960;
export const MIN_EMBED_LONG_EDGE = 320;
export const MAX_EMBED_LONG_EDGE = 1600;

export const DEFAULT_EMBED_TEMPLATE: EmbedTemplate = {
  theme: 'light',
  density: 'comfortable',
  frameStyle: 'minimal',
  imageFit: 'contain',
  maxLongEdge: DEFAULT_EMBED_MAX_LONG_EDGE,
  metadataPlacement: 'bottom',
  showMetadata: true,
  defaultTargetFormatId: 'ff',
  visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
  ctaLabel: 'Open in blur',
  showEquivalent: false,
  albumLayout: 'grid',
  albumCount: 6,
  albumColumns: 3,
};
