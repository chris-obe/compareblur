import { useParams } from 'react-router-dom';
import { AccountAlbumsManager } from '../components/albums/AccountAlbumsManager';

export function Albums() {
  const { albumSlug } = useParams();

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <AccountAlbumsManager mode="page" routeAlbumSlug={albumSlug} />
    </div>
  );
}
