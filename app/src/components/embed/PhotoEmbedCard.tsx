import { ExternalLink } from 'lucide-react';
import { computeMatch } from '../../lib/match';
import { resolveGalleryFormat, formatDisplayName, GALLERY_FORMAT_OPTIONS } from '../../lib/galleryFormat';
import { subjectPresetById } from '../../lib/subjectDistance';
import { EMBED_FRAME_COLOR_OPTIONS } from '../../lib/embedTemplate';
import type { EmbedFieldId, EmbedModeTemplate, GalleryAlbum } from '../../lib/galleryApi';
import type { GalleryItem } from '../../lib/types';

interface Props {
  photo: GalleryItem;
  template: EmbedModeTemplate;
  album?: GalleryAlbum | null;
  linkHref: string;
  preview?: boolean;
}

type MetadataCard = {
  id: string;
  label: string;
  value: string;
};

const MAX_METADATA_CARDS = 6;

// Single-photo embed: theme wrapper + a centred, max-width framed photo.
export function PhotoEmbedCard({ photo, template, album, linkHref, preview = false }: Props) {
  const maxLongEdge = safeLongEdge(template.maxLongEdge);
  return (
    <article
      data-theme={template.theme === 'system' ? undefined : template.theme}
      className={[themeClasses(template.theme), preview ? '' : 'min-h-dvh', 'w-full'].join(' ')}
      style={preview ? { minHeight: `${Math.min(maxLongEdge, 720)}px` } : undefined}
    >
      <div className="mx-auto p-4 sm:p-6" style={{ maxWidth: `${maxLongEdge}px` }}>
        <EmbedPhotoFrame photo={photo} template={template} album={album} linkHref={linkHref} preview={preview} />
      </div>
    </article>
  );
}

interface FrameProps {
  photo: GalleryItem;
  template: EmbedModeTemplate;
  album?: GalleryAlbum | null;
  linkHref: string;
  preview?: boolean;
  /** override the template placement (multi-image grids force 'bottom') */
  placement?: EmbedModeTemplate['metadataPlacement'];
  /** suppress the album eyebrow line (multi-image shows one header instead) */
  showEyebrow?: boolean;
  /** denser image box for grid/carousel cells */
  compact?: boolean;
  showAction?: boolean;
}

