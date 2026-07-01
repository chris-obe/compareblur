import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EmbedAlbumLayout, EmbedGalleryModeTemplate, GalleryAlbum } from '../../lib/galleryApi';
import type { GalleryItem } from '../../lib/types';
import { EmbedPhotoFrame, OpenButton, effectiveFrameWidth, frameColorValue, safeLongEdge, themeClasses } from './PhotoEmbedCard';

interface Props {
  photos: GalleryItem[];
  template: EmbedGalleryModeTemplate;
  layout: EmbedAlbumLayout;
  columns: number;
  album?: GalleryAlbum | null;
  linkHrefFor: (photo: GalleryItem) => string;
  openHref: string;
  preview?: boolean;
}

// Multi-image embed: theme wrapper + a grid (contact sheet) or carousel of frames.
export function EmbedGalleryCard({ photos, template, layout, columns, album, linkHrefFor, openHref, preview = false }: Props) {
  const maxLongEdge = safeLongEdge(template.maxLongEdge);
  const cols = Math.max(2, Math.min(4, Math.round(columns)));
  const isCarousel = layout === 'carousel';
  const openButton = template.showOpenButton ? (
    <OpenButton href={openHref} label={template.ctaLabel || 'Open in blur'} theme={template.theme} />
  ) : null;

  return (
    <article
      data-theme={template.theme === 'system' ? undefined : template.theme}
      className={[themeClasses(template.theme), preview ? '' : 'min-h-dvh', 'w-full'].join(' ')}
      style={preview ? { minHeight: `${Math.min(maxLongEdge, 720)}px` } : undefined}
    >
      <div
        className={['mx-auto space-y-4 p-4 sm:p-6', isCarousel ? '' : 'w-full'].join(' ')}
        style={isCarousel ? { maxWidth: `${maxLongEdge}px` } : undefined}
      >
        {(template.showAlbumHeader || template.openButtonPlacement === 'metadata') && (
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              {template.showAlbumHeader && (
                <>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-fg/55">blur gallery</div>
                  <div className="text-lg font-semibold tracking-tight">{album?.title ?? 'Contact sheet'}</div>
                  {album?.description && <p className="max-w-prose text-sm text-fg/70">{album.description}</p>}
                </>
              )}
            </div>
            {template.openButtonPlacement === 'metadata' && openButton}
          </header>
        )}

        {template.openButtonPlacement === 'top-right' && openButton && (
          <div className="flex justify-end">{openButton}</div>
        )}

        {isCarousel ? (
          <Carousel photos={photos} template={template} album={album} linkHrefFor={linkHrefFor} preview={preview} />
        ) : template.showMetadata ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {photos.map((photo) => (
              <EmbedPhotoFrame
                key={photo.id}
                photo={photo}
                template={template}
                album={album}
                linkHref={linkHrefFor(photo)}
                placement="bottom"
                showEyebrow={false}
                showAction={false}
                compact
                preview={preview}
              />
            ))}
          </div>
        ) : (
          <div
            className="grid auto-rows-[minmax(8rem,1fr)] grid-flow-dense gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {photos.map((photo) => (
              <ContactSheetCell
                key={photo.id}
                photo={photo}
                template={template}
                href={linkHrefFor(photo)}
                columns={cols}
              />
            ))}
          </div>
        )}

        {template.openButtonPlacement === 'below' && openButton}
      </div>
    </article>
  );
}

function ContactSheetCell({
  photo,
  template,
  href,
  columns,
}: {
  photo: GalleryItem;
  template: EmbedGalleryModeTemplate;
  href: string;
  columns: number;
}) {
  const dimensions = photo as GalleryItem & { width?: number; height?: number };
  const ratio = dimensions.width && dimensions.height ? dimensions.width / dimensions.height : 1;
  const span = !template.squareImages && columns >= 3 && ratio > 1.35 ? 'sm:col-span-2' : '';
  const frameWidth = effectiveFrameWidth(template);
  const frameColor = frameColorValue(template.frameColor);
  const position = template.imagePosition === 'top'
    ? 'center top'
    : template.imagePosition === 'bottom'
      ? 'center bottom'
      : template.imagePosition === 'center'
        ? 'center center'
        : ratio < 0.8
          ? 'center 38%'
          : 'center center';

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={['group block overflow-hidden border border-line bg-faint', template.squareImages ? 'aspect-square' : '', span].join(' ')}
      style={{ padding: frameWidth, backgroundColor: frameColor }}
    >
      <div className={['h-full w-full overflow-hidden', template.squareImages ? 'aspect-square' : 'min-h-40 bg-bg'].join(' ')}>
        <img
          src={photo.src}
          alt={photo.title}
          className={[
            'h-full w-full transition-transform duration-200 group-hover:scale-[1.015]',
            template.squareImages
              ? 'object-contain'
              : template.imageFit === 'contain'
                ? 'object-contain p-2'
                : 'object-cover',
          ].join(' ')}
          style={{ objectPosition: position }}
        />
      </div>
    </a>
  );
}

function Carousel({
  photos,
  template,
  album,
  linkHrefFor,
  preview,
}: {
  photos: GalleryItem[];
  template: EmbedGalleryModeTemplate;
  album?: GalleryAlbum | null;
  linkHrefFor: (photo: GalleryItem) => string;
  preview: boolean;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.max(0, Math.min(index, photos.length - 1));
  const photo = photos[safeIndex];
  if (!photo) return null;

  const go = (delta: number) => setIndex((current) => {
    const next = (current + delta + photos.length) % photos.length;
    return next;
  });

  return (
    <div className="space-y-3">
      <EmbedPhotoFrame
        photo={photo}
        template={template}
        album={album}
        linkHref={linkHrefFor(photo)}
        placement="bottom"
        showEyebrow={false}
        preview={preview}
      />
      {photos.length > 1 && template.showCarouselControls && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="flex h-9 w-9 items-center justify-center border border-line transition-colors hover:border-line-strong"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <div className="text-[11px] uppercase tracking-[0.18em] text-fg/55">
            {safeIndex + 1} / {photos.length}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="flex h-9 w-9 items-center justify-center border border-line transition-colors hover:border-line-strong"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
