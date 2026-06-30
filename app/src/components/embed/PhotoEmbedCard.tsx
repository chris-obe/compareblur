import { ExternalLink } from 'lucide-react';
import { computeMatch } from '../../lib/match';
import { resolveGalleryFormat, formatDisplayName, GALLERY_FORMAT_OPTIONS } from '../../lib/galleryFormat';
import { subjectPresetById } from '../../lib/subjectDistance';
import type { EmbedFieldId, EmbedTemplate, GalleryAlbum } from '../../lib/galleryApi';
import type { GalleryItem } from '../../lib/types';

interface Props {
  photo: GalleryItem;
  template: EmbedTemplate;
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

export function PhotoEmbedCard({ photo, template, album, linkHref, preview = false }: Props) {
  const { format } = resolveGalleryFormat(photo.formatId);
  const targetFormat = GALLERY_FORMAT_OPTIONS.find((candidate) => candidate.id === template.defaultTargetFormatId)
    ?? GALLERY_FORMAT_OPTIONS[0];
  const match = computeMatch(format, photo.focal, photo.aperture, { cameras: [], lenses: [] }, targetFormat, photo.subjectWidthM ?? 2);
  const cards = metadataCards(photo, format, template.visibleFields).slice(0, MAX_METADATA_CARDS);
  const placement = template.metadataPlacement;
  const showMetadata = template.showMetadata && cards.length > 0;
  const sidePlacement = placement === 'left' || placement === 'right';
  const articleTheme = themeClasses(template.theme);
  const frameClasses = frameStyleClasses(template.frameStyle);
  const maxLongEdge = safeLongEdge(template.maxLongEdge);
  const cardGrid = placement === 'bottom'
    ? 'grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-1';
  const equivalentText = `${formatDisplayName(targetFormat)} equivalent ${round1(match.equivalent.target.focal)}mm · f/${round1(match.equivalent.target.aperture)}`;
  const plaque = (
    <div className={plaqueClasses(template, placement)}>
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.22em] text-fg/55">{album?.title ?? 'blur gallery'}</div>
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

      <a
        href={linkHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 self-start border border-line px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-line-strong"
      >
        {template.ctaLabel || 'Open in blur'}
        <ExternalLink size={13} strokeWidth={1.5} />
      </a>
    </div>
  );

  return (
    <article
      data-theme={template.theme === 'system' ? undefined : template.theme}
      className={[
        articleTheme,
        preview ? '' : 'min-h-dvh',
        'w-full',
      ].join(' ')}
      style={preview ? { minHeight: `${Math.min(maxLongEdge, 720)}px` } : undefined}
    >
      <div className="mx-auto p-4 sm:p-6" style={{ maxWidth: `${maxLongEdge}px` }}>
        <div className={['border border-line/80 p-4 sm:p-6', frameClasses.container].join(' ')}>
          <div
            className={[
              'grid gap-4',
              sidePlacement ? 'items-start lg:grid-cols-[minmax(0,1fr)_15rem]' : 'grid-cols-1',
              placement === 'left' ? 'lg:grid-cols-[15rem_minmax(0,1fr)]' : '',
            ].join(' ')}
          >
            {placement === 'left' && plaque}

            <div className="space-y-3">
              <div className={['border bg-faint', frameClasses.image].join(' ')}>
                <div className={['relative w-full overflow-hidden', preview ? 'min-h-[24rem]' : 'min-h-[32rem]'].join(' ')}>
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className={[
                      'h-full w-full',
                      template.imageFit === 'contain' ? 'object-contain p-4' : 'object-cover',
                    ].join(' ')}
                  />
                </div>
              </div>
              {placement === 'bottom' && plaque}
            </div>

            {placement === 'right' && plaque}
          </div>
        </div>
      </div>
    </article>
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

function safeLongEdge(value: number | undefined): number {
  if (!Number.isFinite(value)) return 960;
  return Math.max(320, Math.min(1600, Math.round(value ?? 960)));
}

function themeClasses(theme: EmbedTemplate['theme']): string {
  if (theme === 'dark') return 'bg-[#0e0d0b] text-[#f3efe7]';
  if (theme === 'system') return 'bg-bg text-fg';
  return 'bg-[#f5f0e7] text-[#1f1a15]';
}

function frameStyleClasses(frameStyle: EmbedTemplate['frameStyle']) {
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

function plaqueClasses(template: EmbedTemplate, placement: EmbedTemplate['metadataPlacement']) {
  return [
    'flex min-w-0 flex-col gap-3',
    template.density === 'compact' ? 'text-xs' : 'text-sm',
    placement === 'bottom' ? 'border-t border-line/60 pt-3' : 'justify-end self-stretch',
  ].join(' ');
}
