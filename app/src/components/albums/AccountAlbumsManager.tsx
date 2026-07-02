import {
  useEffect,
  lazy,
  useMemo,
  useRef,
  useState,
  Suspense,
  type Dispatch,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Code2,
  EllipsisVertical,
  Eye,
  FolderOpen,
  Globe,
  GitCompare,
  Grid3X3,
  ImagePlus,
  Lock,
  Plus,
  RefreshCw,
  Rows3,
  Save,
  Send,
  Settings2,
  Square,
  Upload,
  X,
} from 'lucide-react';
import { userTokenParams } from '../../auth/config';
import {
  createAccountGalleryAlbum,
  getPublicEmbedTemplate,
  listAccountGalleryAlbums,
  listAccountGalleryPhotos,
  publishAccountGalleryPhoto,
  unpublishAccountGalleryPhoto,
  updateAccountGalleryAlbum,
  updateAccountGalleryPhoto,
  uploadAccountGalleryPhoto,
  type AdminGalleryPhoto,
  type GalleryAlbumMutation,
  type GalleryAlbumPhotoVisibility,
  type EmbedTemplate,
  type GalleryAlbum,
  type GalleryAlbumStatus,
} from '../../lib/galleryApi';
import { useCachedAccountImageUrls, usePruneCachedAccountImages } from '../../lib/accountImageCache';
import { resolveGalleryFormat } from '../../lib/galleryFormat';
import { suggestGalleryMetadata } from '../../lib/galleryMetadata';
import {
  GALLERY_UPLOAD_MAX_BYTES,
  GALLERY_UPLOAD_MAX_LONG_EDGE,
  processGalleryUploadImage,
  type ImageProcessingProgress,
} from '../../lib/imageProcessing';
import { DEFAULT_SUBJECT_DISTANCE_PRESET_ID } from '../../lib/subjectDistance';
import type { ViewEntry } from '../../lib/types';
import { useCatalog } from '../../store/CatalogProvider';
import { useCompare, nextSystemId } from '../../store/CompareProvider';
import { useKit } from '../../store/KitProvider';
import { CachedAccountImage } from '../gallery/CachedAccountImage';
import { GallerySurface } from '../gallery/GallerySurface';
import { PhotoOpticsPanel } from '../gallery/PhotoOpticsPanel';
import {
  metadataRowFromPhoto,
  normalizedFormatId,
  photoMetadataChanged,
  photoMetadataUpdatePayload,
  type PhotoMetadataCatalog,
  type PhotoMetadataRow,
} from '../gallery/metadata/photoMetadataModel';
import { EmbedCodeDialog } from '../embed/EmbedCodeDialog';
import { PhotoLightbox } from '../lightbox/PhotoLightbox';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Select } from '../ui/Select';
import { TextField } from '../ui/TextField';

const PhotoMetadataGrid = lazy(() => import('../gallery/metadata/PhotoMetadataGrid').then((module) => ({ default: module.PhotoMetadataGrid })));
const ALBUM_MODE_EASE = [0.22, 1, 0.36, 1] as const;

function albumModeVariants(direction: 1 | -1): Variants {
  return {
    enter: {
      opacity: 0,
      x: direction * 18,
    },
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.24, ease: ALBUM_MODE_EASE },
    },
    exit: {
      opacity: 0,
      x: direction * -14,
      transition: { duration: 0.18, ease: ALBUM_MODE_EASE },
    },
  };
}

const staggerContainerVariants: Variants = {
  enter: {},
  center: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

const staggerItemVariants: Variants = {
  enter: { opacity: 0, y: 10 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: ALBUM_MODE_EASE },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.14, ease: ALBUM_MODE_EASE },
  },
};

function useAlbumModeDirection(mode: AlbumDefaultMode): 1 | -1 {
  const previous = useRef(mode);
  const [direction, setDirection] = useState<1 | -1>(mode === 'edit' ? 1 : -1);

  useEffect(() => {
    if (previous.current === mode) return;
    setDirection(mode === 'edit' ? 1 : -1);
    previous.current = mode;
  }, [mode]);

  return direction;
}

interface Props {
  mode: 'page' | 'settings';
  routeAlbumSlug?: string;
}

interface AlbumDraftPhoto {
  photoId: string;
  visibility: GalleryAlbumPhotoVisibility;
  caption?: string | null;
}

interface AlbumDraft {
  slug: string;
  title: string;
  description: string;
  status: GalleryAlbumStatus;
  hasPassword: boolean;
  albumPassword: string;
  coverPhotoId: string;
  photos: AlbumDraftPhoto[];
}

interface AlbumPhotoView extends AdminGalleryPhoto {
  photoId: string;
  visibility: GalleryAlbumPhotoVisibility;
  caption?: string;
  sortOrder: number;
}

type AlbumMutation = GalleryAlbumMutation;

type PhotoDraft = PhotoMetadataRow;

const EMPTY_ALBUM: AlbumDraft = {
  slug: '',
  title: '',
  description: '',
  status: 'draft',
  hasPassword: false,
  albumPassword: '',
  coverPhotoId: '',
  photos: [],
};

type AlbumSubtitleField = 'updated' | 'created' | 'published' | 'photo-count' | 'status' | 'description';
type AlbumDefaultMode = 'view' | 'edit';
type AlbumEditSurface = 'photos' | 'details';

interface AlbumDisplayPreferences {
  albumSubtitle: AlbumSubtitleField;
  showPhotoTitles: boolean;
  defaultAlbumMode: AlbumDefaultMode;
}

type EmbedRequest =
  | { mode: 'photo'; photo: { id: string; title: string }; albumSlug?: string }
  | { mode: 'selection'; photoIds: string[]; albumSlug?: string; albumTitle?: string }
  | { mode: 'album'; albumSlug: string; albumTitle: string };

const ALBUM_PREFS_KEY = 'blur.albumDisplayPreferences';
const DEFAULT_ALBUM_PREFS: AlbumDisplayPreferences = {
  albumSubtitle: 'updated',
  showPhotoTitles: false,
  defaultAlbumMode: 'view',
};

