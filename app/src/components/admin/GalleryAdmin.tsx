import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Pencil, RotateCcw, Save, Send, Trash2, Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { FreeTextComboBox, type FreeTextOption } from '../ui/FreeTextComboBox';
import { TagPicker } from '../ui/TagPicker';
import {
  deleteAdminGalleryPhoto,
  updateAdminGalleryPhoto,
  uploadAdminGalleryPhoto,
  type AdminGalleryPhoto,
  type GalleryTag,
  type GalleryStatus,
} from '../../lib/galleryApi';
import {
  GALLERY_UPLOAD_MAX_BYTES,
  GALLERY_UPLOAD_MAX_LONG_EDGE,
  processGalleryUploadImage,
  type ImageProcessingProgress,
  type ProcessedImage,
} from '../../lib/imageProcessing';
import { suggestGalleryMetadata, type GalleryMetadataSuggestion } from '../../lib/galleryMetadata';
import { FORMATS } from '../../lib/engine';
import { cameraFormat, defaultFocal, lensesForCamera, maxApertureAtFocal, type Camera, type CatalogLens } from '../../lib/gear';
import { useCatalog } from '../../store/CatalogProvider';

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

interface UploadFields {
  title: string;
  author: string;
  camera: string;
  cameraCatalogId: string;
  lens: string;
  lensCatalogId: string;
  formatId: string;
  focal: string;
  aperture: string;
  tags: string[];
  status: GalleryStatus;
  notes: string;
}

const STATUS_ORDER: GalleryStatus[] = ['pending', 'approved', 'draft', 'rejected'];
const INITIAL_FIELDS: UploadFields = {
  title: '',
  author: '',
  camera: '',
  cameraCatalogId: '',
  lens: '',
  lensCatalogId: '',
  formatId: 'ff',
  focal: '50',
  aperture: '1.8',
  tags: [],
  status: 'approved',
  notes: '',
};

