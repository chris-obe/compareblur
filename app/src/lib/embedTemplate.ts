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

export const DEFAULT_EMBED_TEMPLATE: EmbedTemplate = {
  theme: 'light',
  density: 'comfortable',
  frameStyle: 'technical',
  imageFit: 'cover',
  defaultTargetFormatId: 'ff',
  visibleFields: EMBED_FIELD_OPTIONS.map((field) => field.id),
  ctaLabel: 'Open in blur',
  showEquivalent: true,
};
