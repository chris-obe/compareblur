import { ExternalLink } from 'lucide-react';
import { resolveGalleryFormat } from '../../lib/galleryFormat';
import type { EmbedTemplate, GalleryAlbum } from '../../lib/galleryApi';
import type { GalleryItem, ViewEntry } from '../../lib/types';
import { PhotoOpticsPanel } from '../gallery/PhotoOpticsPanel';

interface Props {
  photo: GalleryItem;
  template: EmbedTemplate;
  album?: GalleryAlbum | null;
  linkHref: string;
  preview?: boolean;
}

export function PhotoEmbedCard({ photo, template, album, linkHref, preview = false }: Props) {
  const { format, fallbackUsed } = resolveGalleryFormat(photo.formatId);
  const entry: ViewEntry = {
    id: photo.id,
    title: photo.title,
    metaLine: `${photo.camera} · ${photo.lens}`,
    src: photo.src,
    camera: photo.camera,
    lens: photo.lens,
    formatId: photo.formatId,
    format,
    focal: photo.focal,
    aperture: photo.aperture,
    subjectPreset: photo.subjectPreset,
    subjectWidthM: photo.subjectWidthM,
    shutterSpeed: photo.shutterSpeed,
    iso: photo.iso,
    capturedAt: photo.capturedAt,
    guessed: fallbackUsed,
    morph: false,
  };

  const compact = template.density === 'compact';
  const editorial = template.frameStyle === 'editorial';
  const minimal = template.frameStyle === 'minimal';

  return (
    <article
      data-theme={template.theme === 'system' ? undefined : template.theme}
      className={[
        preview ? 'bg-bg text-fg' : 'min-h-dvh bg-bg text-fg',
        compact ? 'p-2 text-xs' : 'p-3 text-sm',
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto grid max-w-5xl overflow-hidden bg-surface',
          minimal ? 'border-0' : editorial ? 'border-y border-line-strong' : 'border border-line-strong',
          compact ? 'gap-2 lg:grid-cols-[minmax(0,1.15fr)_20rem]' : 'gap-3 lg:grid-cols-[minmax(0,1.25fr)_23rem]',
        ].join(' ')}
      >
        <a href={linkHref} target="_blank" rel="noreferrer" className="group relative block min-h-[16rem] overflow-hidden bg-faint">
          <img
            src={photo.src}
            alt={photo.title}
            className={[
              'h-full w-full transition duration-300 group-hover:scale-[1.01]',
              template.imageFit === 'contain' ? 'object-contain p-2' : 'object-cover',
            ].join(' ')}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-line bg-bg/90 px-3 py-2 backdrop-blur-sm">
            <div className="truncate text-sm font-bold tracking-tight">{photo.title}</div>
            <div className="label mt-1 truncate">{album?.title ?? 'blur gallery'}</div>
          </div>
        </a>

        <div className={compact ? 'space-y-3 p-3' : 'space-y-4 p-4'}>
          <header>
            <div className="label mb-2">Shot metadata</div>
            <h1 className="text-base font-bold tracking-tight">{photo.title}</h1>
            <div className="mt-1 text-xs text-muted">{photo.author || 'Unknown photographer'}</div>
          </header>

          <PhotoOpticsPanel
            entry={entry}
            defaultTargetFormatId={template.defaultTargetFormatId}
            visibleFields={template.visibleFields}
            showEquivalent={template.showEquivalent}
          />

          <a
            href={linkHref}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 border border-line px-3 py-2 text-xs uppercase tracking-wide transition-colors hover:border-line-strong"
          >
            {template.ctaLabel || 'Open in blur'}
            <ExternalLink size={13} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </article>
  );
}
