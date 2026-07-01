import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryForFormat, type CategoryId } from '../../lib/categories';
import { GALLERY_SEED } from '../../data/gallery.seed';
import type { GalleryItem, ViewEntry } from '../../lib/types';
import { ApiError, getGalleryAlbum, listGalleryPhotos, type GalleryAlbum } from '../../lib/galleryApi';
import { resolveGalleryFormat } from '../../lib/galleryFormat';
import { suggestGalleryMetadata } from '../../lib/galleryMetadata';
import { useCatalog } from '../../store/CatalogProvider';
import { useReactions } from '../../store/ReactionsProvider';
import { Button } from '../ui/Button';
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
    camera: item.camera,
    lens: item.lens,
    formatId: item.formatId,
    format,
    focal: item.focal,
    aperture: item.aperture,
    subjectPreset: item.subjectPreset,
    subjectWidthM: item.subjectWidthM,
    shutterSpeed: item.shutterSpeed,
    iso: item.iso,
    capturedAt: item.capturedAt,
    guessed: fallbackUsed,
    morph: true,
  };
}

interface View {
  list: ViewEntry[];
  index: number;
}

interface GalleryPageProps {
  albumSlug?: string;
  initialPhotoId?: string;
  closePath?: string;
}

export function GalleryPage({ albumSlug, initialPhotoId, closePath }: GalleryPageProps = {}) {
  const navigate = useNavigate();
  const { cameras, lenses } = useCatalog();
  const { registerCounts } = useReactions();
  const [formats, setFormats] = useState<Set<CategoryId>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>(GALLERY_SEED);
  const [album, setAlbum] = useState<GalleryAlbum | null>(null);
  const [albumPassword, setAlbumPassword] = useState('');
  const [albumPasswordAttempt, setAlbumPasswordAttempt] = useState<{ value: string; nonce: number } | null>(null);
  const [albumPasswordRequired, setAlbumPasswordRequired] = useState(false);
  const [albumPasswordMessage, setAlbumPasswordMessage] = useState('');
  const objectUrl = useRef<string | null>(null);
  const openedInitialId = useRef<string | null>(null);

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
    if (albumSlug) {
      setAlbum(null);
      setItems([]);
    }
    const load = albumSlug
      ? getGalleryAlbum(albumSlug, { password: albumPasswordAttempt?.value ?? undefined }).then((data) => {
          setAlbumPasswordRequired(false);
          setAlbumPasswordMessage('');
          setAlbum(data.album);
          return data.photos;
        })
      : listGalleryPhotos().then((photos) => {
          setAlbum(null);
          return photos;
        });

    load
      .then((photos) => {
        if (cancelled) return;
        if (albumSlug) {
          setItems(photos);
          registerCounts(photos);
        } else if (photos.length > 0) {
          setItems(photos);
          registerCounts(photos);
        } else {
          setItems(GALLERY_SEED);
          registerCounts(GALLERY_SEED);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (albumSlug && error instanceof ApiError) {
        const body = typeof error.body === 'object' && error.body != null ? error.body as { requiresPassword?: unknown } : null;
        if (body?.requiresPassword) {
          setAlbumPasswordRequired(true);
          setAlbumPasswordMessage(albumPasswordAttempt?.value ? error.message : 'Album password required');
            setAlbum(null);
            setItems([]);
            registerCounts([]);
            return;
          }
        }
        if (albumSlug) {
          setAlbum(null);
          setItems([]);
          registerCounts([]);
        } else {
          setItems(GALLERY_SEED);
          registerCounts(GALLERY_SEED);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [albumPasswordAttempt, albumSlug, registerCounts]);

  useEffect(() => {
    setAlbumPassword('');
    setAlbumPasswordAttempt(null);
    setAlbumPasswordRequired(false);
    setAlbumPasswordMessage('');
  }, [albumSlug]);

  useEffect(() => {
    openedInitialId.current = null;
  }, [initialPhotoId]);

  useEffect(() => {
    if (!initialPhotoId || openedInitialId.current === initialPhotoId || items.length === 0) return;
    const index = items.findIndex((item) => item.id === initialPhotoId);
    if (index < 0) return;
    openedInitialId.current = initialPhotoId;
    setView({ list: items.map(toEntry), index });
  }, [initialPhotoId, items]);

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
    if (closePath && initialPhotoId) navigate(closePath, { replace: true });
  };

  const onSelectCard = (item: GalleryItem) => {
    revoke();
    if (albumSlug) {
      navigate(`/g/${encodeURIComponent(albumSlug)}/photo/${encodeURIComponent(item.id)}`);
    } else {
      navigate(`/gallery/photo/${encodeURIComponent(item.id)}`);
    }
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
        camera: metadata.camera,
        lens: metadata.lens,
        formatId: metadata.formatId,
        format: metadata.format,
        focal: metadata.focal,
        aperture: metadata.aperture,
        shutterSpeed: metadata.shutterSpeed,
        iso: metadata.iso,
        capturedAt: metadata.capturedAt,
        subjectPreset: undefined,
        subjectWidthM: undefined,
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
      {album && (
        <div className="border-b border-line px-6 py-5">
          <div className="label mb-2">{album.hasPassword ? 'Protected album' : 'Album'}</div>
          <h2 className="text-2xl font-bold tracking-tight">{album.title}</h2>
          {album.description && <p className="mt-2 max-w-2xl text-sm text-muted">{album.description}</p>}
          {album.ownerName && <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted">Shared by {album.ownerName}</p>}
        </div>
      )}
      {albumSlug && albumPasswordRequired && !album && (
        <section className="border-b border-line px-6 py-8">
          <div className="max-w-md space-y-4">
            <div>
              <div className="label mb-2">Protected album</div>
              <h2 className="text-2xl font-bold tracking-tight">Enter album password</h2>
              <p className="mt-2 text-sm text-muted">
                This shared album is public, but it requires a password before the photos can load.
              </p>
            </div>
            <label className="block">
              <span className="label mb-2 block">Password</span>
              <input
                type="password"
                value={albumPassword}
                onChange={(event) => {
                  setAlbumPassword(event.target.value);
                  setAlbumPasswordMessage('');
                }}
                className="h-10 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
              />
            </label>
            {albumPasswordMessage && <div className="text-xs text-muted">{albumPasswordMessage}</div>}
            <Button
              variant="solid"
              onClick={() => setAlbumPasswordAttempt({ value: albumPassword.trim(), nonce: Date.now() })}
              disabled={!albumPassword.trim()}
            >
              Unlock album
            </Button>
          </div>
        </section>
      )}
      {albumSlug && albumPasswordRequired && !album ? null : (
        <>
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
        </>
      )}
    </div>
  );
}
