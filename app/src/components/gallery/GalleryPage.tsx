import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categoryForFormat, type CategoryId } from '../../lib/categories';
import { GALLERY_SEED } from '../../data/gallery.seed';
import type { GalleryItem, ViewEntry } from '../../lib/types';
import { listGalleryPhotos } from '../../lib/galleryApi';
import { resolveGalleryFormat } from '../../lib/galleryFormat';
import { suggestGalleryMetadata } from '../../lib/galleryMetadata';
import { useCatalog } from '../../store/CatalogProvider';
import { FilterBar } from './FilterBar';
import { UploadBox } from './UploadBox';
import { GalleryGrid } from './GalleryGrid';
import { Lightbox } from './Lightbox';

function toEntry(item: GalleryItem): ViewEntry {
  const { format, fallbackUsed } = resolveGalleryFormat(item.formatId);

  return {
    id: item.id,
    title: item.title,
    metaLine: `${item.camera} · ${item.lens}`,
    src: item.src,
    format,
    focal: item.focal,
    aperture: item.aperture,
    guessed: fallbackUsed,
    morph: true,
  };
}

interface View {
  list: ViewEntry[];
  index: number;
}

export function GalleryPage() {
  const { cameras, lenses } = useCatalog();
  const [formats, setFormats] = useState<Set<CategoryId>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>(GALLERY_SEED);
  const objectUrl = useRef<string | null>(null);

  // live registry of grid-thumbnail DOM nodes, so the lightbox can morph open
  // from / closed to whichever image is currently selected.
  const anchors = useRef(new Map<string, HTMLElement>());
  const registerAnchor = useCallback((id: string, el: HTMLElement | null) => {
    if (el) anchors.current.set(id, el);
    else anchors.current.delete(id);
  }, []);
  const getAnchorRect = useCallback(
    (id: string) => anchors.current.get(id)?.getBoundingClientRect() ?? null,
    [],
  );

  useEffect(() => {
    let cancelled = false;
    listGalleryPhotos()
      .then((photos) => {
        if (cancelled) return;
        if (photos.length > 0) {
          setItems(photos);
        } else {
          setItems(GALLERY_SEED);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setItems(GALLERY_SEED);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (formats.size > 0) {
        const cat = categoryForFormat(item.formatId);
        if (!cat || !formats.has(cat)) return false;
      }
      if (tags.length > 0 && !tags.every((t) => item.tags.includes(t))) return false;
      return true;
    });
  }, [formats, items, tags]);

  const allTags = useMemo(() => [...new Set(items.flatMap((item) => item.tags))].sort(), [items]);

  const toggleFormat = (id: CategoryId) =>
    setFormats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const revoke = () => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  };

  const closeView = () => {
    setView(null);
    revoke();
  };

  const onSelectCard = (item: GalleryItem) => {
    revoke();
    const idx = filtered.findIndex((f) => f.id === item.id);
    setView({ list: filtered.map(toEntry), index: Math.max(0, idx) });
  };

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const metadata = await suggestGalleryMetadata(file, cameras, lenses);
      revoke();
      const preview = URL.createObjectURL(file);
      objectUrl.current = preview;
      const entry: ViewEntry = {
        id: 'upload',
        title: file.name,
        metaLine: `${metadata.camera} · ${metadata.lens} · shot ƒ/${metadata.aperture}`,
        src: preview,
        format: metadata.format,
        focal: metadata.focal,
        aperture: metadata.aperture,
        guessed: metadata.source.exif.guessedFormat && metadata.cameraConfidence === 'none',
        morph: false,
      };
      setView({ list: [entry], index: 0 });
    } finally {
      setBusy(false);
    }
  };

  const current = view ? view.list[view.index] : null;
  const activeId = current?.morph ? current.id : null;

  return (
    <div className="flex flex-col">
      <FilterBar
        formats={formats}
        toggleFormat={toggleFormat}
        tags={tags}
        allTags={allTags}
        addTag={addTag}
        removeTag={removeTag}
        resultCount={filtered.length}
      />
      <UploadBox onFile={onFile} busy={busy} />
      <GalleryGrid
        items={filtered}
        onSelect={onSelectCard}
        activeId={activeId}
        registerAnchor={registerAnchor}
      />

      {view && (
        <Lightbox
          list={view.list}
          index={view.index}
          onIndex={(i) => setView((v) => (v ? { ...v, index: i } : v))}
          onClose={closeView}
          getAnchorRect={getAnchorRect}
        />
      )}
    </div>
  );
}
