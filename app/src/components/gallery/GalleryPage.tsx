import { useMemo, useRef, useState } from 'react';
import { getFormat, type System } from '../../lib/engine';
import { categoryForFormat, type CategoryId } from '../../lib/categories';
import { GALLERY_SEED } from '../../data/gallery.seed';
import type { GalleryItem } from '../../lib/types';
import { extractExif } from '../../lib/exif';
import { FilterBar } from './FilterBar';
import { UploadBox } from './UploadBox';
import { GalleryGrid } from './GalleryGrid';
import { MatchDrawer, type Analysis } from './MatchDrawer';

export function GalleryPage() {
  const [formats, setFormats] = useState<Set<CategoryId>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const objectUrl = useRef<string | null>(null);

  const filtered = useMemo(() => {
    return GALLERY_SEED.filter((item) => {
      if (formats.size > 0) {
        const cat = categoryForFormat(item.formatId);
        if (!cat || !formats.has(cat)) return false;
      }
      if (tags.length > 0 && !tags.every((t) => item.tags.includes(t))) return false;
      return true;
    });
  }, [formats, tags]);

  const toggleFormat = (id: CategoryId) =>
    setFormats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const closeDrawer = () => {
    setAnalysis(null);
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  };

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const exif = await extractExif(file);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const preview = URL.createObjectURL(file);
      objectUrl.current = preview;

      const source: System = {
        format: getFormat(exif.formatId),
        focal: exif.focal ?? exif.focal35 ?? 50,
        aperture: exif.aperture ?? 1.8,
      };
      const camera = [exif.make, exif.model].filter(Boolean).join(' ') || 'Unknown camera';
      const lens = exif.lensModel ?? (exif.focal ? `${exif.focal}mm` : 'unknown lens');
      setAnalysis({
        title: file.name,
        metaLine: `${camera} · ${lens}${exif.aperture ? ` · ƒ/${exif.aperture}` : ''}`,
        previewSrc: preview,
        source,
        exif,
        guessed: exif.guessedFormat,
      });
    } finally {
      setBusy(false);
    }
  };

  const onSelectCard = (item: GalleryItem) => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    setAnalysis({
      title: item.title,
      metaLine: `${item.camera} · ${item.lens}`,
      previewSrc: item.src,
      source: { format: getFormat(item.formatId), focal: item.focal, aperture: item.aperture },
      guessed: false,
    });
  };

  return (
    <div className="flex flex-col">
      <FilterBar
        formats={formats}
        toggleFormat={toggleFormat}
        tags={tags}
        addTag={addTag}
        removeTag={removeTag}
        resultCount={filtered.length}
      />
      <UploadBox onFile={onFile} busy={busy} />
      <GalleryGrid items={filtered} onSelect={onSelectCard} />
      <MatchDrawer analysis={analysis} onClose={closeDrawer} />
    </div>
  );
}
