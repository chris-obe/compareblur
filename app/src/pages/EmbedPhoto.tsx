import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PhotoEmbedCard } from '../components/embed/PhotoEmbedCard';
import { getEmbedPhoto, type EmbedPhotoResponse } from '../lib/galleryApi';

export function EmbedPhoto() {
  const { photoId = '' } = useParams();
  const [params] = useSearchParams();
  const albumSlug = params.get('album');
  const [data, setData] = useState<EmbedPhotoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getEmbedPhoto(photoId, albumSlug)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Embed failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [albumSlug, photoId]);

  const linkHref = useMemo(() => {
    if (data?.album?.slug) return `/g/${encodeURIComponent(data.album.slug)}/photo/${encodeURIComponent(photoId)}`;
    return `/gallery/photo/${encodeURIComponent(photoId)}`;
  }, [data?.album?.slug, photoId]);

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

  return <PhotoEmbedCard photo={data.photo} album={data.album} template={data.template.image} linkHref={linkHref} />;
}
