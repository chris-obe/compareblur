import type { EmbedFieldId, EmbedGalleryModeTemplate, EmbedModeTemplate, EmbedTemplate } from './galleryApi';

export const EMBED_FRAME_COLOR_OPTIONS = [
  { id: 'black', label: 'Black', value: '#1f1a15' },
  { id: 'white', label: 'White', value: '#f5f0e7' },
  { id: 'mono', label: 'Mono', value: 'var(--fg)' },
  { id: 'blue', label: 'Blue', value: 'color-mix(in oklch, var(--fg) 68%, #4f7cff 32%)' },
  { id: 'green', label: 'Green', value: 'color-mix(in oklch, var(--fg) 68%, #20a36a 32%)' },
  { id: 'amber', label: 'Amber', value: 'color-mix(in oklch, var(--fg) 68%, #c08318 32%)' },
  { id: 'rose', label: 'Rose', value: 'color-mix(in oklch, var(--fg) 68%, #c95771 32%)' },
  { id: 'violet', label: 'Violet', value: 'color-mix(in oklch, var(--fg) 68%, #8067d8 32%)' },
  { id: 'teal', label: 'Teal', value: 'color-mix(in oklch, var(--fg) 68%, #1d9aa0 32%)' },
] as const;

export type EmbedFrameColorId = (typeof EMBED_FRAME_COLOR_OPTIONS)[number]['id'];

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
  imagePosition: 'auto',
  frameWidth: 10,
  frameColor: 'black',
  squareImages: false,
  maxLongEdge: DEFAULT_EMBED_MAX_LONG_EDGE,
  metadataPlacement: 'bottom',
  showMetadata: true,
  defaultTargetFormatId: 'ff',
  visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
  ctaLabel: 'Open in blur',
  showOpenButton: true,
  openButtonPlacement: 'metadata',
  showEquivalent: false,
  albumLayout: 'grid',
  albumCount: 6,
  albumColumns: 3,
  showAlbumHeader: true,
  showCarouselControls: true,
  image: {
    theme: 'light',
    density: 'comfortable',
    frameStyle: 'minimal',
    imageFit: 'contain',
    imagePosition: 'auto',
    frameWidth: 10,
    frameColor: 'black',
    squareImages: false,
    maxLongEdge: DEFAULT_EMBED_MAX_LONG_EDGE,
    metadataPlacement: 'bottom',
    showMetadata: true,
    defaultTargetFormatId: 'ff',
    visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
    ctaLabel: 'Open in blur',
    showOpenButton: true,
    openButtonPlacement: 'metadata',
    showEquivalent: false,
  },
  gallery: {
    theme: 'light',
    density: 'compact',
    frameStyle: 'minimal',
    imageFit: 'cover',
    imagePosition: 'auto',
    frameWidth: 10,
    frameColor: 'black',
    squareImages: false,
    maxLongEdge: DEFAULT_EMBED_MAX_LONG_EDGE,
    metadataPlacement: 'bottom',
    showMetadata: false,
    defaultTargetFormatId: 'ff',
    visibleFields: ['camera', 'lens', 'focal', 'aperture'],
    ctaLabel: 'Open in blur',
    showOpenButton: true,
    openButtonPlacement: 'below',
    showEquivalent: false,
    albumLayout: 'grid',
    albumCount: 9,
    albumColumns: 3,
    showAlbumHeader: true,
    showCarouselControls: true,
  },
};

export function templateForMode(template: EmbedTemplate, mode: 'image'): EmbedModeTemplate;
export function templateForMode(template: EmbedTemplate, mode: 'gallery'): EmbedGalleryModeTemplate;
export function templateForMode(template: EmbedTemplate, mode: 'image' | 'gallery'): EmbedModeTemplate | EmbedGalleryModeTemplate;
export function templateForMode(template: EmbedTemplate, mode: 'image' | 'gallery') {
  return mode === 'image' ? template.image : template.gallery;
}

export function updateTemplateMode(
  template: EmbedTemplate,
  mode: 'image',
  updates: Partial<EmbedModeTemplate>,
): EmbedTemplate;
export function updateTemplateMode(
  template: EmbedTemplate,
  mode: 'gallery',
  updates: Partial<EmbedGalleryModeTemplate>,
): EmbedTemplate;
export function updateTemplateMode(
  template: EmbedTemplate,
  mode: 'image' | 'gallery',
  updates: Partial<EmbedModeTemplate | EmbedGalleryModeTemplate>,
): EmbedTemplate {
  const nextMode = { ...template[mode], ...updates };
  return {
    ...template,
    [mode]: nextMode,
    ...(mode === 'image' ? nextMode : {}),
    ...(mode === 'gallery'
      ? {
          albumLayout: (nextMode as EmbedGalleryModeTemplate).albumLayout,
          albumCount: (nextMode as EmbedGalleryModeTemplate).albumCount,
          albumColumns: (nextMode as EmbedGalleryModeTemplate).albumColumns,
          showAlbumHeader: (nextMode as EmbedGalleryModeTemplate).showAlbumHeader,
          showCarouselControls: (nextMode as EmbedGalleryModeTemplate).showCarouselControls,
        }
      : {}),
  };
}
