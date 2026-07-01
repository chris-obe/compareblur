import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Pencil, RotateCcw, Save, Send, Trash2, Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  deleteAdminGalleryPhoto,
  updateAdminGalleryPhoto,
  uploadAdminGalleryPhoto,
  type AdminGalleryPhoto,
  type GalleryModerationStatus,
  type GalleryTag,
} from '../../lib/galleryApi';
import {
  GALLERY_UPLOAD_MAX_BYTES,
  GALLERY_UPLOAD_MAX_LONG_EDGE,
  processGalleryUploadImage,
  type ImageProcessingProgress,
  type ProcessedImage,
} from '../../lib/imageProcessing';
import { suggestGalleryMetadata, type GalleryMetadataSuggestion } from '../../lib/galleryMetadata';
import { useCatalog } from '../../store/CatalogProvider';
import {
  formatNumber,
  metadataRowFromPhoto,
  normalizedFormatId,
  photoMetadataUpdatePayload,
  type PhotoMetadataRow,
} from '../gallery/metadata/photoMetadataModel';

const PhotoMetadataGrid = lazy(() => import('../gallery/metadata/PhotoMetadataGrid').then((module) => ({ default: module.PhotoMetadataGrid })));

interface Props {
  accessToken?: string;
  photos: AdminGalleryPhoto[];
  loading: boolean;
  loaded: boolean;
  error?: string | null;
  tags: GalleryTag[];
  onReload: () => Promise<void>;
  onCreateTag: (label: string) => Promise<GalleryTag>;
  onError: (message: string) => void;
}

const STATUS_ORDER: GalleryModerationStatus[] = ['pending', 'approved', 'not_submitted', 'rejected'];

interface UploadQueueItem {
  id: string;
  file: File;
  row: PhotoMetadataRow;
  suggestion: GalleryMetadataSuggestion;
  processedImage: ProcessedImage;
  previewUrl: string;
}