// The reusable framed unit (image box + metadata plaque). Shared by the single
// embed and the multi-image grid/carousel so they render identically.
export function EmbedPhotoFrame({
  photo,
  template,
  album,
  linkHref,
  preview = false,
  placement: placementOverride,
  showEyebrow = true,
  compact = false,
  showAction = true,
}: FrameProps) {
  const { format } = resolveGalleryFormat(photo.formatId);
  const targetFormat = GALLERY_FORMAT_OPTIONS.find((candidate) => candidate.id === template.defaultTargetFormatId)
    ?? GALLERY_FORMAT_OPTIONS[0];
  const match = computeMatch(format, photo.focal, photo.aperture, { cameras: [], lenses: [] }, targetFormat, photo.subjectWidthM ?? 2);
  const cards = metadataCards(photo, format, template.visibleFields).slice(0, MAX_METADATA_CARDS);
  const placement = placementOverride ?? template.metadataPlacement;
  const showMetadata = template.showMetadata && cards.length > 0;
  const sidePlacement = placement === 'left' || placement === 'right';
  const frameClasses = frameStyleClasses(template.frameStyle);
  const cardGrid = placement === 'bottom' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1';
  const equivalentText = `${formatDisplayName(targetFormat)} equivalent ${round1(match.equivalent.target.focal)}mm · f/${round1(match.equivalent.target.aperture)}`;
  const openButton = template.showOpenButton && showAction ? (
    <OpenButton href={linkHref} label={template.ctaLabel || 'Open in blur'} theme={template.theme} />
  ) : null;
  const frameWidth = effectiveFrameWidth(template);
  const frameColor = frameColorValue(template.frameColor);

  const plaque = (
    <div className={plaqueClasses(template, placement)}>
      <div className="space-y-1">
        {showEyebrow && (
          <div className="text-[11px] uppercase tracking-[0.22em] text-fg/55">{album?.title ?? 'blur gallery'}</div>
        )}
        <div className="text-base font-semibold tracking-tight">{photo.title}</div>
        {template.showEquivalent && (
          <div className="text-[11px] uppercase tracking-[0.14em] text-fg/55">{equivalentText}</div>
        )}
      </div>

      {showMetadata && (
        <div className={['grid gap-2', cardGrid].join(' ')}>
          {cards.map((card) => (
            <div key={card.id} className="border border-line/80 bg-bg/55 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-fg/50">{card.label}</div>
              <div className="mt-1 text-sm font-medium leading-tight">{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {template.openButtonPlacement === 'metadata' && openButton}
    </div>
  );

  return (
    <div className={['border border-line/80', compact ? 'p-3' : 'p-4 sm:p-6', frameClasses.container].join(' ')}>
      <div
        className={[
          'grid gap-4',
          sidePlacement ? 'items-start lg:grid-cols-[minmax(0,1fr)_15rem]' : 'grid-cols-1',
          placement === 'left' ? 'lg:grid-cols-[15rem_minmax(0,1fr)]' : '',
        ].join(' ')}
      >
        {placement === 'left' && plaque}

        <div className="space-y-3">
          <div
            className={['border bg-faint', frameClasses.image].join(' ')}
            style={{ padding: frameWidth, backgroundColor: frameColor }}
          >
            <div
              className={[
                'relative w-full overflow-hidden bg-bg',
                template.squareImages
                  ? 'aspect-square'
                  : compact
                    ? 'min-h-[16rem]'
                    : preview
                      ? 'min-h-[24rem]'
                      : 'min-h-[32rem]',
              ].join(' ')}
            >
              {template.openButtonPlacement === 'top-right' && openButton && (
                <div className="absolute right-3 top-3 z-10">{openButton}</div>
              )}
              <img
                src={photo.src}
                alt={photo.title}
                className={[
                  'h-full w-full',
                  template.imageFit === 'contain' ? 'object-contain p-4' : 'object-cover',
                ].join(' ')}
                style={{ objectPosition: imageObjectPosition(photo, template.imagePosition) }}
              />
            </div>
          </div>
          {template.openButtonPlacement === 'below' && openButton}
          {placement === 'bottom' && plaque}
        </div>

        {placement === 'right' && plaque}
      </div>
    </div>
  );
}

export function OpenButton({
  href,
  label,
  theme = 'light',
}: {
  href: string;
  label: string;
  theme?: EmbedModeTemplate['theme'];
}) {
  const contrast = openButtonContrast(theme);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 self-start border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-opacity hover:opacity-85"
      style={{
        backgroundColor: contrast.background,
        borderColor: contrast.border,
        color: contrast.text,
      }}
    >
      {label}
      <ExternalLink size={13} strokeWidth={1.5} />
    </a>
  );
}

function metadataCards(photo: GalleryItem, format: ReturnType<typeof resolveGalleryFormat>['format'], visibleFields: EmbedFieldId[]): MetadataCard[] {
  const subject = subjectPresetById(photo.subjectPreset)?.label;
  const values: Record<EmbedFieldId, MetadataCard | null> = {
    camera: photo.camera ? { id: 'camera', label: 'Camera', value: photo.camera } : null,
    lens: photo.lens ? { id: 'lens', label: 'Lens', value: photo.lens } : null,
    focal: Number.isFinite(photo.focal) ? { id: 'focal', label: 'Focal', value: `${Math.round(photo.focal)}mm` } : null,
    aperture: Number.isFinite(photo.aperture) ? { id: 'aperture', label: 'Aperture', value: `f/${photo.aperture.toFixed(1)}` } : null,
    shutter: photo.shutterSpeed ? { id: 'shutter', label: 'Shutter', value: photo.shutterSpeed } : null,
    iso: photo.iso ? { id: 'iso', label: 'ISO', value: String(photo.iso) } : null,
    capturedAt: photo.capturedAt ? { id: 'capturedAt', label: 'Captured', value: compactDate(photo.capturedAt) } : null,
    format: { id: 'format', label: 'Format', value: formatDisplayName(format) },
    subject: subject ? { id: 'subject', label: 'Framing', value: subject } : null,
  };
  return visibleFields.map((field) => values[field]).filter((item): item is MetadataCard => !!item);
}

function compactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function safeLongEdge(value: number | undefined): number {
  if (!Number.isFinite(value)) return 960;
  return Math.max(320, Math.min(1600, Math.round(value ?? 960)));
}

export function themeClasses(theme: EmbedModeTemplate['theme']): string {
  if (theme === 'dark') return 'bg-[#0e0d0b] text-[#f3efe7]';
  if (theme === 'system') return 'bg-bg text-fg';
  return 'bg-[#f5f0e7] text-[#1f1a15]';
}

function frameStyleClasses(frameStyle: EmbedModeTemplate['frameStyle']) {
  if (frameStyle === 'technical') {
    return {
      container: 'bg-[#111] text-[#f4f1ea]',
      image: 'border border-line-strong',
    };
  }
  if (frameStyle === 'editorial') {
    return {
      container: 'bg-[#ede5d8] text-[#231d18]',
      image: 'border-y border-line-strong',
    };
  }
  return {
    container: 'bg-[color:color-mix(in_oklab,currentColor_4%,transparent)]',
    image: 'border border-line/80',
  };
}

function plaqueClasses(template: EmbedModeTemplate, placement: EmbedModeTemplate['metadataPlacement']) {
  return [
    'flex min-w-0 flex-col gap-3',
    template.density === 'compact' ? 'text-xs' : 'text-sm',
    placement === 'bottom' ? 'border-t border-line/60 pt-3' : 'justify-end self-stretch',
  ].join(' ');
}

function imageObjectPosition(photo: GalleryItem, position: EmbedModeTemplate['imagePosition']): string {
  if (position === 'top') return 'center top';
  if (position === 'bottom') return 'center bottom';
  if (position === 'center') return 'center center';
  const dimensions = photo as GalleryItem & { width?: number; height?: number };
  if (dimensions.width && dimensions.height && dimensions.height > dimensions.width * 1.25) {
    return 'center 38%';
  }
  return 'center center';
}

export function effectiveFrameWidth(template: Pick<EmbedModeTemplate, 'frameWidth' | 'maxLongEdge'>): number {
  const requested = Number.isFinite(template.frameWidth) ? Math.max(0, Math.min(40, Math.round(template.frameWidth))) : 10;
  const adaptiveMax = Math.max(4, Math.min(40, Math.round(safeLongEdge(template.maxLongEdge) / 64)));
  return Math.min(requested, adaptiveMax);
}

export function frameColorValue(color: EmbedModeTemplate['frameColor']): string {
  return EMBED_FRAME_COLOR_OPTIONS.find((option) => option.id === color)?.value ?? '#1f1a15';
}

function openButtonContrast(theme: EmbedModeTemplate['theme']): { background: string; border: string; text: string } {
  if (theme === 'dark') {
    return { background: '#f5f0e7', border: '#f5f0e7', text: '#1f1a15' };
  }
  return { background: '#1f1a15', border: '#1f1a15', text: '#f5f0e7' };
}
