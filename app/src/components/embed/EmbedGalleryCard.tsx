import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EmbedAlbumLayout, EmbedTemplate, GalleryAlbum } from '../../lib/galleryApi';
import type { GalleryItem } from '../../lib/types';
import { EmbedPhotoFrame, safeLongEdge, themeClasses } from './PhotoEmbedCard';

interface Props {
  photos: GalleryItem[];
  template: EmbedTemplate;
  layout: EmbedAlbumLayout;
  columns: number;
  album?: GalleryAlbum | null;
  linkHrefFor: (photo: GalleryItem) => string;
  preview?: boolean;
}

// Multi-image embed: theme wrapper + a grid (contact sheet) or carousel of frames.
export function EmbedGalleryCard({ photos, template, layout, columns, album, linkHrefFor, preview = false }: Props) {
  const maxLongEdge = safeLongEdge(template.maxLongEdge);
  const cols = Math.max(2, Math.min(4, Math.round(columns)));
  const isCarousel = layout === 'carousel';

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
        {album && (
          <header className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.22em] text-fg/55">blur gallery</div>
            <div className="text-lg font-semibold tracking-tight">{album.title}</div>
            {album.description && <p className="max-w-prose text-sm text-fg/70">{album.description}</p>}
          </header>
        )}

        {isCarousel ? (
          <Carousel photos={photos} template={template} album={album} linkHrefFor={linkHrefFor} preview={preview} />
        ) : (
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
                compact
                preview={preview}
              />
            ))}
          </div>
        )}
      </div>
    </article>
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
  template: EmbedTemplate;
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
      {photos.length > 1 && (
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
