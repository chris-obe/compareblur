import type { GalleryItem } from '../../lib/types';
import { formatLabel } from '../../lib/categories';
import { ReactionBar } from '../ui/ReactionBar';

interface Props {
  item: GalleryItem;
  onSelect: (item: GalleryItem) => void;
  hidden?: boolean; // active in the lightbox — hide the thumbnail so the morph isn't doubled
  registerAnchor: (id: string, el: HTMLElement | null) => void;
}

export function GalleryCard({ item, onSelect, hidden, registerAnchor }: Props) {
  return (
    <div className="group relative flex flex-col border border-line transition-colors hover:border-line-strong">
      {/* clickable image (the morph anchor box) */}
      <button type="button" onClick={() => onSelect(item)} className="block w-full text-left">
        <div
          ref={(el) => registerAnchor(item.id, el)}
          className="aspect-square w-full overflow-hidden bg-faint"
          style={{ opacity: hidden ? 0 : 1 }}
        >
          <img
            src={item.src}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover grayscale transition-[filter,transform] duration-300 group-hover:grayscale-0 group-hover:scale-[1.02]"
          />
        </div>
      </button>

      {/* reaction control — sibling of the click target (no nested buttons) */}
      <div className="absolute right-2 top-2 z-10">
        <ReactionBar photoId={item.id} mode="compact" />
      </div>

      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex flex-col gap-1 border-t border-line px-3 py-2 text-left"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-bold">{item.title}</span>
          <span className="label shrink-0">ƒ/{item.aperture}</span>
        </div>
        <div className="label truncate">
          {item.camera} · {item.focal}mm
        </div>
        <div className="label truncate opacity-70">{formatLabel(item.formatId)}</div>
      </button>
    </div>
  );
}
