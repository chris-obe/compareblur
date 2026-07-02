import { ImagePlus } from 'lucide-react';
import type { AdminGalleryPhoto } from '../../lib/galleryApi';
import { useCachedAccountImage } from '../../lib/accountImageCache';

type CachedAccountImagePhoto = Pick<AdminGalleryPhoto, 'id' | 'src' | 'updatedAt'>;

export function CachedAccountImage({
  photo,
  accessToken,
  ownerKey,
  className,
  alt = '',
}: {
  photo: CachedAccountImagePhoto;
  accessToken: string | null;
  ownerKey: string | null;
  className: string;
  alt?: string;
}) {
  const src = useCachedAccountImage(photo, accessToken, ownerKey);

  if (!src) {
    return (
      <div className={`${className} flex items-center justify-center border border-line bg-faint text-muted`}>
        <ImagePlus size={16} strokeWidth={1.5} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
