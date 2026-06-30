import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EmbedGalleryCard } from '../components/embed/EmbedGalleryCard';
import {
  getEmbedAlbum,
  getEmbedPhotoSet,
  type EmbedAlbumLayout,
  type EmbedGalleryResponse,
} from '../lib/galleryApi';
import type { GalleryItem } from '../lib/types';

// One page for both multi-image routes: album auto-select (/embed/album/:slug)
// and selected-set (/embed/photos?ids=…). Layout comes from ?layout, else template.
export function EmbedGallery({ mode }: { mode: 'album' | 'set' }) {
  const { albumSlug = '' } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState<EmbedGalleryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ids = params.get('ids') ?? '';
  const count = params.get('count');
  const layoutParam = params.get('layout');
  const requestedLayout: EmbedAlbumLayout | undefined = layoutParam === 'carousel' || layoutParam === 'grid'
    ? layoutParam
    : undefined;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setData(null);
    const request = mode === 'album'
      ? getEmbedAlbum(albumSlug, { count: count ? Number(count) : undefined, layout: requestedLayout })
      : getEmbedPhotoSet(ids.split(',').map((value) => value.trim()).filter(Boolean), { layout: requestedLayout });
    request
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Embed failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [mode, albumSlug, ids, count, requestedLayout]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-4 text-fg">
        <div className="border border-line px-5 py-4 text-xs text-muted">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-4 text-fg">
        <div className="border border-line px-5 py-4 text-xs text-muted">Loading embed</div>
      </div>
    );
  }

  const layout: EmbedAlbumLayout = layoutParam === 'carousel' || layoutParam === 'grid'
    ? layoutParam
    : data.template.albumLayout;

  const linkHrefFor = (photo: GalleryItem) =>
    data.album?.slug
      ? `/g/${encodeURIComponent(data.album.slug)}/photo/${encodeURIComponent(photo.id)}`
      : `/gallery/photo/${encodeURIComponent(photo.id)}`;

  return (
    <EmbedGalleryCard
      photos={data.photos}
      template={data.template}
      layout={layout}
      columns={data.template.albumColumns}
      album={data.album}
      linkHrefFor={linkHrefFor}
    />
  );
}