export function GalleryAdmin({ accessToken, photos, loading, loaded, error, tags, onReload, onCreateTag, onError }: Props) {
  const { cameras, lenses } = useCatalog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [readingExif, setReadingExif] = useState(false);
  const [status, setStatus] = useState<GalleryStatus | 'all'>('all');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<GalleryMetadataSuggestion | null>(null);
  const [fields, setFields] = useState<UploadFields>(INITIAL_FIELDS);
  const [editing, setEditing] = useState<{ id: string; fields: UploadFields } | null>(null);
  const [processing, setProcessing] = useState<ImageProcessingProgress | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [focalFromExif, setFocalFromExif] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filtered = useMemo(
    () => (status === 'all' ? photos : photos.filter((photo) => photo.status === status)),
    [photos, status],
  );

  const counts = useMemo(() => {
    return photos.reduce<Record<string, number>>(
      (acc, photo) => {
        acc[photo.status] = (acc[photo.status] ?? 0) + 1;
        acc.all += 1;
        return acc;
      },
      { all: 0 },
    );
  }, [photos]);

  const activeTags = useMemo(() => tags.filter((tag) => !tag.archived), [tags]);
  const cameraOptions = useMemo<FreeTextOption[]>(
    () => cameras.map((camera) => ({ id: camera.id, label: camera.name, maker: camera.maker, detail: camera.formatId })),
    [cameras],
  );
  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === fields.cameraCatalogId),
    [cameras, fields.cameraCatalogId],
  );
  const lensOptions = useMemo<FreeTextOption[]>(() => {
    const available = selectedCamera ? lensesForCamera(selectedCamera, lenses) : lenses;
    return available.map((lens) => ({
      id: lens.id,
      label: lens.name,
      maker: lens.maker,
      detail: lens.type === 'zoom' ? `${lens.focalMin}-${lens.focalMax}mm` : `${lens.focalMin}mm`,
    }));
  }, [lenses, selectedCamera]);

  const setField = <K extends keyof UploadFields>(name: K, value: UploadFields[K]) => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  const setTagsField = (value: string[]) => {
    setFields((current) => ({ ...current, tags: value }));
  };

  const chooseFile = async (nextFile: File | null) => {
    if (!nextFile) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setReadingExif(true);
    setSuggestion(null);
    setProcessedImage(null);
    setProcessing(null);

    await extractExifFromFile(nextFile);
  };

  const extractExifFromFile = async (sourceFile = file) => {
    if (!sourceFile) return;
    setReadingExif(true);
    try {
      const next = await suggestGalleryMetadata(sourceFile, cameras, lenses);
      applySuggestion(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read image metadata');
    } finally {
      setReadingExif(false);
    }
  };

  const resetUpload = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setSuggestion(null);
    setProcessedImage(null);
    setProcessing(null);
    setFocalFromExif(false);
    setFields(INITIAL_FIELDS);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applySuggestion = (next: GalleryMetadataSuggestion) => {
    setSuggestion(next);
    setFocalFromExif(next.source.exif.focal != null || next.source.exif.focal35 != null);
    setFields({
      title: next.title,
      author: '',
      camera: next.camera,
      cameraCatalogId: next.cameraCatalogId ?? '',
      lens: next.lens,
      lensCatalogId: next.lensCatalogId ?? '',
      formatId: next.formatId,
      focal: formatNumber(next.focal),
      aperture: formatNumber(next.aperture),
      tags: suggestedTags(next, activeTags),
      status: 'approved',
      notes: '',
    });
  };

  const selectCamera = (camera: Camera) => {
    setFields((current) => {
      const compatible = current.lensCatalogId
        ? lensesForCamera(camera, lenses).some((lens) => lens.id === current.lensCatalogId)
        : true;
      return {
        ...current,
        camera: camera.name,
        cameraCatalogId: camera.id,
        formatId: cameraFormat(camera).id,
        lens: compatible ? current.lens : '',
        lensCatalogId: compatible ? current.lensCatalogId : '',
      };
    });
  };

  const selectLens = (lens: CatalogLens) => {
    const exifFocal = suggestion?.source.exif.focal ?? suggestion?.source.exif.focal35;
    const focal = exifFocal != null && exifFocal >= lens.focalMin && exifFocal <= lens.focalMax
      ? exifFocal
      : defaultFocal(lens);
    setFocalFromExif(exifFocal === focal);
    setFields((current) => ({
      ...current,
      lens: lens.name,
      lensCatalogId: lens.id,
      focal: formatNumber(focal),
      aperture: current.aperture || formatNumber(maxApertureAtFocal(lens, focal)),
    }));
  };

  const updateStatus = async (photo: AdminGalleryPhoto, next: GalleryStatus) => {
    setBusyId(photo.id);
    try {
      await updateAdminGalleryPhoto(photo.id, { status: next }, accessToken);
      await onReload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gallery update failed');
    } finally {
      setBusyId(null);
    }
  };

  const beginEdit = (photo: AdminGalleryPhoto) => {
    setEditing({ id: photo.id, fields: fieldsFromPhoto(photo) });
  };

  const setEditField = <K extends keyof UploadFields>(name: K, value: UploadFields[K]) => {
    setEditing((current) => current ? { ...current, fields: { ...current.fields, [name]: value } } : current);
  };

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    setBusyId(editing.id);
    try {
      await updateAdminGalleryPhoto(editing.id, {
        title: editing.fields.title,
        author: editing.fields.author,
        status: editing.fields.status,
        formatId: normalizedFormatId(editing.fields.formatId),
        camera: editing.fields.camera,
        cameraCatalogId: editing.fields.cameraCatalogId,
        lens: editing.fields.lens,
        lensCatalogId: editing.fields.lensCatalogId,
        focal: numberOrFallback(editing.fields.focal, 50),
        aperture: numberOrFallback(editing.fields.aperture, 1.8),
        tags: editing.fields.tags,
        notes: editing.fields.notes,
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

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      onError('Choose an image before sending it to Cloudflare.');
      return;
    }

    let image: ProcessedImage;
    try {
      image = await processGalleryUploadImage(file, setProcessing);
      setProcessedImage(image);
    } catch (err) {
      setProcessing(null);
      onError(err instanceof Error ? err.message : 'Could not process image for upload');
      return;
    }

    const form = new FormData();
    form.set('file', image.file);
    form.set('title', fields.title);
    form.set('author', fields.author);
    form.set('camera', fields.camera);
    form.set('cameraCatalogId', fields.cameraCatalogId);
    form.set('lens', fields.lens);
    form.set('lensCatalogId', fields.lensCatalogId);
    form.set('formatId', normalizedFormatId(fields.formatId));
    form.set('focal', fields.focal);
    form.set('aperture', fields.aperture);
    form.set('tags', fields.tags.join(','));
    form.set('status', fields.status);
    form.set('width', String(image.width));
    form.set('height', String(image.height));
    form.set('metadataSource', JSON.stringify({
      ...(suggestion?.source ?? {}),
      processing: {
        originalBytes: image.originalBytes,
        processedBytes: image.processedBytes,
        width: image.width,
        height: image.height,
        contentType: image.contentType,
        maxLongEdge: GALLERY_UPLOAD_MAX_LONG_EDGE,
        maxBytes: GALLERY_UPLOAD_MAX_BYTES,
      },
    }));

    setUploading(true);
    setProcessing({ stage: 'uploading', label: 'Uploading to Cloudflare', percent: 100 });
    try {
      await uploadAdminGalleryPhoto(form, accessToken);
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
            {item} {counts[item] ?? 0}
          </button>
        ))}
        <Button onClick={onReload} disabled={loading}>
          <RotateCcw size={14} strokeWidth={1.5} />
          Reload gallery
        </Button>
      </div>

      <form onSubmit={upload} className="border border-line p-3">
        <div className="grid gap-3 xl:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border border-dashed border-line bg-faint text-xs uppercase tracking-wide transition-colors hover:border-line-strong"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-cover grayscale" />
              ) : (
                <>
                  <ImagePlus size={18} strokeWidth={1.5} />
                  Choose Image
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
            />
            <div className="text-xs">
              <div className="truncate font-bold">{file?.name ?? 'No image selected'}</div>
              <div className="mt-1 text-muted">{readingExif ? 'Reading EXIF and matching catalog…' : uploadHint(suggestion)}</div>
              <div className="mt-1 text-muted">
                Upload target: {GALLERY_UPLOAD_MAX_LONG_EDGE}px long edge, {formatBytes(GALLERY_UPLOAD_MAX_BYTES)} max
              </div>
              <div className="mt-2">
                <Button type="button" onClick={() => void extractExifFromFile()} disabled={!file || readingExif || uploading}>
                  <RotateCcw size={13} strokeWidth={1.5} />
                  Extract EXIF
                </Button>
              </div>
              {processedImage && (
                <div className="mt-1 text-muted">
                  Processed: {processedImage.width}×{processedImage.height}, {formatBytes(processedImage.processedBytes)}
                </div>
              )}
              {processing && (
                <div className="mt-2">
                  <div className="mb-1 flex justify-between gap-3 text-muted">
                    <span>{processing.label}</span>
                    <span>{processing.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-line">
                    <div className="h-full bg-fg transition-all" style={{ width: `${processing.percent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-6">
            <Field className="lg:col-span-2" label="Title" value={fields.title} onChange={(value) => setField('title', value)} required />
            <Field className="lg:col-span-2" label="Author" value={fields.author} onChange={(value) => setField('author', value)} />
            <SelectField
              className="lg:col-span-2"
              label="Status"
              value={fields.status}
              onChange={(value) => setField('status', value)}
              options={STATUS_ORDER}
            />
            <CatalogField
              className="lg:col-span-2"
              label="Camera"
              value={fields.camera}
              selectedId={fields.cameraCatalogId}
              options={cameraOptions}
              onTextChange={(value) => setFields((current) => ({ ...current, camera: value, cameraCatalogId: '' }))}
              onSelect={(option) => {
                const camera = cameras.find((item) => item.id === option.id);
                if (camera) selectCamera(camera);
              }}
            />
            <CatalogField
              className="lg:col-span-2"
              label={selectedCamera ? `Lens (${lensOptions.length} compatible)` : 'Lens'}
              value={fields.lens}
              selectedId={fields.lensCatalogId}
              options={lensOptions}
              onTextChange={(value) => setFields((current) => ({ ...current, lens: value, lensCatalogId: '' }))}
              onSelect={(option) => {
                const lens = lenses.find((item) => item.id === option.id);
                if (lens) selectLens(lens);
              }}
            />
            <FormatField className="lg:col-span-1" value={fields.formatId} onChange={(value) => setField('formatId', value)} />
            <Field
              className="lg:col-span-1"
              label="Focal length"
              value={fields.focal}
              onChange={(value) => {
                setFocalFromExif(false);
                setField('focal', value);
              }}
              marker={focalFromExif ? 'EXIF' : undefined}
            />
            <Field className="lg:col-span-1" label="Aperture" value={fields.aperture} onChange={(value) => setField('aperture', value)} />
            <ReadOnlyField className="lg:col-span-2" label="Camera ID" value={fields.cameraCatalogId} />
            <ReadOnlyField className="lg:col-span-2" label="Lens ID" value={fields.lensCatalogId} />
            <div className="lg:col-span-4">
              <span className="label mb-1 block">Tags</span>
              <TagPicker tags={activeTags} value={fields.tags} onChange={setTagsField} onCreateTag={onCreateTag} />
            </div>

            <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
              <Button variant="solid" disabled={uploading || !!processing || readingExif || !file || !fields.title}>
                <Send size={14} strokeWidth={1.5} />
                {processing ? 'Processing' : 'Send to Cloudflare'}
              </Button>
              <Button type="button" onClick={resetUpload} disabled={uploading && !file}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </form>

      {editing && (
        <form onSubmit={saveEdit} className="border border-line bg-faint p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label mb-1">Edit gallery record</div>
              <div className="text-sm font-bold tracking-tight">{editing.fields.title || editing.id}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="solid" disabled={busyId === editing.id || !editing.fields.title}>
                <Save size={14} strokeWidth={1.5} />
                Save record
              </Button>
              <Button type="button" onClick={() => setEditing(null)} disabled={busyId === editing.id}>
                Cancel
              </Button>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-6">
            <Field className="lg:col-span-2" label="Title" value={editing.fields.title} onChange={(value) => setEditField('title', value)} required />
            <Field className="lg:col-span-2" label="Author" value={editing.fields.author} onChange={(value) => setEditField('author', value)} />
            <SelectField
              className="lg:col-span-2"
              label="Status"
              value={editing.fields.status}
              onChange={(value) => setEditField('status', value)}
              options={STATUS_ORDER}
            />
            <EditCatalogFields
              cameras={cameras}
              lenses={lenses}
              fields={editing.fields}
              setFields={(next) => setEditing((current) => current ? { ...current, fields: next } : current)}
            />
            <FormatField className="lg:col-span-1" value={editing.fields.formatId} onChange={(value) => setEditField('formatId', value)} />
            <Field className="lg:col-span-1" label="Focal length" value={editing.fields.focal} onChange={(value) => setEditField('focal', value)} />
            <Field className="lg:col-span-1" label="Aperture" value={editing.fields.aperture} onChange={(value) => setEditField('aperture', value)} />
            <ReadOnlyField className="lg:col-span-2" label="Camera ID" value={editing.fields.cameraCatalogId} />
            <ReadOnlyField className="lg:col-span-2" label="Lens ID" value={editing.fields.lensCatalogId} />
            <div className="lg:col-span-4">
              <span className="label mb-1 block">Tags</span>
              <TagPicker
                tags={activeTags}
                value={editing.fields.tags}
                onChange={(value) => setEditField('tags', value)}
                onCreateTag={onCreateTag}
              />
            </div>
            <Field className="lg:col-span-6" label="Notes" value={editing.fields.notes} onChange={(value) => setEditField('notes', value)} />
          </div>
        </form>
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
                <Td>{photo.status}</Td>
                <Td>{photo.formatId}</Td>
                <Td>{photo.camera}</Td>
                <Td>{photo.lens}</Td>
                <Td>{photo.tags.join(', ')}</Td>
                <Td>{photo.updatedAt ? new Date(photo.updatedAt).toLocaleString() : 'Unknown'}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {photo.status === 'approved' ? (
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
    const imageSrc = photo.status === 'approved' ? `/api/gallery/photos/${photo.id}/image` : photo.src;
    const headers = new Headers({ accept: photo.contentType ?? 'image/*' });
    if (photo.status !== 'approved' && accessToken) headers.set('authorization', `Bearer ${accessToken}`);

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
  }, [accessToken, photo.contentType, photo.id, photo.src, photo.status]);

  if (!src) return <div className="flex h-14 w-20 items-center justify-center border border-line bg-faint"><Upload size={14} strokeWidth={1.5} /></div>;
  return <img src={src} alt="" className="h-14 w-20 border border-line object-cover grayscale" />;
}

function suggestedTags(suggestion: GalleryMetadataSuggestion, availableTags: GalleryTag[]): string[] {
  const tags = new Set<string>();
  const available = new Set(availableTags.map((tag) => tag.label));
  if (suggestion.cameraConfidence !== 'none' && available.has('catalog')) tags.add('catalog');
  if (suggestion.source.exif.guessedFormat && available.has('check format')) tags.add('check format');
  return [...tags];
}

function fieldsFromPhoto(photo: AdminGalleryPhoto): UploadFields {
  return {
    title: photo.title,
    author: photo.author ?? '',
    camera: photo.camera,
    cameraCatalogId: photo.cameraCatalogId ?? '',
    lens: photo.lens,
    lensCatalogId: photo.lensCatalogId ?? '',
    formatId: normalizedFormatId(photo.formatId),
    focal: String(photo.focal),
    aperture: String(photo.aperture),
    tags: photo.tags,
    status: photo.status,
    notes: photo.notes ?? '',
  };
}

function numberOrFallback(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function normalizedFormatId(value: string): string {
  return FORMATS.some((format) => format.id === value) ? value : 'ff';
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function uploadHint(suggestion: GalleryMetadataSuggestion | null): string {
  if (!suggestion) return 'EXIF and catalog matches appear here after selection.';
  return `Camera ${suggestion.cameraConfidence}; lens ${suggestion.lensConfidence}`;
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  marker,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  marker?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 flex items-center gap-2">
        {label}
        {marker && <span className="inline-flex border border-line px-1.5 py-0.5 text-[10px] text-muted">{marker}</span>}
      </span>
      <input
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
      />
    </label>
  );
}

function ReadOnlyField({ label, value, className = '' }: { label: string; value?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      <input
        readOnly
        value={value || 'No catalog match'}
        className="w-full cursor-not-allowed border border-line bg-faint px-2 py-1.5 text-xs text-muted outline-none"
      />
    </label>
  );
}

function CatalogField({
  label,
  value,
  selectedId,
  options,
  onTextChange,
  onSelect,
  className = '',
}: {
  label: string;
  value: string;
  selectedId: string;
  options: FreeTextOption[];
  onTextChange: (value: string) => void;
  onSelect: (option: FreeTextOption) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      <FreeTextComboBox
        options={options}
        value={value}
        selectedId={selectedId}
        onTextChange={onTextChange}
        onSelect={onSelect}
        searchPlaceholder="Search catalog or type free text…"
      />
    </label>
  );
}

function EditCatalogFields({
  cameras,
  lenses,
  fields,
  setFields,
}: {
  cameras: Camera[];
  lenses: CatalogLens[];
  fields: UploadFields;
  setFields: (fields: UploadFields) => void;
}) {
  const camera = cameras.find((item) => item.id === fields.cameraCatalogId);
  const cameraOptions = cameras.map((item) => ({ id: item.id, label: item.name, maker: item.maker, detail: item.formatId }));
  const availableLenses = camera ? lensesForCamera(camera, lenses) : lenses;
  const lensOptions = availableLenses.map((lens) => ({
    id: lens.id,
    label: lens.name,
    maker: lens.maker,
    detail: lens.type === 'zoom' ? `${lens.focalMin}-${lens.focalMax}mm` : `${lens.focalMin}mm`,
  }));

  return (
    <>
      <CatalogField
        className="lg:col-span-2"
        label="Camera"
        value={fields.camera}
        selectedId={fields.cameraCatalogId}
        options={cameraOptions}
        onTextChange={(value) => setFields({ ...fields, camera: value, cameraCatalogId: '' })}
        onSelect={(option) => {
          const nextCamera = cameras.find((item) => item.id === option.id);
          if (!nextCamera) return;
          const compatible = fields.lensCatalogId
            ? lensesForCamera(nextCamera, lenses).some((lens) => lens.id === fields.lensCatalogId)
            : true;
          setFields({
            ...fields,
            camera: nextCamera.name,
            cameraCatalogId: nextCamera.id,
            formatId: cameraFormat(nextCamera).id,
            lens: compatible ? fields.lens : '',
            lensCatalogId: compatible ? fields.lensCatalogId : '',
          });
        }}
      />
      <CatalogField
        className="lg:col-span-2"
        label={camera ? `Lens (${lensOptions.length} compatible)` : 'Lens'}
        value={fields.lens}
        selectedId={fields.lensCatalogId}
        options={lensOptions}
        onTextChange={(value) => setFields({ ...fields, lens: value, lensCatalogId: '' })}
        onSelect={(option) => {
          const lens = lenses.find((item) => item.id === option.id);
          if (!lens) return;
          const focal = defaultFocal(lens);
          setFields({
            ...fields,
            lens: lens.name,
            lensCatalogId: lens.id,
            focal: formatNumber(focal),
            aperture: fields.aperture || formatNumber(maxApertureAtFocal(lens, focal)),
          });
        }}
      />
    </>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: GalleryStatus) => void;
  options: GalleryStatus[];
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as GalleryStatus)}
        className="w-full border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormatField({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const normalized = FORMATS.some((format) => format.id === value) ? value : 'ff';

  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">Format</span>
      <select
        value={normalized}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
      >
        {FORMATS.map((format) => (
          <option key={format.id} value={format.id}>
            {format.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-normal uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}