export function AccountAlbumsManager({ mode, routeAlbumSlug }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect, user } = useAuth0();
  const { cameras, lenses } = useCatalog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownerKey = user?.sub ?? null;
  const isNewRoute = mode === 'page' && routeAlbumSlug === 'new';
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [photos, setPhotos] = useState<AdminGalleryPhoto[]>([]);
  const [selectedAlbumSlug, setSelectedAlbumSlug] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [albumDraft, setAlbumDraft] = useState<AlbumDraft>(EMPTY_ALBUM);
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, PhotoDraft>>({});
  const [pageSurface, setPageSurface] = useState<'albums' | 'all'>(() => {
    if (typeof window === 'undefined') return 'albums';
    return window.localStorage.getItem('blur.albumPageSurface') === 'all' ? 'all' : 'albums';
  });
  const [preferences, setPreferences] = useState<AlbumDisplayPreferences>(readAlbumPreferences);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [viewPhotoId, setViewPhotoId] = useState<string | null>(null);
  const [embedTemplate, setEmbedTemplate] = useState<EmbedTemplate | null>(null);
  const [embedRequest, setEmbedRequest] = useState<EmbedRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ImageProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAlbum = albums.find((album) => album.slug === selectedAlbumSlug) ?? null;
  const modeParam = searchParams.get('mode');
  const detailMode: AlbumDefaultMode = modeParam === 'edit' || (!modeParam && preferences.defaultAlbumMode === 'edit') || isNewRoute ? 'edit' : 'view';
  const albumPhotos = useMemo(
    () => albumDraft.photos
      .map((item, index) => {
        const photo = photos.find((entry) => entry.id === item.photoId);
        return photo ? albumPhotoView(photo, item, index) : null;
      })
      .filter((photo): photo is AlbumPhotoView => photo != null),
    [albumDraft.photos, photos],
  );
  const availablePhotos = useMemo(
    () => photos.filter((photo) => !albumDraft.photos.some((item) => item.photoId === photo.id)),
    [albumDraft.photos, photos],
  );
  const lightboxPhotos = useMemo(() => {
    if (selectedAlbum) {
      return selectedAlbum.photos
        .map((item) => photos.find((photo) => photo.id === item.id))
        .filter((photo): photo is AdminGalleryPhoto => !!photo);
    }
    return photos;
  }, [photos, selectedAlbum]);
  const lightboxIndex = viewPhotoId ? lightboxPhotos.findIndex((photo) => photo.id === viewPhotoId) : -1;
  const selectedApprovedPhotoIds = useMemo(
    () => photos
      .filter((photo) => selectedPhotoIds.has(photo.id) && photo.galleryStatus === 'approved')
      .map((photo) => photo.id),
    [photos, selectedPhotoIds],
  );
  const embedReady = !!embedTemplate;

  usePruneCachedAccountImages(ownerKey, photos);

  const getToken = async () => getAccessTokenSilently({ authorizationParams: userTokenParams });

  const load = async () => {
    if (!isAuthenticated) return null;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      const [nextPhotos, nextAlbums] = await Promise.all([
        listAccountGalleryPhotos(token),
        listAccountGalleryAlbums(token),
      ]);
      setPhotos(nextPhotos);
      setAlbums(nextAlbums);
      setPhotoDrafts(Object.fromEntries(nextPhotos.map((photo) => [photo.id, draftFromPhoto(photo)])));
      if (isNewRoute) {
        setSelectedAlbumSlug('');
        setAlbumDraft(EMPTY_ALBUM);
      } else if (mode === 'page' && routeAlbumSlug) {
        const nextSelected = nextAlbums.find((album) => album.slug === routeAlbumSlug);
        if (nextSelected) {
          setSelectedAlbumSlug(nextSelected.slug);
          setAlbumDraft(draftFromAlbum(nextSelected));
        }
      } else if (selectedAlbumSlug) {
        const nextSelected = nextAlbums.find((album) => album.slug === selectedAlbumSlug);
        if (nextSelected) setAlbumDraft(draftFromAlbum(nextSelected));
      } else if (mode === 'settings' && nextAlbums[0]) {
        setSelectedAlbumSlug(nextAlbums[0].slug);
        setAlbumDraft(draftFromAlbum(nextAlbums[0]));
      } else if (mode === 'page') {
        setSelectedAlbumSlug('');
        setAlbumDraft(EMPTY_ALBUM);
      }
      return { photos: nextPhotos, albums: nextAlbums };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Albums failed to load');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    getPublicEmbedTemplate()
      .then((template) => {
        if (!cancelled) setEmbedTemplate(template);
      })
      .catch(() => {
        if (!cancelled) setEmbedTemplate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem('blur.albumPageSurface', pageSurface);
  }, [pageSurface]);

  useEffect(() => {
    if (selectedPhotoIds.size === 0) setSelectionAnchorId(null);
  }, [selectedPhotoIds]);

  useEffect(() => {
    writeAlbumPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (mode !== 'page') return;
    if (isNewRoute) {
      setSelectedAlbumSlug('');
      setAlbumDraft(EMPTY_ALBUM);
      return;
    }
    if (!routeAlbumSlug) {
      setSelectedAlbumSlug('');
      setAlbumDraft(EMPTY_ALBUM);
      return;
    }
    const album = albums.find((item) => item.slug === routeAlbumSlug);
    if (album) selectAlbum(album);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeAlbumSlug, albums, mode, isNewRoute]);

  const selectAlbum = (album: GalleryAlbum | null) => {
    setSelectedPhotoIds(new Set());
    if (!album) {
      setSelectedAlbumSlug('');
      setAlbumDraft(EMPTY_ALBUM);
      return;
    }
    setSelectedAlbumSlug(album.slug);
    setAlbumDraft(draftFromAlbum(album));
  };

  const startNewAlbum = () => {
    selectAlbum(null);
    if (mode === 'page') {
      navigate('/albums/new?mode=edit');
      return;
    }
  };

  const uploadFiles = async (files: FileList | File[] | null) => {
    const incoming = files ? Array.from(files) : [];
    if (incoming.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      const uploaded: AdminGalleryPhoto[] = [];
      for (const file of incoming) {
        const metadata = await suggestGalleryMetadata(file, cameras, lenses);
        const processed = await processGalleryUploadImage(file, setProgress);
        const form = new FormData();
        form.set('id', `photo-${crypto.randomUUID()}`);
        form.set('file', processed.file);
        form.set('title', metadata.title);
        form.set('camera', metadata.camera);
        form.set('cameraCatalogId', metadata.cameraCatalogId ?? '');
        form.set('lens', metadata.lens);
        form.set('lensCatalogId', metadata.lensCatalogId ?? '');
        form.set('formatId', normalizedFormatId(metadata.formatId));
        form.set('focal', String(metadata.focal));
        form.set('aperture', String(metadata.aperture));
        form.set('subjectPreset', DEFAULT_SUBJECT_DISTANCE_PRESET_ID);
        form.set('shutterSpeed', metadata.shutterSpeed ?? '');
        form.set('iso', metadata.iso != null ? String(metadata.iso) : '');
        form.set('capturedAt', metadata.capturedAt ?? '');
        form.set('width', String(processed.width));
        form.set('height', String(processed.height));
        form.set('metadataSource', JSON.stringify({
          ...metadata.source,
          processing: {
            originalBytes: processed.originalBytes,
            processedBytes: processed.processedBytes,
            width: processed.width,
            height: processed.height,
            contentType: processed.contentType,
            maxLongEdge: GALLERY_UPLOAD_MAX_LONG_EDGE,
            maxBytes: GALLERY_UPLOAD_MAX_BYTES,
          },
        }));
        uploaded.push(await uploadAccountGalleryPhoto(form, token));
      }

      const uploadedIds = uploaded.map((photo) => photo.id);
      const nextDraft = addPhotosToAlbumDraft(albumDraft, uploadedIds);
      setPhotos((current) => mergePhotos(current, uploaded));
      setPhotoDrafts((current) => ({
        ...current,
        ...Object.fromEntries(uploaded.map((photo) => [photo.id, draftFromPhoto(photo)])),
      }));
      setAlbumDraft(nextDraft);

      if (selectedAlbumSlug && nextDraft.title.trim()) {
        const album = await updateAccountGalleryAlbum(selectedAlbumSlug, albumPayload(nextDraft), token);
        setAlbums((current) => replaceAlbum(current, album));
        selectAlbum(album);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveAlbum = async () => {
    if (!albumDraft.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      const updatedPhotos: AdminGalleryPhoto[] = [];
      for (const photo of albumPhotos) {
        const draft = photoDrafts[photo.id];
        if (!draft || !photoDraftChanged(photo, draft)) continue;
        updatedPhotos.push(await updateAccountGalleryPhoto(photo.id, photoUpdatePayload(photo, draft), token));
      }
      if (updatedPhotos.length > 0) {
        setPhotos((current) => mergePhotos(current, updatedPhotos));
        setPhotoDrafts((current) => ({
          ...current,
          ...Object.fromEntries(updatedPhotos.map((photo) => [photo.id, draftFromPhoto(photo)])),
        }));
      }
      const album = selectedAlbumSlug
        ? await updateAccountGalleryAlbum(selectedAlbumSlug, albumPayload(albumDraft), token)
        : await createAccountGalleryAlbum(albumPayload(albumDraft), token);
      const next = await load();
      const latest = next?.albums.find((item) => item.slug === album.slug) ?? album;
      selectAlbum(latest);
      if (mode === 'page') navigate(`/albums/${encodeURIComponent(latest.slug)}?mode=edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Album save failed');
    } finally {
      setBusy(false);
    }
  };

  const patchAlbum = async (
    slug: string,
    updates: AlbumMutation,
  ) => {
    const token = await getToken();
    setAccessToken(token);
    const updated = await updateAccountGalleryAlbum(slug, updates, token);
    setAlbums((current) => replaceAlbum(current, updated));
    if (selectedAlbumSlug === slug) {
      setSelectedAlbumSlug(updated.slug);
      setAlbumDraft(draftFromAlbum(updated));
    }
    return updated;
  };

  const submitSelectedToGallery = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      for (const id of selectedPhotoIds) await publishAccountGalleryPhoto(id, token);
      setSelectedPhotoIds(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish request failed');
    } finally {
      setBusy(false);
    }
  };

  const withdrawSelectedFromGallery = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      for (const id of selectedPhotoIds) await unpublishAccountGalleryPhoto(id, token);
      setSelectedPhotoIds(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unpublish request failed');
    } finally {
      setBusy(false);
    }
  };

  const publishOne = async (photoId: string) => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      await publishAccountGalleryPhoto(photoId, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish request failed');
    } finally {
      setBusy(false);
    }
  };

  const openSelectionEmbed = (options: { photoIds?: string[]; albumSlug?: string; albumTitle?: string } = {}) => {
    const photoIds = options.photoIds ?? selectedApprovedPhotoIds;
    if (photoIds.length === 0) return;
    setEmbedRequest({
      mode: 'selection',
      photoIds,
      albumSlug: options.albumSlug,
      albumTitle: options.albumTitle,
    });
  };

  const openAlbumEmbed = (album: GalleryAlbum) => {
    if (album.status !== 'published') return;
    setEmbedRequest({ mode: 'album', albumSlug: album.slug, albumTitle: album.title });
  };

  if (!isAuthenticated) {
    return (
      <div className="border border-line p-6">
        <div className="mb-3 text-sm font-bold">Sign in to manage albums</div>
        <Button onClick={() => loginWithRedirect({ appState: { returnTo: '/albums' } })}>Sign in</Button>
      </div>
    );
  }

  const manager = (
    <AlbumBuilder
      bounded={mode === 'page'}
      albums={albums}
      photos={photos}
      availablePhotos={availablePhotos}
      albumPhotos={albumPhotos}
      selectedAlbumSlug={selectedAlbumSlug}
      selectedPhotoIds={selectedPhotoIds}
      selectionAnchorId={selectionAnchorId}
      albumDraft={albumDraft}
      photoDrafts={photoDrafts}
      catalog={{ cameras, lenses }}
      accessToken={accessToken}
      ownerKey={ownerKey}
      fileInputRef={fileInputRef}
      loading={loading}
      busy={busy}
      progress={progress}
      error={error}
      selectAlbum={selectAlbum}
      startNewAlbum={startNewAlbum}
      setAlbumDraft={setAlbumDraft}
      setDrafts={setPhotoDrafts}
      setSelectedPhotoIds={setSelectedPhotoIds}
      setSelectionAnchorId={setSelectionAnchorId}
      uploadFiles={uploadFiles}
      saveAlbum={saveAlbum}
      submitSelectedToGallery={submitSelectedToGallery}
      withdrawSelectedFromGallery={withdrawSelectedFromGallery}
      reload={load}
    />
  );

  const showPageHeader = !(mode === 'page' && selectedAlbum);

  return (
    <section className={mode === 'page' ? 'flex h-full min-h-0 flex-col gap-5' : 'space-y-5'}>
      {showPageHeader && (
        <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="label mb-2">Albums</div>
            <h2 className="text-2xl font-bold tracking-tight">Your photos and albums</h2>
          </div>
        </div>
      )}

      {mode === 'page' && (
        <div className="min-h-0 flex-1">
          <AlbumViewer
            albums={albums}
            photos={photos}
            availablePhotos={availablePhotos}
            albumPhotos={albumPhotos}
            selectedAlbum={selectedAlbum}
            isNewRoute={isNewRoute}
            detailMode={detailMode}
            pageSurface={pageSurface}
            preferences={preferences}
            selectedPhotoIds={selectedPhotoIds}
            selectionAnchorId={selectionAnchorId}
            selectedGalleryApprovedCount={selectedApprovedPhotoIds.length}
            albumDraft={albumDraft}
            photoDrafts={photoDrafts}
            catalog={{ cameras, lenses }}
            accessToken={accessToken}
            ownerKey={ownerKey}
            fileInputRef={fileInputRef}
            loading={loading}
            busy={busy}
            progress={progress}
            embedReady={embedReady}
            error={error}
            manager={manager}
            selectAlbum={selectAlbum}
            startNewAlbum={startNewAlbum}
            reload={load}
            setDetailMode={(nextMode) => setSearchParams(nextMode === 'edit' ? { mode: 'edit' } : {})}
            setPageSurface={setPageSurface}
            setSelectedPhotoIds={setSelectedPhotoIds}
            setSelectionAnchorId={setSelectionAnchorId}
            setAlbumDraft={setAlbumDraft}
            setDrafts={setPhotoDrafts}
            setViewPhotoId={setViewPhotoId}
            uploadFiles={uploadFiles}
            saveAlbum={saveAlbum}
            submitSelectedToGallery={submitSelectedToGallery}
            withdrawSelectedFromGallery={withdrawSelectedFromGallery}
            publishOne={publishOne}
            patchAlbum={patchAlbum}
            onEmbedSelected={openSelectionEmbed}
            onEmbedPhoto={(photo, albumSlug) => setEmbedRequest({
              mode: 'photo',
              photo: { id: photo.id, title: photo.title },
              albumSlug,
            })}
            onEmbedAlbum={openAlbumEmbed}
            goToAlbums={() => navigate('/albums')}
            openAlbum={(album) => navigate(`/albums/${encodeURIComponent(album.slug)}`)}
          />
        </div>
      )}

      {mode === 'settings' && (
        <>
          <AlbumPreferencesPanel preferences={preferences} onChange={setPreferences} />
          {manager}
        </>
      )}

      {mode === 'page' && lightboxIndex >= 0 && (
        <PhotoLightbox
          entries={lightboxPhotos}
          index={lightboxIndex}
          onIndex={(nextIndex) => setViewPhotoId(lightboxPhotos[nextIndex]?.id ?? null)}
          onClose={() => setViewPhotoId(null)}
          renderImage={(photo, className) => (
            <AccountPhotoImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className={className} />
          )}
          renderInfo={(photo) => (
            <AccountLightboxInfo
              photo={photo}
              busy={busy}
              canEmbed={selectedAlbum ? selectedAlbum.status === 'published' && !selectedAlbum.hasPassword : photo.galleryStatus === 'approved'}
              onEdit={() => {
                setViewPhotoId(null);
                if (selectedAlbum) navigate(`/albums/${encodeURIComponent(selectedAlbum.slug)}?mode=edit`);
                else navigate('/albums?mode=edit');
              }}
              onPublish={() => void publishOne(photo.id)}
              onEmbed={() => setEmbedRequest({
                mode: 'photo',
                photo: { id: photo.id, title: photo.title },
                albumSlug: selectedAlbum?.slug,
              })}
              embedReady={embedReady}
            />
          )}
        />
      )}

      {embedTemplate && embedRequest && (
        <EmbedCodeDialog
          mode={embedRequest.mode}
          template={embedTemplate}
          onClose={() => setEmbedRequest(null)}
          photo={embedRequest.mode === 'photo' ? embedRequest.photo : undefined}
          albumSlug={embedRequest.mode === 'photo' ? embedRequest.albumSlug : embedRequest.mode === 'album' ? embedRequest.albumSlug : undefined}
          albumTitle={embedRequest.mode === 'album' ? embedRequest.albumTitle : undefined}
          photoIds={embedRequest.mode === 'selection' ? embedRequest.photoIds : undefined}
        />
      )}
    </section>
  );
}

function AlbumBuilder({
  bounded,
  albums,
  photos,
  availablePhotos,
  albumPhotos,
  selectedAlbumSlug,
  selectedPhotoIds,
  selectionAnchorId,
  albumDraft,
  photoDrafts,
  catalog,
  accessToken,
  ownerKey,
  fileInputRef,
  loading,
  busy,
  progress,
  error,
  selectAlbum,
  startNewAlbum,
  setAlbumDraft,
  setDrafts,
  setSelectedPhotoIds,
  setSelectionAnchorId,
  uploadFiles,
  saveAlbum,
  submitSelectedToGallery,
  withdrawSelectedFromGallery,
  reload,
}: {
  bounded: boolean;
  albums: GalleryAlbum[];
  photos: AdminGalleryPhoto[];
  availablePhotos: AdminGalleryPhoto[];
  albumPhotos: AlbumPhotoView[];
  selectedAlbumSlug: string;
  selectedPhotoIds: Set<string>;
  selectionAnchorId: string | null;
  albumDraft: AlbumDraft;
  photoDrafts: Record<string, PhotoDraft>;
  catalog: PhotoMetadataCatalog;
  accessToken: string | null;
  ownerKey: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  loading: boolean;
  busy: boolean;
  progress: ImageProcessingProgress | null;
  error: string | null;
  selectAlbum: (album: GalleryAlbum | null) => void;
  startNewAlbum: () => void;
  setAlbumDraft: Dispatch<SetStateAction<AlbumDraft>>;
  setDrafts: Dispatch<SetStateAction<Record<string, PhotoDraft>>>;
  setSelectedPhotoIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectionAnchorId: Dispatch<SetStateAction<string | null>>;
  uploadFiles: (files: FileList | File[] | null) => Promise<void>;
  saveAlbum: () => Promise<void>;
  submitSelectedToGallery: () => Promise<void>;
  withdrawSelectedFromGallery: () => Promise<void>;
  reload: () => Promise<{ photos: AdminGalleryPhoto[]; albums: GalleryAlbum[] } | null>;
}) {
  const rootClass = bounded ? 'flex h-full min-h-0 flex-col gap-4' : 'space-y-4';
  const gridClass = bounded
    ? 'grid min-h-0 flex-1 gap-4 xl:grid-cols-[14rem_minmax(0,1fr)_18rem] xl:items-start xl:overflow-hidden'
    : 'grid gap-4 xl:grid-cols-[14rem_minmax(0,1fr)_18rem]';
  const albumNavClass = bounded
    ? 'space-y-3 xl:flex xl:h-full xl:flex-col xl:overflow-hidden'
    : 'space-y-3';
  const albumListClass = bounded
    ? 'divide-y divide-line border border-line xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:[scrollbar-gutter:stable]'
    : 'divide-y divide-line border border-line';
  const editorClass = bounded
    ? 'min-w-0 space-y-5 xl:h-full xl:overflow-y-auto xl:pr-2 xl:[scrollbar-gutter:stable]'
    : 'min-w-0 space-y-5';
  const optionsClass = bounded
    ? 'space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1 xl:[scrollbar-gutter:stable]'
    : 'space-y-4';

  return (
    <div className={rootClass}>
      {error && <ErrorBanner message={error} />}
      {progress && <UploadProgress progress={progress} />}

      <div className={gridClass}>
        <aside className={albumNavClass}>
          <AlbumNav
            albums={albums}
            selectedAlbumSlug={selectedAlbumSlug}
            listClassName={albumListClass}
            onSelectAlbum={selectAlbum}
            onNewAlbum={startNewAlbum}
          />
        </aside>

        <AlbumEditWorkspace
          availablePhotos={availablePhotos}
          albumPhotos={albumPhotos}
          photos={photos}
          selectedAlbumSlug={selectedAlbumSlug}
          selectedPhotoIds={selectedPhotoIds}
          albumDraft={albumDraft}
          photoDrafts={photoDrafts}
          catalog={catalog}
          accessToken={accessToken}
          ownerKey={ownerKey}
          fileInputRef={fileInputRef}
          loading={loading}
          busy={busy}
          setAlbumDraft={setAlbumDraft}
          setDrafts={setDrafts}
          setSelectedPhotoIds={setSelectedPhotoIds}
          setSelectionAnchorId={setSelectionAnchorId}
          uploadFiles={uploadFiles}
          saveAlbum={saveAlbum}
          submitSelectedToGallery={submitSelectedToGallery}
          withdrawSelectedFromGallery={withdrawSelectedFromGallery}
          reload={reload}
          editorClass={editorClass}
          optionsClass={optionsClass}
          selectionAnchorId={selectionAnchorId}
        />
      </div>
    </div>
  );
}

function AlbumNav({
  albums,
  selectedAlbumSlug,
  listClassName,
  onSelectAlbum,
  onNewAlbum,
}: {
  albums: GalleryAlbum[];
  selectedAlbumSlug: string;
  listClassName: string;
  onSelectAlbum: (album: GalleryAlbum) => void;
  onNewAlbum: () => void;
}) {
  return (
    <>
      <Button variant="solid" className="w-full" onClick={onNewAlbum}>
        <Plus size={14} strokeWidth={1.5} />
        New album
      </Button>
      <div className={listClassName}>
        {albums.map((album) => (
          <button
            key={album.slug}
            type="button"
            onClick={() => onSelectAlbum(album)}
            className={[
              'block w-full px-3 py-3 text-left transition-colors',
              selectedAlbumSlug === album.slug ? 'bg-fg text-bg' : 'hover:bg-faint',
            ].join(' ')}
          >
            <div className="truncate text-xs font-bold">{album.title}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
              {album.photos.length} photos · {albumVisibilityLabel(album.status)}
            </div>
          </button>
        ))}
        {albums.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted">
            Albums you create appear here.
          </div>
        )}
      </div>
    </>
  );
}

function AlbumEditWorkspace({
  availablePhotos,
  albumPhotos,
  photos,
  selectedAlbumSlug,
  selectedPhotoIds,
  selectionAnchorId,
  albumDraft,
  photoDrafts,
  catalog,
  accessToken,
  ownerKey,
  fileInputRef,
  loading,
  busy,
  setAlbumDraft,
  setDrafts,
  setSelectedPhotoIds,
  setSelectionAnchorId,
  uploadFiles,
  saveAlbum,
  submitSelectedToGallery,
  withdrawSelectedFromGallery,
  reload,
  editorClass,
  optionsClass,
  animated = false,
  showAlbumFields = true,
}: {
  availablePhotos: AdminGalleryPhoto[];
  albumPhotos: AlbumPhotoView[];
  photos: AdminGalleryPhoto[];
  selectedAlbumSlug: string;
  selectedPhotoIds: Set<string>;
  selectionAnchorId: string | null;
  albumDraft: AlbumDraft;
  photoDrafts: Record<string, PhotoDraft>;
  catalog: PhotoMetadataCatalog;
  accessToken: string | null;
  ownerKey: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  loading: boolean;
  busy: boolean;
  setAlbumDraft: Dispatch<SetStateAction<AlbumDraft>>;
  setDrafts: Dispatch<SetStateAction<Record<string, PhotoDraft>>>;
  setSelectedPhotoIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectionAnchorId: Dispatch<SetStateAction<string | null>>;
  uploadFiles: (files: FileList | File[] | null) => Promise<void>;
  saveAlbum: () => Promise<void>;
  submitSelectedToGallery: () => Promise<void>;
  withdrawSelectedFromGallery: () => Promise<void>;
  reload: () => Promise<{ photos: AdminGalleryPhoto[]; albums: GalleryAlbum[] } | null>;
  editorClass: string;
  optionsClass: string;
  animated?: boolean;
  showAlbumFields?: boolean;
}) {
  const [existingPhotoId, setExistingPhotoId] = useState('');
  const [editorSurface, setEditorSurface] = useState<AlbumEditSurface>('photos');
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const isNew = !selectedAlbumSlug;
  const empty = albumPhotos.length === 0;
  const orderedPhotoIds = albumPhotos.map((photo) => photo.id);
  const allAlbumPhotosSelected = orderedPhotoIds.length > 0 && orderedPhotoIds.every((id) => selectedPhotoIds.has(id));
  const shouldAnimate = animated && !reducedMotion;
  const itemMotion = shouldAnimate ? { variants: staggerItemVariants } : {};
  const previewUrls = useCachedAccountImageUrls(albumPhotos, accessToken, ownerKey);
  const metadataRows = useMemo(
    () => albumPhotos.map((photo) => ({
      ...metadataRowFromPhoto(photo, {
        ...(photoDrafts[photo.id] ?? {}),
        id: photo.id,
        previewSrc: previewUrls[photo.id] ?? (photo.src?.startsWith('/api/gallery/') ? photo.src : undefined),
        previewLabel: photo.title,
        albumVisibility: photo.visibility,
        galleryStatus: photo.galleryStatus,
      }),
    })),
    [albumPhotos, photoDrafts, previewUrls],
  );
  const setMetadataRows = (rows: PhotoMetadataRow[]) => {
    setDrafts((current) => ({
      ...current,
      ...Object.fromEntries(rows.map((row) => [row.id, row])),
    }));
    setAlbumDraft((current) => ({
      ...current,
      photos: current.photos.map((item) => {
        const row = rows.find((entry) => entry.id === item.photoId);
        return row ? { ...item, visibility: row.albumVisibility ?? item.visibility } : item;
      }),
    }));
  };
  const selectedPendingGalleryCount = albumPhotos.filter(
    (photo) => selectedPhotoIds.has(photo.id) && photo.galleryStatus === 'pending',
  ).length;
  const editorSurfaceMotionProps = shouldAnimate
    ? {
        initial: { opacity: 0, x: editorSurface === 'details' ? 14 : -14 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: ALBUM_MODE_EASE } },
        exit: { opacity: 0, x: editorSurface === 'details' ? -10 : 10, transition: { duration: 0.14, ease: ALBUM_MODE_EASE } },
      }
    : { initial: false };

  const addExistingPhoto = () => {
    if (!existingPhotoId) return;
    setAlbumDraft((current) => addPhotosToAlbumDraft(current, [existingPhotoId]));
    setExistingPhotoId('');
  };

  const setAllAlbumPhotosSelected = (checked: boolean) => {
    setSelectedPhotoIds(checked ? new Set(orderedPhotoIds) : new Set());
    setSelectionAnchorId(checked ? orderedPhotoIds[0] ?? null : null);
  };

  const toggleAlbumPhotoSelection = (photoId: string, shiftKey: boolean) => {
    const nextChecked = !selectedPhotoIds.has(photoId);
    const { next, anchor } = updatePhotoSelection(
      selectedPhotoIds,
      orderedPhotoIds,
      photoId,
      nextChecked,
      shiftKey,
      selectionAnchorId,
    );
    setSelectedPhotoIds(next);
    setSelectionAnchorId(anchor);
  };

  const removePhotoFromAlbum = (photoId: string) => {
    setAlbumDraft((current) => ({
      ...current,
      photos: current.photos.filter((item) => item.photoId !== photoId),
      coverPhotoId: current.coverPhotoId === photoId ? '' : current.coverPhotoId,
    }));
    setSelectedPhotoIds((current) => toggleSetValue(current, photoId, false));
  };

  const reorderAlbumPhoto = (photoId: string, targetPhotoId: string) => {
    if (photoId === targetPhotoId) return;
    setAlbumDraft((current) => {
      const nextPhotos = [...current.photos];
      const from = nextPhotos.findIndex((item) => item.photoId === photoId);
      const to = nextPhotos.findIndex((item) => item.photoId === targetPhotoId);
      if (from < 0 || to < 0) return current;
      const [moved] = nextPhotos.splice(from, 1);
      if (!moved) return current;
      nextPhotos.splice(to, 0, moved);
      return { ...current, photos: nextPhotos };
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveAlbum();
        return;
      }
      if (isTyping) return;

      if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        fileInputRef.current?.click();
      } else if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedPhotoIds(new Set(albumPhotos.map((photo) => photo.id)));
      } else if (event.key === 'Escape') {
        setSelectedPhotoIds(new Set());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [albumPhotos, fileInputRef, saveAlbum, setSelectedPhotoIds]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void uploadFiles(event.target.files)}
      />

      <motion.main
        className={editorClass}
        variants={shouldAnimate ? staggerContainerVariants : undefined}
        initial={shouldAnimate ? 'enter' : false}
        animate={shouldAnimate ? 'center' : undefined}
        exit={shouldAnimate ? 'exit' : undefined}
      >
        {showAlbumFields && (
          <motion.section className="space-y-4" {...itemMotion}>
            <input
              value={albumDraft.title}
              onChange={(event) => setAlbumDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Add a title"
              className="w-full border-0 border-b border-line bg-transparent px-0 py-2 text-4xl font-bold tracking-tight text-fg outline-none placeholder:text-muted focus:border-line-strong"
            />
            <textarea
              value={albumDraft.description}
              onChange={(event) => setAlbumDraft((current) => ({ ...current, description: event.target.value }))}
              rows={2}
              placeholder="Add a description"
              className="w-full resize-none border-0 border-b border-line bg-transparent px-0 py-2 text-sm outline-none placeholder:text-muted focus:border-line-strong"
            />
          </motion.section>
        )}

        <motion.section className="space-y-3" {...itemMotion}>
          <AlbumEditorSurfaceBar
            surface={editorSurface}
            photoCount={albumPhotos.length}
            selectedCount={selectedPhotoIds.size}
            allSelected={allAlbumPhotosSelected}
            busy={busy}
            onSurface={setEditorSurface}
            onSelectAll={() => setAllAlbumPhotosSelected(!allAlbumPhotosSelected)}
            onChooseImages={() => fileInputRef.current?.click()}
          />

          <AnimatePresence initial={false} mode="wait">
            {editorSurface === 'photos' ? (
              <motion.div key="album-editor-photos" className="space-y-3" {...editorSurfaceMotionProps}>
                <AlbumDropZone
                  empty={empty}
                  busy={busy}
                  onChoose={() => fileInputRef.current?.click()}
                  onFiles={(files) => void uploadFiles(files)}
                />
                {albumPhotos.length > 0 && (
                  <AlbumEditablePhotoGrid
                    photos={albumPhotos}
                    accessToken={accessToken}
                    ownerKey={ownerKey}
                    selectedPhotoIds={selectedPhotoIds}
                    coverPhotoId={albumDraft.coverPhotoId}
                    draggedPhotoId={draggedPhotoId}
                    onToggleSelection={toggleAlbumPhotoSelection}
                    onRemove={removePhotoFromAlbum}
                    onDragStart={setDraggedPhotoId}
                    onDrop={(photoId, targetPhotoId) => {
                      reorderAlbumPhoto(photoId, targetPhotoId);
                      setDraggedPhotoId(null);
                    }}
                    onDragEnd={() => setDraggedPhotoId(null)}
                  />
                )}
              </motion.div>
            ) : (
              <motion.section key="album-editor-details" className="space-y-3" {...editorSurfaceMotionProps}>
                <div>
                  <div className="text-sm font-bold">Photo details</div>
                  <div className="label mt-1">
                    Bulk spreadsheet edits stay staged until Save.
                  </div>
                </div>
                <Suspense fallback={<div className="border border-line bg-faint px-3 py-8 text-center text-xs text-muted">Loading metadata grid...</div>}>
                  <PhotoMetadataGrid
                    rows={metadataRows}
                    context="album"
                    catalog={catalog}
                    onRowsChange={setMetadataRows}
                    selectedRowIds={selectedPhotoIds}
                    onSelectedRowIdsChange={(ids) => {
                      setSelectedPhotoIds(ids);
                      setSelectionAnchorId(ids.values().next().value ?? null);
                    }}
                    readonlyColumns={['galleryStatus']}
                    minHeight={360}
                    maxHeight={760}
                  />
                </Suspense>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.section>
      </motion.main>

      <motion.aside
        className={optionsClass}
        variants={shouldAnimate ? staggerContainerVariants : undefined}
        initial={shouldAnimate ? 'enter' : false}
        animate={shouldAnimate ? 'center' : undefined}
        exit={shouldAnimate ? 'exit' : undefined}
      >
        <motion.section className="border border-line p-3" {...itemMotion}>
          <div className="label mb-3">Album options</div>
          <div>
            <span className="label mb-2 block">Visibility</span>
            <div className="grid grid-cols-2 gap-2">
              <VisibilityChoiceButton
                active={albumDraft.status === 'draft'}
                icon={<Lock size={13} strokeWidth={1.6} />}
                label="Private"
                onClick={() => setAlbumDraft((current) => ({ ...current, status: 'draft' }))}
              />
              <VisibilityChoiceButton
                active={albumDraft.status === 'published'}
                icon={<Globe size={13} strokeWidth={1.6} />}
                label="Public"
                onClick={() => setAlbumDraft((current) => ({ ...current, status: 'published' }))}
              />
            </div>
          </div>
          <div className="mt-3">
            <TextField
              label="Slug"
              value={albumDraft.slug}
              onValueChange={(value) => setAlbumDraft((current) => ({ ...current, slug: value }))}
              placeholder="Generated from title"
            />
          </div>
          <label className="mt-3 block">
            <span className="label mb-2 block">Album password</span>
            <input
              type="password"
              value={albumDraft.albumPassword}
              placeholder={albumDraft.hasPassword ? 'Current password stays until replaced' : 'Optional'}
              onChange={(event) => setAlbumDraft((current) => ({
                ...current,
                albumPassword: event.target.value,
                hasPassword: event.target.value.trim() ? true : current.hasPassword,
              }))}
              className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
            />
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
              <span>{albumDraft.hasPassword ? 'Password protection enabled' : 'No password set'}</span>
              {albumDraft.hasPassword && (
                <button
                  type="button"
                  onClick={() => setAlbumDraft((current) => ({ ...current, hasPassword: false, albumPassword: '' }))}
                  className="border border-line px-2 py-1 transition-colors hover:border-line-strong"
                >
                  Remove
                </button>
              )}
            </div>
          </label>
          {selectedAlbumSlug && albumDraft.status === 'published' && (
            <div className="mt-3 border border-line bg-faint px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-muted">
              Public link: /g/{albumDraft.slug || selectedAlbumSlug}
            </div>
          )}
          <div className="mt-3">
            <Select
              label="Cover"
              value={albumDraft.coverPhotoId}
              onValueChange={(value) => setAlbumDraft((current) => ({ ...current, coverPhotoId: value }))}
              options={[
                { value: '', label: 'Auto' },
                ...albumPhotos.map((photo) => ({ value: photo.id, label: photo.title })),
              ]}
            />
          </div>
          {availablePhotos.length > 0 && (
            <div className="mt-3">
              <span className="label mb-2 block">Add existing photo</span>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={existingPhotoId}
                    onValueChange={setExistingPhotoId}
                    aria-label="Add existing photo"
                    options={[
                      { value: '', label: 'Choose' },
                      ...availablePhotos.map((photo) => ({ value: photo.id, label: photo.title })),
                    ]}
                  />
                </div>
                <Button onClick={addExistingPhoto} disabled={!existingPhotoId}>Add</Button>
              </div>
            </div>
          )}
        </motion.section>

        <motion.section className="border border-line p-3" {...itemMotion}>
          <div className="label mb-3">Actions</div>
          <div className="space-y-2">
            <Button variant="solid" className="w-full" onClick={() => void saveAlbum()} disabled={busy || !albumDraft.title.trim()}>
              <Save size={14} strokeWidth={1.5} />
              {isNew ? 'Create album' : 'Save'}
            </Button>
            <Button className="w-full" onClick={() => void reload()} disabled={loading || busy}>
              <RefreshCw size={14} strokeWidth={1.5} />
              Reload
            </Button>
            <Button className="w-full" onClick={() => void submitSelectedToGallery()} disabled={busy || selectedPhotoIds.size === 0}>
              <Send size={14} strokeWidth={1.5} />
              Submit selected to gallery
            </Button>
            <Button className="w-full" onClick={() => void withdrawSelectedFromGallery()} disabled={busy || selectedPendingGalleryCount === 0}>
              <Lock size={14} strokeWidth={1.5} />
              Withdraw pending
            </Button>
          </div>
          <dl className="mt-4 divide-y divide-line border border-line text-xs">
            <SummaryRow label="Album photos" value={String(albumPhotos.length)} />
            <SummaryRow label="Library photos" value={String(photos.length)} />
            <SummaryRow label="Selected" value={String(selectedPhotoIds.size)} />
          </dl>
        </motion.section>
      </motion.aside>
    </>
  );
}

function AlbumEditorSurfaceBar({
  surface,
  photoCount,
  selectedCount,
  allSelected,
  busy,
  onSurface,
  onSelectAll,
  onChooseImages,
}: {
  surface: AlbumEditSurface;
  photoCount: number;
  selectedCount: number;
  allSelected: boolean;
  busy: boolean;
  onSurface: (surface: AlbumEditSurface) => void;
  onSelectAll: () => void;
  onChooseImages: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-line px-3 py-2.5">
      <div className="text-xs text-muted">
        {selectedCount > 0 ? `${selectedCount} selected` : `${photoCount} album photo${photoCount === 1 ? '' : 's'}`}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="mr-1 flex border border-line">
          <ActionIconButton label="Arrange photos" active={surface === 'photos'} onClick={() => onSurface('photos')}>
            <Grid3X3 size={14} strokeWidth={1.5} />
          </ActionIconButton>
          <ActionIconButton label="Edit details" active={surface === 'details'} onClick={() => onSurface('details')}>
            <Rows3 size={14} strokeWidth={1.5} />
          </ActionIconButton>
        </div>
        {photoCount > 0 && (
          <ActionTextButton
            label={allSelected ? 'Clear photo selection' : 'Select all album photos'}
            active={allSelected}
            onClick={onSelectAll}
          >
            {allSelected ? <Check size={13} strokeWidth={1.7} /> : <Square size={13} strokeWidth={1.6} />}
            Select all
          </ActionTextButton>
        )}
        <ActionIconButton label="Choose images" onClick={onChooseImages} disabled={busy}>
          <Upload size={14} strokeWidth={1.5} />
        </ActionIconButton>
      </div>
    </div>
  );
}

function AlbumEditablePhotoGrid({
  photos,
  accessToken,
  ownerKey,
  selectedPhotoIds,
  coverPhotoId,
  draggedPhotoId,
  onToggleSelection,
  onRemove,
  onDragStart,
  onDrop,
  onDragEnd,
}: {
  photos: AlbumPhotoView[];
  accessToken: string | null;
  ownerKey: string | null;
  selectedPhotoIds: Set<string>;
  coverPhotoId: string;
  draggedPhotoId: string | null;
  onToggleSelection: (photoId: string, shiftKey: boolean) => void;
  onRemove: (photoId: string) => void;
  onDragStart: (photoId: string) => void;
  onDrop: (photoId: string, targetPhotoId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {photos.map((photo, index) => {
        const selected = selectedPhotoIds.has(photo.id);
        const dragging = draggedPhotoId === photo.id;
        return (
          <div
            key={photo.id}
            role="button"
            tabIndex={0}
            draggable={photos.length > 1}
            aria-grabbed={dragging}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('button')) return;
              onToggleSelection(photo.id, event.shiftKey);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onToggleSelection(photo.id, event.shiftKey);
            }}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              onDragStart(photo.id);
            }}
            onDragOver={(event) => {
              if (!draggedPhotoId || draggedPhotoId === photo.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggedPhotoId) return;
              onDrop(draggedPhotoId, photo.id);
            }}
            onDragEnd={onDragEnd}
            className={[
              'group relative border bg-surface outline-none transition-[border-color,opacity,transform]',
              selected ? 'border-fg' : 'border-line hover:border-line-strong focus-visible:border-line-strong',
              dragging ? 'opacity-45' : '',
            ].join(' ')}
          >
            <AccountPhotoImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className="aspect-square w-full object-cover" />
            <SelectionPill
              selected={selected}
              label={`Select ${photo.title}`}
              onClick={(event) => onToggleSelection(photo.id, event.shiftKey)}
              className="absolute left-2 top-2"
            />
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border border-line bg-surface/90 opacity-100 transition-opacity hover:border-line-strong md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              aria-label={`Remove ${photo.title}`}
            >
              <X size={13} strokeWidth={1.5} />
            </button>
            <div className="absolute bottom-2 left-2 border border-line bg-surface/90 px-1.5 py-1 text-[10px] uppercase tracking-wide">
              {String(index + 1).padStart(2, '0')}
            </div>
            {coverPhotoId === photo.id && (
              <div className="absolute bottom-2 right-2 border border-line bg-surface/90 px-1.5 py-1 text-[10px] uppercase tracking-wide">
                Cover
              </div>
            )}
            {photo.visibility === 'hidden' && (
              <div className="absolute right-2 top-12 border border-line bg-surface/90 px-1.5 py-1 text-[10px] uppercase tracking-wide">
                Hidden
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AlbumViewer({
  albums,
  photos,
  availablePhotos,
  albumPhotos,
  selectedAlbum,
  isNewRoute,
  detailMode,
  pageSurface,
  preferences,
  selectedPhotoIds,
  selectionAnchorId,
  selectedGalleryApprovedCount,
  albumDraft,
  photoDrafts,
  catalog,
  accessToken,
  ownerKey,
  fileInputRef,
  loading,
  busy,
  progress,
  embedReady,
  error,
  manager,
  selectAlbum,
  startNewAlbum,
  reload,
  setDetailMode,
  setPageSurface,
  setSelectedPhotoIds,
  setSelectionAnchorId,
  setAlbumDraft,
  setDrafts,
  setViewPhotoId,
  uploadFiles,
  saveAlbum,
  submitSelectedToGallery,
  withdrawSelectedFromGallery,
  publishOne,
  patchAlbum,
  onEmbedSelected,
  onEmbedPhoto,
  onEmbedAlbum,
  goToAlbums,
  openAlbum,
}: {
  albums: GalleryAlbum[];
  photos: AdminGalleryPhoto[];
  availablePhotos: AdminGalleryPhoto[];
  albumPhotos: AlbumPhotoView[];
  selectedAlbum: GalleryAlbum | null;
  isNewRoute: boolean;
  detailMode: AlbumDefaultMode;
  pageSurface: 'albums' | 'all';
  preferences: AlbumDisplayPreferences;
  selectedPhotoIds: Set<string>;
  selectionAnchorId: string | null;
  selectedGalleryApprovedCount: number;
  albumDraft: AlbumDraft;
  photoDrafts: Record<string, PhotoDraft>;
  catalog: PhotoMetadataCatalog;
  accessToken: string | null;
  ownerKey: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  loading: boolean;
  busy: boolean;
  progress: ImageProcessingProgress | null;
  embedReady: boolean;
  error: string | null;
  manager: ReactNode;
  selectAlbum: (album: GalleryAlbum | null) => void;
  startNewAlbum: () => void;
  reload: () => Promise<{ photos: AdminGalleryPhoto[]; albums: GalleryAlbum[] } | null>;
  setDetailMode: (mode: AlbumDefaultMode) => void;
  setPageSurface: Dispatch<SetStateAction<'albums' | 'all'>>;
  setSelectedPhotoIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectionAnchorId: Dispatch<SetStateAction<string | null>>;
  setAlbumDraft: Dispatch<SetStateAction<AlbumDraft>>;
  setDrafts: Dispatch<SetStateAction<Record<string, PhotoDraft>>>;
  setViewPhotoId: Dispatch<SetStateAction<string | null>>;
  uploadFiles: (files: FileList | File[] | null) => Promise<void>;
  saveAlbum: () => Promise<void>;
  submitSelectedToGallery: () => Promise<void>;
  withdrawSelectedFromGallery: () => Promise<void>;
  publishOne: (photoId: string) => Promise<void>;
  patchAlbum: (slug: string, updates: AlbumMutation) => Promise<GalleryAlbum>;
  onEmbedSelected: (options?: { photoIds?: string[]; albumSlug?: string; albumTitle?: string }) => void;
  onEmbedPhoto: (photo: AdminGalleryPhoto, albumSlug?: string) => void;
  onEmbedAlbum: (album: GalleryAlbum) => void;
  goToAlbums: () => void;
  openAlbum: (album: GalleryAlbum) => void;
}) {
  const selectedAlbumPhotos = selectedAlbum
    ? selectedAlbum.photos
        .map((item, index) => {
          const photo = photos.find((entry) => entry.id === item.id);
          return photo ? albumPhotoView(photo, item, item.sortOrder ?? index) : null;
        })
        .filter((photo): photo is AlbumPhotoView => photo != null)
    : [];
  const visiblePhotoIds = selectedAlbum ? selectedAlbumPhotos.map((photo) => photo.id) : pageSurface === 'all' ? photos.map((photo) => photo.id) : [];
  const allVisibleSelected = visiblePhotoIds.length > 0 && visiblePhotoIds.every((id) => selectedPhotoIds.has(id));
  const selectedAlbumScopedPhotos = selectedAlbumPhotos.filter((photo) => selectedPhotoIds.has(photo.id));
  const selectedLibraryPhotos = photos.filter((photo) => selectedPhotoIds.has(photo.id));
  const selectedPhotos = selectedAlbum ? selectedAlbumScopedPhotos : selectedLibraryPhotos;
  const selectedVisibleAlbumCount = selectedAlbum
    ? selectedAlbumScopedPhotos.filter((photo) => photo.visibility === 'visible').length
    : 0;
  const selectedPendingGalleryCount = selectedPhotos.filter((photo) => photo.galleryStatus === 'pending').length;
  const selectedEmbeddableCount = selectedAlbum
    ? selectedAlbum.status === 'published' && !selectedAlbum.hasPassword
      ? selectedAlbumScopedPhotos.filter((photo) => photo.visibility === 'visible').length
      : 0
    : selectedGalleryApprovedCount;

  const setAllVisible = (checked: boolean) => {
    setSelectedPhotoIds(checked ? new Set(visiblePhotoIds) : new Set());
    setSelectionAnchorId(checked ? visiblePhotoIds[0] ?? null : null);
  };

  const togglePhotoSelection = (photoId: string, orderedIds: string[], shiftKey: boolean) => {
    const nextChecked = !selectedPhotoIds.has(photoId);
    const { next, anchor } = updatePhotoSelection(
      selectedPhotoIds,
      orderedIds,
      photoId,
      nextChecked,
      shiftKey,
      selectionAnchorId,
    );
    setSelectedPhotoIds(next);
    setSelectionAnchorId(anchor);
  };

  const updateVisibility = async (status: GalleryAlbumStatus) => {
    if (!selectedAlbum || busy) return;
    await patchAlbum(selectedAlbum.slug, { status });
    await reload();
  };

  const updateSelectedAlbumPhotoVisibility = async (visibility: GalleryAlbumPhotoVisibility) => {
    if (!selectedAlbum || busy || selectedPhotos.length === 0) return;
    await patchAlbum(selectedAlbum.slug, {
      photos: selectedAlbum.photos.map((photo) => ({
        photoId: photo.photoId,
        caption: photo.caption ?? null,
        visibility: selectedPhotoIds.has(photo.id) ? visibility : photo.visibility,
      })),
    });
    setSelectedPhotoIds(new Set());
    setSelectionAnchorId(null);
  };
  const modeDirection = useAlbumModeDirection(detailMode);
  const reducedMotion = useReducedMotion();
  const modeMotionProps = reducedMotion
    ? {
        initial: false,
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0 },
        transition: { duration: 0.01 },
      }
    : {
        variants: albumModeVariants(modeDirection),
        initial: 'enter',
        animate: 'center',
        exit: 'exit',
      };

  if (albums.length === 0 && photos.length === 0) {
    return (
      <section className="flex min-h-[24rem] flex-col items-center justify-center border border-line p-8 text-center">
        {error && <ErrorBanner message={error} />}
        <FolderOpen size={32} strokeWidth={1.3} />
        <h3 className="mt-4 text-lg font-bold tracking-tight">Create your first album</h3>
        <p className="mt-2 max-w-md text-sm text-muted">
          Name the album, add a description, then drop in a batch of photos.
        </p>
        <Button variant="solid" className="mt-5" onClick={startNewAlbum}>
          <Plus size={14} strokeWidth={1.5} />
          New album
        </Button>
      </section>
    );
  }

  if (isNewRoute) {
    return manager;
  }

  if (selectedAlbum) {
    return (
      <div className="space-y-5">
        {error && <ErrorBanner message={error} />}
        {progress && <UploadProgress progress={progress} />}
        <div className="space-y-4 border-b border-line pb-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
            <button
              type="button"
              onClick={() => {
                selectAlbum(null);
                goToAlbums();
              }}
              className="transition-colors hover:text-fg"
              title="Back to albums"
            >
              ALBUMS
            </button>
            <ChevronRight size={12} strokeWidth={1.5} />
            <span className="text-fg">{selectedAlbum.title.toUpperCase()}</span>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-3xl font-bold tracking-tight">{selectedAlbum.title}</h3>
            </div>
          </div>

          {selectedAlbum.description && <p className="max-w-3xl text-sm text-muted">{selectedAlbum.description}</p>}
        </div>

        <AnimatePresence initial={false} mode="wait">
          {detailMode === 'view' ? (
            <motion.div key="album-view" {...modeMotionProps} className="space-y-5">
              <GallerySurface
                items={selectedAlbumPhotos}
                enableReactions={false}
                emptyMessage="No photos in this album yet."
                selection={{
                  selectedIds: selectedPhotoIds,
                  anchorId: selectionAnchorId,
                  onChange: (ids, anchorId) => {
                    setSelectedPhotoIds(ids);
                    setSelectionAnchorId(anchorId);
                  },
                  primaryActionLabel: 'Show in public album',
                  secondaryActionLabel: 'Hide from public album',
                  selectedSecondaryCount: selectedVisibleAlbumCount,
                  selectedEmbeddableCount,
                  embedReady,
                  embedSelectedLabel: selectedPhotoIds.size > 0 && selectedEmbeddableCount === 0
                    ? 'Only visible photos in a public album can be embedded'
                    : 'Embed selected',
                  onPrimaryAction: () => void updateSelectedAlbumPhotoVisibility('visible'),
                  onSecondaryAction: () => void updateSelectedAlbumPhotoVisibility('hidden'),
                  onEmbedSelected: () => onEmbedSelected({
                    photoIds: selectedAlbumScopedPhotos.filter((photo) => photo.visibility === 'visible').map((photo) => photo.id),
                    albumSlug: selectedAlbum.slug,
                    albumTitle: selectedAlbum.title,
                  }),
                }}
                ownerControls={{
                  visibility: {
                    value: selectedAlbum.status,
                    busy,
                    onChange: (status) => void updateVisibility(status),
                  },
                  mode: {
                    value: detailMode,
                    onView: () => setDetailMode('view'),
                    onEdit: () => setDetailMode('edit'),
                  },
                  canEmbedAlbum: embedReady && selectedAlbum.status === 'published' && !selectedAlbum.hasPassword,
                  embedAlbumDisabledReason: selectedAlbum.hasPassword
                    ? 'Password-protected albums are not embeddable'
                    : selectedAlbum.status === 'published'
                      ? 'Embed settings are still loading'
                      : 'Make the album public to embed it',
                  onEmbedAlbum: () => onEmbedAlbum(selectedAlbum),
                  onReload: () => void reload(),
                  onAdd: () => fileInputRef.current?.click(),
                  addLabel: 'Upload',
                }}
                renderImage={(photo, className) => (
                  <AccountPhotoImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className={className} />
                )}
                renderInfo={(photo, { close }) => (
                  <AccountLightboxInfo
                    photo={photo}
                    busy={busy}
                    canEmbed={selectedAlbum.status === 'published' && !selectedAlbum.hasPassword && photo.visibility === 'visible'}
                    onEdit={() => {
                      close();
                      setDetailMode('edit');
                    }}
                    onPublish={() => void publishOne(photo.id)}
                    onEmbed={() => onEmbedPhoto(photo, selectedAlbum.slug)}
                    embedReady={embedReady}
                  />
                )}
              />
            </motion.div>
          ) : (
            <motion.div
              key="album-edit"
              {...modeMotionProps}
              className="grid min-h-0 gap-4 xl:grid-cols-[14rem_minmax(0,1fr)_18rem] xl:items-start"
            >
              <motion.aside
                className="space-y-3 xl:sticky xl:top-0"
                initial={reducedMotion ? false : { opacity: 0, x: -18 }}
                animate={reducedMotion ? undefined : { opacity: 1, x: 0, transition: { duration: 0.24, ease: ALBUM_MODE_EASE } }}
                exit={reducedMotion ? undefined : { opacity: 0, x: -12, transition: { duration: 0.16, ease: ALBUM_MODE_EASE } }}
              >
                <AlbumNav
                  albums={albums}
                  selectedAlbumSlug={selectedAlbum.slug}
                  listClassName="divide-y divide-line border border-line"
                  onSelectAlbum={openAlbum}
                  onNewAlbum={startNewAlbum}
                />
              </motion.aside>
              <AlbumEditWorkspace
                availablePhotos={availablePhotos}
                albumPhotos={albumPhotos}
                photos={photos}
                selectedAlbumSlug={selectedAlbum.slug}
                selectedPhotoIds={selectedPhotoIds}
                selectionAnchorId={selectionAnchorId}
                albumDraft={albumDraft}
                photoDrafts={photoDrafts}
                catalog={catalog}
                accessToken={accessToken}
                ownerKey={ownerKey}
                fileInputRef={fileInputRef}
                loading={loading}
                busy={busy}
                setAlbumDraft={setAlbumDraft}
                setDrafts={setDrafts}
                setSelectedPhotoIds={setSelectedPhotoIds}
                setSelectionAnchorId={setSelectionAnchorId}
                uploadFiles={uploadFiles}
                saveAlbum={saveAlbum}
                submitSelectedToGallery={submitSelectedToGallery}
                withdrawSelectedFromGallery={withdrawSelectedFromGallery}
                reload={reload}
                editorClass="min-w-0 space-y-5"
                optionsClass="space-y-4"
                animated
                showAlbumFields={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (pageSurface === 'all') {
    return (
      <div className="space-y-5">
        {error && <ErrorBanner message={error} />}
        <AlbumActionBar
          surface={pageSurface}
          selectedCount={selectedPhotoIds.size}
          selectedEmbeddableCount={selectedEmbeddableCount}
          selectedSecondaryCount={selectedPendingGalleryCount}
          visibleCount={photos.length}
          busy={busy}
          embedReady={embedReady}
          allVisibleSelected={allVisibleSelected}
          hasSelectablePhotos={visiblePhotoIds.length > 0}
          onSurface={setPageSurface}
          onReload={() => void reload()}
          onNew={startNewAlbum}
          primaryActionLabel="Submit to public gallery"
          secondaryActionLabel="Withdraw from gallery"
          onPrimaryAction={() => void submitSelectedToGallery()}
          onSecondaryAction={() => void withdrawSelectedFromGallery()}
          onEmbedSelected={() => onEmbedSelected()}
          onSelectAll={() => setAllVisible(!allVisibleSelected)}
        />
        <div className="columns-2 gap-3 sm:columns-3 xl:columns-4">
          {photos.map((photo) => {
            const selected = selectedPhotoIds.has(photo.id);
            return (
            <div key={photo.id} className="group mb-3 break-inside-avoid border border-line">
              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    if (event.shiftKey) {
                      togglePhotoSelection(photo.id, photos.map((item) => item.id), true);
                      return;
                    }
                    setViewPhotoId(photo.id);
                  }}
                  className="block w-full text-left"
                  aria-label={`Open ${photo.title}`}
                >
                  <AccountPhotoImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className="w-full object-cover" />
                </button>
                <SelectionPill
                  selected={selected}
                  label={`Select ${photo.title}`}
                  onClick={(event) => togglePhotoSelection(photo.id, photos.map((item) => item.id), event.shiftKey)}
                  className={[
                    'absolute left-2 top-2',
                    selected ? '' : 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
                  ].join(' ')}
                />
              </div>
              {preferences.showPhotoTitles && (
                <div className="border-t border-line p-2">
                  <div className="truncate text-xs font-bold">{photo.title}</div>
                </div>
              )}
            </div>
            );
          })}
          {photos.length === 0 && (
            <div className="border border-line px-6 py-12 text-center text-xs text-muted">
              No images uploaded yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} />}
      <AlbumActionBar
        surface={pageSurface}
        selectedCount={selectedPhotoIds.size}
        selectedEmbeddableCount={selectedEmbeddableCount}
        selectedSecondaryCount={selectedPendingGalleryCount}
        visibleCount={albums.length}
        busy={busy}
        embedReady={embedReady}
        allVisibleSelected={false}
        hasSelectablePhotos={false}
        onSurface={setPageSurface}
        onReload={() => void reload()}
        onNew={startNewAlbum}
        primaryActionLabel="Submit to public gallery"
        secondaryActionLabel="Withdraw from gallery"
        onPrimaryAction={() => void submitSelectedToGallery()}
        onSecondaryAction={() => void withdrawSelectedFromGallery()}
        onEmbedSelected={() => onEmbedSelected()}
        onSelectAll={() => undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {albums.map((album) => (
          <AlbumCard
            key={album.slug}
            album={album}
            photos={photos}
            accessToken={accessToken}
            ownerKey={ownerKey}
            preferences={preferences}
            onOpen={() => openAlbum(album)}
          />
        ))}
        {albums.length === 0 && (
          <button
            type="button"
            onClick={startNewAlbum}
            className="flex min-h-64 flex-col items-center justify-center border border-dashed border-line p-8 text-center hover:border-line-strong"
          >
            <FolderOpen size={24} strokeWidth={1.4} />
            <span className="mt-3 text-sm font-bold">Create an album</span>
            <span className="mt-1 text-xs text-muted">Add a title, description, and photos.</span>
          </button>
        )}
      </div>
    </div>
  );
}

function AlbumActionBar({
  surface,
  selectedCount,
  selectedEmbeddableCount,
  selectedSecondaryCount,
  visibleCount,
  busy,
  embedReady,
  allVisibleSelected,
  hasSelectablePhotos,
  inAlbum = false,
  onSurface,
  onReload,
  onNew,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onEmbedSelected,
  onSelectAll,
}: {
  surface: 'albums' | 'all';
  selectedCount: number;
  selectedEmbeddableCount: number;
  selectedSecondaryCount: number;
  visibleCount: number;
  busy: boolean;
  embedReady: boolean;
  allVisibleSelected: boolean;
  hasSelectablePhotos: boolean;
  inAlbum?: boolean;
  onSurface: (surface: 'albums' | 'all') => void;
  onReload: () => void;
  onNew: () => void;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onEmbedSelected: () => void;
  onSelectAll: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const embedSelectedLabel = selectedCount > 0 && selectedEmbeddableCount === 0
    ? inAlbum
      ? 'Only visible photos in a public album can be embedded'
      : 'Only approved gallery photos can be embedded'
    : 'Embed selected';

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-line px-3 py-2.5">
      <div className="text-xs text-muted">
        {selectedCount > 0 ? `${selectedCount} selected` : `${visibleCount} visible`}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {!inAlbum && (
          <div className="mr-1 flex border border-line">
            <ActionIconButton label="Album grid" active={surface === 'albums'} onClick={() => onSurface('albums')}>
              <Grid3X3 size={14} strokeWidth={1.5} />
            </ActionIconButton>
            <ActionIconButton label="All images" active={surface === 'all'} onClick={() => onSurface('all')}>
              <Rows3 size={14} strokeWidth={1.5} />
            </ActionIconButton>
          </div>
        )}
        {hasSelectablePhotos && (
          <ActionTextButton
            label={allVisibleSelected ? 'Clear visible selection' : 'Select all visible'}
            active={allVisibleSelected}
            onClick={onSelectAll}
          >
            {allVisibleSelected ? <Check size={13} strokeWidth={1.7} /> : <Square size={13} strokeWidth={1.6} />}
            Select all
          </ActionTextButton>
        )}
        <ActionIconButton label="Reload" onClick={onReload} disabled={busy}>
          <RefreshCw size={14} strokeWidth={1.5} />
        </ActionIconButton>
        <ActionIconButton label="New album" onClick={onNew}>
          <Plus size={14} strokeWidth={1.5} />
        </ActionIconButton>
        <ActionIconButton
          label={embedSelectedLabel}
          onClick={onEmbedSelected}
          disabled={!embedReady || selectedEmbeddableCount === 0}
          active={selectedEmbeddableCount > 0}
        >
          <Code2 size={14} strokeWidth={1.5} />
        </ActionIconButton>
        {hasSelectablePhotos && (
          <div ref={menuRef} className="relative">
            <ActionIconButton
              label="Selection actions"
              onClick={() => setMenuOpen((current) => !current)}
              active={menuOpen}
              disabled={busy || selectedCount === 0}
            >
              <EllipsisVertical size={14} strokeWidth={1.5} />
            </ActionIconButton>
            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.45rem)] z-40 flex min-w-48 flex-col border border-line bg-surface p-1 shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onPrimaryAction();
                  }}
                  disabled={busy || selectedCount === 0}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-fg transition-colors hover:bg-faint disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{primaryActionLabel}</span>
                  {inAlbum ? <Eye size={13} strokeWidth={1.5} /> : <Send size={13} strokeWidth={1.5} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSecondaryAction();
                  }}
                  disabled={busy || selectedCount === 0 || selectedSecondaryCount === 0}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-fg transition-colors hover:bg-faint disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{secondaryActionLabel}</span>
                  <Lock size={13} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionIconButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'group relative flex h-9 w-9 items-center justify-center border-line text-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'bg-fg text-bg hover:text-bg' : 'bg-transparent',
      ].join(' ')}
    >
      {children}
      <span className="pointer-events-none absolute right-0 top-[calc(100%+0.35rem)] z-40 border border-line bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-fg opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}

function ActionTextButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={[
        'inline-flex h-9 items-center gap-2 border px-3 text-[11px] uppercase tracking-[0.18em] transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-line-strong',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SelectionPill({
  selected,
  label,
  onClick,
  className = '',
}: {
  selected: boolean;
  label: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'inline-flex h-8 min-w-8 items-center justify-center border px-2 text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm transition-colors',
        selected ? 'border-fg bg-fg text-bg' : 'border-line bg-surface/90 text-fg hover:border-line-strong',
        className,
      ].join(' ')}
    >
      {selected ? <Check size={12} strokeWidth={1.9} /> : <Square size={12} strokeWidth={1.6} />}
    </button>
  );
}

function AlbumCard({
  album,
  photos,
  accessToken,
  ownerKey,
  preferences,
  onOpen,
}: {
  album: GalleryAlbum;
  photos: AdminGalleryPhoto[];
  accessToken: string | null;
  ownerKey: string | null;
  preferences: AlbumDisplayPreferences;
  onOpen: () => void;
}) {
  const cover = albumCoverPhoto(album, photos);
  return (
    <button type="button" onClick={onOpen} className="group min-w-0 border border-line text-left transition-colors hover:border-line-strong">
      <div className="aspect-[4/3] w-full overflow-hidden border-b border-line bg-faint">
        {cover ? (
          <AccountPhotoImage photo={cover} accessToken={accessToken} ownerKey={ownerKey} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <FolderOpen size={24} strokeWidth={1.4} />
          </div>
        )}
      </div>
      <div className="min-w-0 p-3">
        <div className="truncate text-sm font-bold">{album.title}</div>
        <div className="mt-1 truncate text-xs text-muted">{albumSubtitle(album, preferences.albumSubtitle)}</div>
      </div>
    </button>
  );
}

function AlbumPreferencesPanel({
  preferences,
  onChange,
}: {
  preferences: AlbumDisplayPreferences;
  onChange: Dispatch<SetStateAction<AlbumDisplayPreferences>>;
}) {
  return (
    <section className="border border-line p-4">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 size={15} strokeWidth={1.5} />
        <div className="text-sm font-bold">Album display</div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Card subtitle"
          value={preferences.albumSubtitle}
          onValueChange={(value) => onChange((current) => ({ ...current, albumSubtitle: value as AlbumSubtitleField }))}
          options={[
            { value: 'updated', label: 'Updated date' },
            { value: 'created', label: 'Created date' },
            { value: 'published', label: 'Published date' },
            { value: 'photo-count', label: 'Photo count' },
            { value: 'status', label: 'Status' },
            { value: 'description', label: 'Description' },
          ]}
        />
        <Select
          label="Opening mode"
          value={preferences.defaultAlbumMode}
          onValueChange={(value) => onChange((current) => ({ ...current, defaultAlbumMode: value as AlbumDefaultMode }))}
          options={[
            { value: 'view', label: 'View' },
            { value: 'edit', label: 'Edit' },
          ]}
        />
        <label className="flex items-end gap-2 pb-2 text-xs">
          <input
            type="checkbox"
            checked={preferences.showPhotoTitles}
            onChange={(event) => onChange((current) => ({ ...current, showPhotoTitles: event.target.checked }))}
          />
          Show titles in album view
        </label>
      </div>
    </section>
  );
}

function AlbumDropZone({
  empty,
  busy,
  onChoose,
  onFiles,
}: {
  empty: boolean;
  busy: boolean;
  onChoose: () => void;
  onFiles: (files: FileList | File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFiles(event.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        'border border-dashed transition-colors',
        dragging ? 'border-fg bg-faint' : 'border-line',
        empty ? 'flex min-h-[18rem] flex-col items-center justify-center p-8 text-center' : 'flex items-center justify-between gap-3 p-4',
      ].join(' ')}
    >
      <div className={empty ? '' : 'min-w-0'}>
        <ImagePlus size={empty ? 30 : 18} strokeWidth={1.4} className={empty ? 'mx-auto mb-4' : 'mb-2'} />
        <div className="text-sm font-bold">{empty ? 'Drop photos into this album' : 'Add more photos'}</div>
        <div className="mt-1 text-xs text-muted">
          Bulk upload is attached to this album. Images are compressed before Cloudflare storage.
        </div>
      </div>
      <Button onClick={onChoose} disabled={busy} className={empty ? 'mt-5' : 'shrink-0'}>
        <Upload size={14} strokeWidth={1.5} />
        Choose images
      </Button>
    </div>
  );
}

function AccountLightboxInfo({
  photo,
  busy,
  embedReady,
  canEmbed,
  onEdit,
  onPublish,
  onEmbed,
}: {
  photo: AdminGalleryPhoto;
  busy: boolean;
  embedReady: boolean;
  canEmbed: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onEmbed: () => void;
}) {
  const navigate = useNavigate();
  const { cameras, lenses } = useKit();
  const { add: addToCompare } = useCompare();
  const entry = viewEntryFromAccountPhoto(photo);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold">{photo.title}</div>
        <div className="label mt-1">{galleryStatusLabel(photo.galleryStatus)}</div>
      </div>

      <PhotoOpticsPanel
        entry={entry}
        kit={{ cameras, lenses }}
        showKitVerdict
        renderFooter={({ format, focal, aperture }) => (
          <button
            type="button"
            onClick={() => {
              addToCompare({
                id: nextSystemId(),
                context: photo.title,
                format,
                focal,
                aperture,
                subjectPreset: photo.subjectPreset,
                subjectWidthM: photo.subjectWidthM,
              });
              navigate('/compare');
            }}
            className="flex w-full items-center justify-center gap-2 border border-line px-3 py-2 text-xs uppercase tracking-wide transition-colors hover:border-line-strong"
          >
            <GitCompare size={14} strokeWidth={1.5} /> Compare this look
          </button>
        )}
      />

      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={onEmbed}
          disabled={!embedReady || !canEmbed}
          title={canEmbed ? 'Copy iframe code' : 'Make the photo public in a non-protected album or approve it in the gallery first'}
        >
          <Code2 size={14} strokeWidth={1.5} />
          Copy embed code
        </Button>
        <Button variant="solid" className="w-full" onClick={onPublish} disabled={busy || photo.galleryStatus === 'approved'}>
          <Send size={14} strokeWidth={1.5} />
          Submit to public gallery
        </Button>
        <Button className="w-full" onClick={onEdit}>
          <Settings2 size={14} strokeWidth={1.5} />
          Edit details
        </Button>
      </div>
    </div>
  );
}

function VisibilityChoiceButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex h-9 items-center justify-center gap-2 border px-3 text-[11px] uppercase tracking-[0.18em] transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-line-strong',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4rem] gap-3 px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-bold">{value}</dd>
    </div>
  );
}

function UploadProgress({ progress }: { progress: ImageProcessingProgress }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{progress.label}</span>
        <span>{progress.percent}%</span>
      </div>
      <div className="h-1.5 bg-line">
        <div className="h-full bg-fg" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

function draftFromAlbum(album: GalleryAlbum): AlbumDraft {
  return {
    slug: album.slug,
    title: album.title,
    description: album.description,
    status: album.status,
    hasPassword: album.hasPassword === true,
    albumPassword: '',
    coverPhotoId: album.coverPhotoId ?? '',
    photos: album.photos.map((photo) => ({
      photoId: photo.photoId,
      caption: photo.caption ?? null,
      visibility: photo.visibility,
    })),
  };
}

function albumPhotoView(
  photo: AdminGalleryPhoto,
  membership: { photoId: string; visibility: GalleryAlbumPhotoVisibility; caption?: string | null },
  sortOrder: number,
): AlbumPhotoView {
  return {
    ...photo,
    photoId: membership.photoId,
    visibility: membership.visibility,
    sortOrder,
    ...(membership.caption ? { caption: membership.caption } : {}),
  };
}

function draftFromPhoto(photo: AdminGalleryPhoto): PhotoDraft {
  return metadataRowFromPhoto(photo);
}

function photoUpdatePayload(photo: AdminGalleryPhoto, draft: PhotoDraft): Partial<AdminGalleryPhoto> & Record<string, unknown> {
  return photoMetadataUpdatePayload(photo, draft);
}

function photoDraftChanged(photo: AdminGalleryPhoto, draft: PhotoDraft): boolean {
  return photoMetadataChanged(photo, draft);
}

function viewEntryFromAccountPhoto(photo: AdminGalleryPhoto): ViewEntry {
  const { format, fallbackUsed } = resolveGalleryFormat(photo.formatId);
  return {
    id: photo.id,
    title: photo.title,
    metaLine: `${photo.camera} · ${photo.lens}`,
    src: photo.src,
    camera: photo.camera,
    lens: photo.lens,
    formatId: photo.formatId,
    format,
    focal: photo.focal,
    aperture: photo.aperture,
    subjectPreset: photo.subjectPreset,
    subjectWidthM: photo.subjectWidthM,
    shutterSpeed: photo.shutterSpeed,
    iso: photo.iso,
    capturedAt: photo.capturedAt,
    guessed: fallbackUsed,
    morph: false,
  };
}

function readAlbumPreferences(): AlbumDisplayPreferences {
  if (typeof window === 'undefined') return DEFAULT_ALBUM_PREFS;
  try {
    const raw = window.localStorage.getItem(ALBUM_PREFS_KEY);
    if (!raw) return DEFAULT_ALBUM_PREFS;
    const parsed = JSON.parse(raw) as Partial<AlbumDisplayPreferences>;
    return {
      albumSubtitle: isAlbumSubtitleField(parsed.albumSubtitle) ? parsed.albumSubtitle : DEFAULT_ALBUM_PREFS.albumSubtitle,
      showPhotoTitles: typeof parsed.showPhotoTitles === 'boolean' ? parsed.showPhotoTitles : DEFAULT_ALBUM_PREFS.showPhotoTitles,
      defaultAlbumMode: parsed.defaultAlbumMode === 'edit' || parsed.defaultAlbumMode === 'view'
        ? parsed.defaultAlbumMode
        : DEFAULT_ALBUM_PREFS.defaultAlbumMode,
    };
  } catch {
    return DEFAULT_ALBUM_PREFS;
  }
}

function writeAlbumPreferences(preferences: AlbumDisplayPreferences) {
  window.localStorage.setItem(ALBUM_PREFS_KEY, JSON.stringify(preferences));
}

function isAlbumSubtitleField(value: unknown): value is AlbumSubtitleField {
  return value === 'updated'
    || value === 'created'
    || value === 'published'
    || value === 'photo-count'
    || value === 'status'
    || value === 'description';
}

function albumCoverPhoto(album: GalleryAlbum, photos: AdminGalleryPhoto[]): AdminGalleryPhoto | null {
  const coverId = album.coverPhotoId || album.photos[0]?.id;
  if (!coverId) return null;
  return photos.find((photo) => photo.id === coverId) ?? null;
}

function albumSubtitle(album: GalleryAlbum, field: AlbumSubtitleField): string {
  switch (field) {
    case 'created':
      return `Created ${formatDate(album.createdAt)}`;
    case 'published':
      return album.publishedAt ? `Published ${formatDate(album.publishedAt)}` : 'Unpublished';
    case 'photo-count':
      return `${album.photos.length} ${album.photos.length === 1 ? 'photo' : 'photos'}`;
    case 'status':
      return albumVisibilityLabel(album.status);
    case 'description':
      return album.description || `${album.photos.length} ${album.photos.length === 1 ? 'photo' : 'photos'}`;
    case 'updated':
    default:
      return `Updated ${formatDate(album.updatedAt)}`;
  }
}

function albumVisibilityLabel(status: GalleryAlbumStatus) {
  return status === 'published' ? 'Public' : 'Private';
}

function galleryStatusLabel(status: AdminGalleryPhoto['galleryStatus']) {
  switch (status) {
    case 'approved':
      return 'Public gallery';
    case 'pending':
      return 'Pending review';
    case 'rejected':
      return 'Rejected';
    case 'not_submitted':
    default:
      return 'Library only';
  }
}

function formatDate(value?: string | null): string {
  if (!value) return 'never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function albumPayload(draft: AlbumDraft): AlbumMutation {
  const payload: AlbumMutation = {
    slug: draft.slug,
    title: draft.title,
    description: draft.description,
    status: draft.status,
    coverPhotoId: draft.coverPhotoId || null,
    photos: draft.photos.map((photo) => ({
      photoId: photo.photoId,
      caption: photo.caption ?? null,
      visibility: photo.visibility,
    })),
  };
  const trimmedPassword = draft.albumPassword.trim();
  if (trimmedPassword) {
    payload.albumPassword = trimmedPassword;
  } else if (!draft.hasPassword) {
    payload.albumPassword = null;
  }
  return payload;
}

function addPhotosToAlbumDraft(draft: AlbumDraft, photoIds: string[]): AlbumDraft {
  const nextPhotos = appendUniqueAlbumPhotos(draft.photos, photoIds);
  return {
    ...draft,
    photos: nextPhotos,
    coverPhotoId: draft.coverPhotoId || photoIds[0] || '',
  };
}

function appendUniqueAlbumPhotos(current: AlbumDraftPhoto[], additions: string[]): AlbumDraftPhoto[] {
  const seen = new Set(current.map((photo) => photo.photoId));
  const next = [...current];
  for (const id of additions) {
    if (!seen.has(id)) {
      seen.add(id);
      next.push({ photoId: id, visibility: 'visible', caption: null });
    }
  }
  return next;
}

function mergePhotos(current: AdminGalleryPhoto[], updates: AdminGalleryPhoto[]): AdminGalleryPhoto[] {
  const byId = new Map(current.map((photo) => [photo.id, photo]));
  for (const photo of updates) byId.set(photo.id, photo);
  return [...byId.values()].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

function replaceAlbum(current: GalleryAlbum[], album: GalleryAlbum): GalleryAlbum[] {
  const exists = current.some((item) => item.slug === album.slug);
  if (!exists) return [album, ...current];
  return current.map((item) => (item.slug === album.slug ? album : item));
}

function toggleSetValue(current: Set<string>, value: string, checked: boolean): Set<string> {
  const next = new Set(current);
  if (checked) next.add(value);
  else next.delete(value);
  return next;
}

function updatePhotoSelection(
  current: Set<string>,
  orderedIds: string[],
  photoId: string,
  checked: boolean,
  shiftKey: boolean,
  anchorId: string | null,
) {
  if (!shiftKey || !anchorId) {
    return {
      next: toggleSetValue(current, photoId, checked),
      anchor: photoId,
    };
  }

  const anchorIndex = orderedIds.indexOf(anchorId);
  const targetIndex = orderedIds.indexOf(photoId);
  if (anchorIndex < 0 || targetIndex < 0) {
    return {
      next: toggleSetValue(current, photoId, checked),
      anchor: photoId,
    };
  }

  const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  const next = new Set(current);
  for (let index = start; index <= end; index += 1) {
    const id = orderedIds[index];
    if (!id) continue;
    if (checked) next.add(id);
    else next.delete(id);
  }
  return {
    next,
    anchor: anchorId,
  };
}

function AccountPhotoImage({
  photo,
  accessToken,
  ownerKey,
  className,
}: {
  photo: Pick<AdminGalleryPhoto, 'id' | 'galleryStatus' | 'src' | 'updatedAt'>;
  accessToken: string | null;
  ownerKey: string | null;
  className: string;
}) {
  return <CachedAccountImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className={className} />;
}
