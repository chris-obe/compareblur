import type { GalleryItem } from '../../lib/types';
import { GalleryCard } from './GalleryCard';

interface Props {
  items: GalleryItem[];
  onSelect: (item: GalleryItem) => void;
}

export function GalleryGrid({ items, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center px-6 py-20">
        <div className="border border-line px-8 py-10 text-center text-xs text-muted">
          No images match these filters.
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <GalleryCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}
