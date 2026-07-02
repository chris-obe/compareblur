import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userTokenParams } from '../../auth/config';
import {
  ApiError,
  getAccountGalleryAlbum,
  getGalleryAlbum,
  getPublicEmbedTemplate,
  updateAccountGalleryAlbum,
  type EmbedTemplate,
  type GalleryAlbum,
  type GalleryAlbumPhotoVisibility,
  type GalleryAlbumStatus,
} from '../../lib/galleryApi';
import { useClearCachedAccountImagesOnOwnerChange } from '../../lib/accountImageCache';
import { suggestGalleryMetadata } from '../../lib/galleryMetadata';
import type { GalleryItem, ViewEntry } from '../../lib/types';
import { usePublicGalleryPhotos } from '../../hooks/usePublicGalleryPhotos';
import { useCatalog } from '../../store/CatalogProvider';
import { useReactions } from '../../store/ReactionsProvider';
import { CachedAccountImage } from './CachedAccountImage';
import { EmbedCodeDialog } from '../embed/EmbedCodeDialog';
import { PhotoLightbox } from '../lightbox/PhotoLightbox';
import { Button } from '../ui/Button';
import { GallerySurface } from './GallerySurface';
import { LightboxInfo } from './LightboxInfo';
import { UploadBox } from './UploadBox';

type EmbedRequest =
  | { mode: 'selection'; photoIds: string[]; albumSlug?: string; albumTitle?: string }
  | { mode: 'album'; albumSlug: string; albumTitle: string };

interface GalleryPageProps {
  albumSlug?: string;
  initialPhotoId?: string;
  closePath?: string;
}