export function GalleryAdmin({ accessToken, photos, loading, loaded, error, tags, onReload, onCreateTag, onError }: Props) {
  const { cameras, lenses } = useCatalog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [readingExif, setReadingExif] = useState(false);
  const [status, setStatus] = useState<GalleryModerationStatus | 'all'>('all');
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [editing, setEditing] = useState<{ id: string; row: PhotoMetadataRow } | null>(null);
  const [processing, setProcessing] = useState<ImageProcessingProgress | null>(null);
  const uploadQueueRef = useRef<UploadQueueItem[]>([]);

  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  useEffect(() => () => {
    uploadQueueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const filtered = useMemo(
    () => (status === 'all' ? photos : photos.filter((photo) => photo.galleryStatus === status)),
    [photos, status],
  );

  const counts = useMemo(() => {
    return photos.reduce<Record<string, number>>(
      (acc, photo) => {
        acc[photo.galleryStatus] = (acc[photo.galleryStatus] ?? 0) + 1;
        acc.all += 1;
        return acc;
      },
      { all: 0 },
    );
  }, [photos]);
  const reviewCount = useMemo(() => photos.filter((photo) => photo.galleryStatusNeedsReview).length, [photos]);

  const activeTags = useMemo(() => tags.filter((tag) => !tag.archived), [tags]);
  const uploadRows = useMemo(() => uploadQueue.map((item) => item.row), [uploadQueue]);

  const setUploadRows = (rows: PhotoMetadataRow[]) => {
    setUploadQueue((current) => current.map((item) => ({
      ...item,
      row: rows.find((row) => row.id === item.id) ?? item.row,
    })));
  };

  const chooseFiles = async (files: FileList | null) => {
    const incoming = files ? Array.from(files) : [];
    if (incoming.length === 0) return;
    setReadingExif(true);
    setProcessing(null);
    const nextItems: UploadQueueItem[] = [];
    const previewUrls: string[] = [];
    try {
      for (const file of incoming) {
        const previewUrl = URL.createObjectURL(file);
        previewUrls.push(previewUrl);
        const suggestion = await suggestGalleryMetadata(file, cameras, lenses);
        const processedImage = await processGalleryUploadImage(file, setProcessing);
        const id = `upload-${crypto.randomUUID()}`;
        nextItems.push({
          id,
          file,
          suggestion,
          processedImage,
          previewUrl,
          row: rowFromSuggestion(id, previewUrl, file.name, suggestion, activeTags),
        });
      }
      setUploadQueue((current) => [...current, ...nextItems]);
    } catch (err) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      onError(err instanceof Error ? err.message : 'Could not prepare images for upload');
    } finally {
      setReadingExif(false);
      setProcessing(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetUpload = () => {
    uploadQueue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setUploadQueue([]);
    setProcessing(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateStatus = async (photo: AdminGalleryPhoto, next: GalleryModerationStatus) => {
    setBusyId(photo.id);
    try {
      await updateAdminGalleryPhoto(photo.id, { galleryStatus: next, galleryStatusReviewed: true }, accessToken);
      await onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gallery update failed');
    } finally {
      setBusyId(null);
    }
  };

  const markReviewed = async (photo: AdminGalleryPhoto) => {
    setBusyId(photo.id);
    try {
      await updateAdminGalleryPhoto(photo.id, { galleryStatus: photo.galleryStatus, galleryStatusReviewed: true }, accessToken);
      await onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gallery review update failed');
    } finally {
      setBusyId(null);
    }
  };

  const beginEdit = (photo: AdminGalleryPhoto) => {
    setEditing({ id: photo.id, row: metadataRowFromPhoto(photo) });
  };

  const saveEdit = async () => {
    if (!editing) return;

    setBusyId(editing.id);
    try {
      const current = photos.find((photo) => photo.id === editing.id);
      if (!current) throw new Error('Gallery record was not found');
      await updateAdminGalleryPhoto(editing.id, {
        ...photoMetadataUpdatePayload(current, editing.row),
        galleryStatus: editing.row.galleryStatus ?? current.galleryStatus,
      }, accessToken);
      setEditing(null);
      await onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gallery edit failed');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (photo: AdminGalleryPhoto) => {
    setBusyId(photo.id);
    try {
      await deleteAdminGalleryPhoto(photo.id, accessToken);
      await onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gallery delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const upload = async () => {
    if (uploadQueue.length === 0) {
      onError('Choose images before sending them to Cloudflare.');
      return;
    }
    const invalid = uploadQueue.find((item) => !item.row.title.trim() || !item.row.subjectPreset);
    if (invalid) {
      onError('Every queued photo needs a title and framing preset before upload.');
      return;
    }

    setUploading(true);
    try {
      for (const [index, item] of uploadQueue.entries()) {
        setProcessing({
          stage: 'uploading',
          label: `Uploading ${index + 1} of ${uploadQueue.length}`,
          percent: Math.round(((index + 1) / uploadQueue.length) * 100),
        });
        await uploadAdminGalleryPhoto(uploadFormFromQueueItem(item), accessToken);
      }
      resetUpload();
      await onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gallery upload failed');
    } finally {
      setUploading(false);
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', ...STATUS_ORDER] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={[
              'border px-3 py-1.5 text-xs uppercase tracking-wide',
              status === item ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
            ].join(' ')}
          >
            {item === 'all' ? 'all' : galleryStatusLabel(item)} {counts[item] ?? 0}
          </button>
        ))}
        <Button onClick={onReload} disabled={loading}>
          <RotateCcw size={14} strokeWidth={1.5} />
          Reload gallery
        </Button>
      </div>

      <section className="border border-line p-3">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="label mb-1">Upload queue</div>
            <div className="text-sm font-bold tracking-tight">Stage photos, then bulk-edit metadata</div>
            <div className="mt-1 text-xs text-muted">
              Upload target: {GALLERY_UPLOAD_MAX_LONG_EDGE}px long edge, {formatBytes(GALLERY_UPLOAD_MAX_BYTES)} max.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={readingExif || uploading}>
              <ImagePlus size={14} strokeWidth={1.5} />
              Choose images
            </Button>
            <Button
              type="button"
              variant="solid"
              onClick={() => void upload()}
              disabled={uploading || !!processing || readingExif || uploadQueue.length === 0 || uploadQueue.some((item) => !item.row.title || !item.row.subjectPreset)}
            >
              <Send size={14} strokeWidth={1.5} />
              {uploading ? 'Uploading' : `Send ${uploadQueue.length || ''}`.trim()}
            </Button>
            <Button type="button" onClick={resetUpload} disabled={uploading || uploadQueue.length === 0}>
              Reset
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void chooseFiles(event.target.files)}
        />
        {readingExif && (
          <div className="mb-3 border border-line bg-faint px-3 py-2 text-xs text-muted">
            Reading EXIF, matching the catalog, and preparing web images…
          </div>
        )}
        {processing && (
          <div className="mb-3 text-xs">
            <div className="mb-1 flex justify-between gap-3 text-muted">
              <span>{processing.label}</span>
              <span>{processing.percent}%</span>
            </div>
            <div className="h-1.5 w-full bg-line">
              <div className="h-full bg-fg transition-all" style={{ width: `${processing.percent}%` }} />
            </div>
          </div>
        )}
        {uploadQueue.length > 0 && (
          <div className="mb-3 grid gap-2 text-xs sm:grid-cols-3">
            <SummaryTile label="Queued" value={`${uploadQueue.length} image${uploadQueue.length === 1 ? '' : 's'}`} />
            <SummaryTile
              label="Processed"
              value={formatBytes(uploadQueue.reduce((total, item) => total + item.processedImage.processedBytes, 0))}
            />
            <SummaryTile
              label="Needs framing"
              value={String(uploadQueue.filter((item) => !item.row.subjectPreset).length)}
            />
          </div>
        )}
        <Suspense fallback={<div className="border border-line bg-faint px-3 py-8 text-center text-xs text-muted">Loading metadata grid…</div>}>
          <PhotoMetadataGrid
            rows={uploadRows}
            context="gallery-upload"
            catalog={{ cameras, lenses }}
            tags={activeTags}
            onCreateTag={onCreateTag}
            onRowsChange={setUploadRows}
            minHeight={280}
            maxHeight={520}
          />
        </Suspense>
      </section>

      {editing && (
        <section className="border border-line bg-faint p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label mb-1">Edit gallery record</div>
              <div className="text-sm font-bold tracking-tight">{editing.row.title || editing.id}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="solid" onClick={() => void saveEdit()} disabled={busyId === editing.id || !editing.row.title}>
                <Save size={14} strokeWidth={1.5} />
                Save record
              </Button>
              <Button type="button" onClick={() => setEditing(null)} disabled={busyId === editing.id}>
                Cancel
              </Button>
            </div>
          </div>
          <Suspense fallback={<div className="border border-line bg-faint px-3 py-8 text-center text-xs text-muted">Loading metadata grid…</div>}>
            <PhotoMetadataGrid
              rows={[editing.row]}
              context="admin-edit"
              catalog={{ cameras, lenses }}
              tags={activeTags}
              onCreateTag={onCreateTag}
              onRowsChange={(rows) => setEditing((current) => current ? { ...current, row: rows[0] ?? current.row } : current)}
              minHeight={180}
              maxHeight={260}
            />
          </Suspense>
        </section>
      )}

      {reviewCount > 0 && (
        <div className="border border-line bg-faint p-3 text-xs">
          {reviewCount} uploaded photo{reviewCount === 1 ? '' : 's'} need review because they were previously auto-promoted into the public gallery.
        </div>
      )}

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[58rem] border-collapse text-left text-xs">
          <thead className="bg-faint text-muted">
            <tr>
              <Th>Photo</Th>
              <Th>Status</Th>
              <Th>Format</Th>
              <Th>Camera</Th>
              <Th>Lens</Th>
              <Th>Tags</Th>
              <Th>Updated</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((photo) => (
              <tr key={photo.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <AuthenticatedThumbnail photo={photo} accessToken={accessToken} />
                    <div className="min-w-0">
                      <div className="truncate font-bold">{photo.title}</div>
                      <div className="truncate text-muted">{photo.author || 'Unknown author'}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{photo.galleryStatus}</span>
                    {photo.galleryStatusNeedsReview && (
                      <span className="inline-flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                        Review
                      </span>
                    )}
                  </div>
                </Td>
                <Td>{photo.formatId}</Td>
                <Td>{photo.camera}</Td>
                <Td>{photo.lens}</Td>
                <Td>{photo.tags.join(', ')}</Td>
                <Td>{photo.updatedAt ? new Date(photo.updatedAt).toLocaleString() : 'Unknown'}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {photo.galleryStatus === 'approved' ? (
                      <span className="inline-flex items-center gap-2 border border-line bg-faint px-3 py-1.5 text-xs uppercase tracking-wide">
                        <Check size={13} strokeWidth={1.5} />
                        Live
                      </span>
                    ) : (
                      <Button disabled={busyId === photo.id} onClick={() => updateStatus(photo, 'approved')}>
                        <Check size={13} strokeWidth={1.5} />
                        Approve
                      </Button>
                    )}
                    {photo.galleryStatusNeedsReview && (
                      <Button disabled={busyId === photo.id} onClick={() => markReviewed(photo)}>
                        <Check size={13} strokeWidth={1.5} />
                        Reviewed
                      </Button>
                    )}
                    <Button disabled={busyId === photo.id} onClick={() => beginEdit(photo)}>
                      <Pencil size={13} strokeWidth={1.5} />
                      Edit
                    </Button>
                    <Button disabled={busyId === photo.id} onClick={() => updateStatus(photo, 'rejected')}>
                      <X size={13} strokeWidth={1.5} />
                      Reject
                    </Button>
                    <Button disabled={busyId === photo.id} onClick={() => remove(photo)}>
                      <Trash2 size={13} strokeWidth={1.5} />
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="px-4 py-10 text-center text-xs text-muted">Loading gallery photos…</div>}
        {!loading && error && <div className="px-4 py-10 text-center text-xs text-muted">{error}</div>}
        {!loading && loaded && !error && filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-xs text-muted">No photos in this view.</div>
        )}
      </div>
    </div>
  );
}

function AuthenticatedThumbnail({ photo, accessToken }: { photo: AdminGalleryPhoto; accessToken?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const imageSrc = photo.galleryStatus === 'approved' ? `/api/gallery/photos/${photo.id}/image` : photo.src;
    const headers = new Headers({ accept: photo.contentType ?? 'image/*' });
    if (photo.galleryStatus !== 'approved' && accessToken) headers.set('authorization', `Bearer ${accessToken}`);

    fetch(imageSrc, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`Thumbnail failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, photo.contentType, photo.galleryStatus, photo.id, photo.src]);

  if (!src) return <div className="flex h-14 w-20 items-center justify-center border border-line bg-faint"><Upload size={14} strokeWidth={1.5} /></div>;
  return <img src={src} alt="" className="h-14 w-20 border border-line object-cover grayscale" />;
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-faint px-3 py-2">
      <div className="label">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

function rowFromSuggestion(
  id: string,
  previewUrl: string,
  fileName: string,
  suggestion: GalleryMetadataSuggestion,
  activeTags: GalleryTag[],
): PhotoMetadataRow {
  return {
    id,
    previewSrc: previewUrl,
    previewLabel: fileName,
    title: suggestion.title,
    author: '',
    camera: suggestion.camera,
    cameraCatalogId: suggestion.cameraCatalogId ?? '',
    lens: suggestion.lens,
    lensCatalogId: suggestion.lensCatalogId ?? '',
    formatId: normalizedFormatId(suggestion.formatId),
    focal: formatNumber(suggestion.focal),
    aperture: formatNumber(suggestion.aperture),
    subjectPreset: '',
    shutterSpeed: suggestion.shutterSpeed ?? '',
    iso: suggestion.iso != null ? String(suggestion.iso) : '',
    capturedAt: dateInputValue(suggestion.capturedAt),
    tags: suggestedTags(suggestion, activeTags),
    galleryStatus: 'approved',
    notes: '',
  };
}

function uploadFormFromQueueItem(item: UploadQueueItem): FormData {
  const { row, processedImage, suggestion } = item;
  const form = new FormData();
  form.set('file', processedImage.file);
  form.set('title', row.title);
  form.set('author', row.author);
  form.set('camera', row.camera);
  form.set('cameraCatalogId', row.cameraCatalogId);
  form.set('lens', row.lens);
  form.set('lensCatalogId', row.lensCatalogId);
  form.set('formatId', normalizedFormatId(row.formatId));
  form.set('focal', row.focal);
  form.set('aperture', row.aperture);
  form.set('subjectPreset', row.subjectPreset);
  form.set('shutterSpeed', row.shutterSpeed);
  form.set('iso', row.iso);
  form.set('capturedAt', row.capturedAt);
  form.set('tags', row.tags.join(','));
  form.set('galleryStatus', row.galleryStatus ?? 'approved');
  form.set('width', String(processedImage.width));
  form.set('height', String(processedImage.height));
  form.set('metadataSource', JSON.stringify({
    ...suggestion.source,
    processing: {
      originalBytes: processedImage.originalBytes,
      processedBytes: processedImage.processedBytes,
      width: processedImage.width,
      height: processedImage.height,
      contentType: processedImage.contentType,
      maxLongEdge: GALLERY_UPLOAD_MAX_LONG_EDGE,
      maxBytes: GALLERY_UPLOAD_MAX_BYTES,
    },
  }));
  return form;
}

function suggestedTags(suggestion: GalleryMetadataSuggestion, availableTags: GalleryTag[]): string[] {
  const tags = new Set<string>();
  const available = new Set(availableTags.map((tag) => tag.label));
  if (suggestion.cameraConfidence !== 'none' && available.has('catalog')) tags.add('catalog');
  if (suggestion.source.exif.guessedFormat && available.has('check format')) tags.add('check format');
  return [...tags];
}

function galleryStatusLabel(status: GalleryModerationStatus) {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'not_submitted':
      return 'library only';
  }
}

function dateInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-normal uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}
