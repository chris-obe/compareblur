import { useParams } from 'react-router-dom';
import { GalleryPage } from '../components/gallery/GalleryPage';

export function GalleryRoute() {
  const { photoId } = useParams();
  return <GalleryPage initialPhotoId={photoId} closePath="/" />;
}

export function AlbumGalleryRoute() {
  const { albumSlug = '', photoId } = useParams();
  return (
    <GalleryPage
      albumSlug={albumSlug}
      initialPhotoId={photoId}
      closePath={`/g/${encodeURIComponent(albumSlug)}`}
    />
  );
}