export function GalleryPage({ albumSlug, initialPhotoId, closePath }: GalleryPageProps = {}) {
  const navigate = useNavigate();
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const { cameras, lenses } = useCatalog();
  const { registerCounts } = useReactions();
  const publicGallery = usePublicGalleryPhotos({ enabled: !albumSlug });
  const ownerKey = user?.sub ?? null;
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [album, setAlbum] = useState<GalleryAlbum | null>(null);
  const [ownerAlbum, setOwnerAlbum] = useState<GalleryAlbum | null>(null);
  const [ownerAccessToken, setOwnerAccessToken] = useState<string | null>(null);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [embedTemplate, setEmbedTemplate] = useState<EmbedTemplate | null>(null);
  const [embedRequest, setEmbedRequest] = useState<EmbedRequest | null>(null);
  const [albumPassword, setAlbumPassword] = useState('');
  const [albumPasswordAttempt, setAlbumPasswordAttempt] = useState<{ value: string; nonce: number } | null>(null);
  const [albumPasswordRequired, setAlbumPasswordRequired] = useState(false);
  const [albumPasswordMessage, setAlbumPasswordMessage] = useState('');
  const [uploadPreview, setUploadPreview] = useState<ViewEntry | null>(null);
  const objectUrl = useRef<string | null>(null);

  useClearCachedAccountImagesOnOwnerChange(ownerKey);

  const loadOwnerAlbum = useCallback(async () => {
    if (!albumSlug || !isAuthenticated) {
      setOwnerAlbum(null);
      setOwnerAccessToken(null);
      return null;
    }

    const token = await getAccessTokenSilently({ authorizationParams: userTokenParams });
    const data = await getAccountGalleryAlbum(albumSlug, token);
    setOwnerAccessToken(token);
    setOwnerAlbum(data.album);
    return data.album;
  }, [albumSlug, getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    if (!albumSlug) {
      setAlbum(null);
      setItems(publicGallery.photos);
      return;
    }

    setAlbum(null);
    setItems([]);
    getGalleryAlbum(albumSlug, { password: albumPasswordAttempt?.value ?? undefined })
      .then((data) => {
        if (cancelled) return;
        setAlbumPasswordRequired(false);
        setAlbumPasswordMessage('');
        setAlbum(data.album);
        setItems(data.photos);
        registerCounts(data.photos);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError) {
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
        setAlbum(null);
        setItems([]);
        registerCounts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [albumPasswordAttempt, albumSlug, publicGallery.photos, registerCounts]);

  useEffect(() => {
    if (albumSlug) return;
    setAlbum(null);
    setItems(publicGallery.photos);
  }, [albumSlug, publicGallery.photos]);

  useEffect(() => {
    let cancelled = false;
    if (!albumSlug || !isAuthenticated) {
      setOwnerAlbum(null);
      setOwnerAccessToken(null);
      return;
    }

    loadOwnerAlbum().catch(() => {
      if (!cancelled) {
        setOwnerAlbum(null);
        setOwnerAccessToken(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [albumSlug, isAuthenticated, loadOwnerAlbum]);

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
    setAlbumPassword('');
    setAlbumPasswordAttempt(null);
    setAlbumPasswordRequired(false);
    setAlbumPasswordMessage('');
    setSelectedPhotoIds(new Set());
    setSelectionAnchorId(null);
  }, [albumSlug]);

  const revokeUploadPreview = () => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  };

  useEffect(() => revokeUploadPreview, []);

  const activeAlbum = ownerAlbum ?? album;
  const displayItems = useMemo(() => ownerAlbum?.photos ?? items, [items, ownerAlbum]);
  const isOwnerAlbum = !!ownerAlbum;
  const selectedAlbumPhotos = useMemo(
    () => (ownerAlbum?.photos ?? []).filter((photo) => selectedPhotoIds.has(photo.id)),
    [ownerAlbum, selectedPhotoIds],
  );
  const selectedVisibleCount = selectedAlbumPhotos.filter((photo) => photo.visibility === 'visible').length;
  const selectedEmbeddableCount = ownerAlbum && ownerAlbum.status === 'published' && !ownerAlbum.hasPassword
    ? selectedVisibleCount
    : 0;
  const embedReady = !!embedTemplate;

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const metadata = await suggestGalleryMetadata(file, cameras, lenses);
      revokeUploadPreview();
      const preview = URL.createObjectURL(file);
      objectUrl.current = preview;
      setUploadPreview({
        id: 'upload',
        title: file.name,
        metaLine: `${metadata.camera} · ${metadata.lens} · shot f/${metadata.aperture}`,
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
      });
    } finally {
      setBusy(false);
    }
  };

  const updateOwnerAlbumStatus = async (status: GalleryAlbumStatus) => {
    if (!ownerAlbum || ownerBusy) return;
    setOwnerBusy(true);
    try {
      const token = ownerAccessToken ?? await getAccessTokenSilently({ authorizationParams: userTokenParams });
      setOwnerAccessToken(token);
      const updated = await updateAccountGalleryAlbum(ownerAlbum.slug, { status }, token);
      setOwnerAlbum(updated);
    } finally {
      setOwnerBusy(false);
    }
  };

  const updateSelectedVisibility = async (visibility: GalleryAlbumPhotoVisibility) => {
    if (!ownerAlbum || ownerBusy || selectedPhotoIds.size === 0) return;
    setOwnerBusy(true);
    try {
      const token = ownerAccessToken ?? await getAccessTokenSilently({ authorizationParams: userTokenParams });
      setOwnerAccessToken(token);
      const updated = await updateAccountGalleryAlbum(ownerAlbum.slug, {
        photos: ownerAlbum.photos.map((photo) => ({
          photoId: photo.photoId,
          caption: photo.caption ?? null,
          visibility: selectedPhotoIds.has(photo.id) ? visibility : photo.visibility,
        })),
      }, token);
      setOwnerAlbum(updated);
      setSelectedPhotoIds(new Set());
      setSelectionAnchorId(null);
    } finally {
      setOwnerBusy(false);
    }
  };

  const reloadOwner = async () => {
    if (!ownerAlbum || ownerBusy) return;
    setOwnerBusy(true);
    try {
      await loadOwnerAlbum();
    } finally {
      setOwnerBusy(false);
    }
  };

  const canShowGallery = !albumSlug || !albumPasswordRequired || !!activeAlbum;
  const protectedLabel = activeAlbum
    ? activeAlbum.hasPassword ? 'Protected album' : isOwnerAlbum ? 'Your album' : 'Album'
    : undefined;

  return (
    <div className="flex min-h-0 flex-col">
      {albumSlug && albumPasswordRequired && !activeAlbum && (
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

      {canShowGallery && (
        <GallerySurface
          items={displayItems}
          title={activeAlbum?.title}
          description={activeAlbum?.description}
          ownerName={!isOwnerAlbum ? activeAlbum?.ownerName : undefined}
          protectedLabel={protectedLabel}
          enableReactions={!albumSlug}
          uploadSlot={!albumSlug ? <UploadBox onFile={onFile} busy={busy} /> : undefined}
          initialPhotoId={initialPhotoId}
          onOpenPhoto={(item) => {
            if (albumSlug) navigate(`/g/${encodeURIComponent(albumSlug)}/photo/${encodeURIComponent(item.id)}`);
            else navigate(`/gallery/photo/${encodeURIComponent(item.id)}`);
          }}
          onClosePhoto={() => {
            if (closePath && initialPhotoId) navigate(closePath, { replace: true });
          }}
          selection={isOwnerAlbum ? {
            selectedIds: selectedPhotoIds,
            anchorId: selectionAnchorId,
            onChange: (ids, anchorId) => {
              setSelectedPhotoIds(ids);
              setSelectionAnchorId(anchorId);
            },
            primaryActionLabel: 'Show in public album',
            secondaryActionLabel: 'Hide from public album',
            selectedSecondaryCount: selectedVisibleCount,
            selectedEmbeddableCount,
            embedReady,
            embedSelectedLabel: selectedPhotoIds.size > 0 && selectedEmbeddableCount === 0
              ? 'Only visible photos in a public album can be embedded'
              : 'Embed selected',
            onPrimaryAction: () => void updateSelectedVisibility('visible'),
            onSecondaryAction: () => void updateSelectedVisibility('hidden'),
            onEmbedSelected: () => {
              if (!ownerAlbum) return;
              const photoIds = selectedAlbumPhotos.filter((photo) => photo.visibility === 'visible').map((photo) => photo.id);
              if (photoIds.length === 0) return;
              setEmbedRequest({
                mode: 'selection',
                photoIds,
                albumSlug: ownerAlbum.slug,
                albumTitle: ownerAlbum.title,
              });
            },
          } : undefined}
          ownerControls={ownerAlbum ? {
            visibility: {
              value: ownerAlbum.status,
              busy: ownerBusy,
              onChange: (status) => void updateOwnerAlbumStatus(status),
            },
            mode: {
              value: 'view',
              onView: () => undefined,
              onEdit: () => navigate(`/albums/${encodeURIComponent(ownerAlbum.slug)}?mode=edit`),
            },
            canEmbedAlbum: embedReady && ownerAlbum.status === 'published' && !ownerAlbum.hasPassword,
            embedAlbumDisabledReason: ownerAlbum.hasPassword
              ? 'Password-protected albums are not embeddable'
              : ownerAlbum.status === 'published'
                ? 'Embed settings are still loading'
                : 'Make the album public to embed it',
            onEmbedAlbum: () => setEmbedRequest({ mode: 'album', albumSlug: ownerAlbum.slug, albumTitle: ownerAlbum.title }),
            onReload: () => void reloadOwner(),
            onAdd: () => navigate(`/albums/${encodeURIComponent(ownerAlbum.slug)}?mode=edit`),
            addLabel: 'Upload',
          } : undefined}
          renderImage={ownerAlbum ? (item, className) => (
            <CachedAccountImage
              photo={item}
              accessToken={ownerAccessToken}
              ownerKey={ownerKey}
              className={className}
              alt={item.title}
            />
          ) : undefined}
        />
      )}

      {uploadPreview && (
        <PhotoLightbox
          entries={[uploadPreview]}
          index={0}
          onIndex={() => undefined}
          onClose={() => {
            setUploadPreview(null);
            revokeUploadPreview();
          }}
          renderInfo={(entry) => <LightboxInfo entry={entry} enableReactions={false} />}
        />
      )}

      {embedTemplate && embedRequest && (
        <EmbedCodeDialog
          mode={embedRequest.mode}
          template={embedTemplate}
          onClose={() => setEmbedRequest(null)}
          albumSlug={embedRequest.mode === 'album' ? embedRequest.albumSlug : embedRequest.albumSlug}
          albumTitle={embedRequest.mode === 'album' ? embedRequest.albumTitle : embedRequest.albumTitle}
          photoIds={embedRequest.mode === 'selection' ? embedRequest.photoIds : undefined}
        />
      )}
    </div>
  );
}
