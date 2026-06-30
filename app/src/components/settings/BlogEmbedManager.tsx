import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { ArrowDown, ArrowUp, Copy, ExternalLink, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { adminTokenParams } from '../../auth/config';
import { FORMATS } from '../../lib/engine';
import { DEFAULT_EMBED_TEMPLATE, EMBED_FIELD_OPTIONS } from '../../lib/embedTemplate';
import {
  createAdminGalleryAlbum,
  deleteAdminGalleryAlbum,
  getAdminEmbedSettings,
  listAdminGalleryAlbums,
  listAdminGalleryPhotos,
  updateAdminEmbedSettings,
  updateAdminGalleryAlbum,
  type AdminGalleryPhoto,
  type EmbedFieldId,
  type EmbedTemplate,
  type GalleryAlbum,
  type GalleryAlbumStatus,
} from '../../lib/galleryApi';
import { PhotoEmbedCard } from '../embed/PhotoEmbedCard';
import { Button } from '../ui/Button';

interface AlbumDraft {
  slug: string;
  title: string;
  description: string;
  status: GalleryAlbumStatus;
  coverPhotoId: string;
  photoIds: string[];
}

const EMPTY_ALBUM: AlbumDraft = {
  slug: '',
  title: '',
  description: '',
  status: 'draft',
  coverPhotoId: '',
  photoIds: [],
};

export function BlogEmbedManager() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [template, setTemplate] = useState<EmbedTemplate>(DEFAULT_EMBED_TEMPLATE);
  const [photos, setPhotos] = useState<AdminGalleryPhoto[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [albumDraft, setAlbumDraft] = useState<AlbumDraft>(EMPTY_ALBUM);
  const [selectedAlbumSlug, setSelectedAlbumSlug] = useState('');
  const [previewPhotoId, setPreviewPhotoId] = useState('');
  const [addPhotoId, setAddPhotoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getToken = async () =>
    isAuthenticated ? getAccessTokenSilently({ authorizationParams: adminTokenParams }) : undefined;

  const approvedPhotos = useMemo(() => photos.filter((photo) => photo.status === 'approved'), [photos]);
  const previewPhoto = approvedPhotos.find((photo) => photo.id === previewPhotoId) ?? approvedPhotos[0];
  const selectedAlbum = albums.find((album) => album.slug === selectedAlbumSlug) ?? null;
  const previewAlbum = selectedAlbum && albumDraft.photoIds.includes(previewPhoto?.id ?? '') ? selectedAlbum : null;
  const embedUrl = previewPhoto ? embedUrlFor(previewPhoto.id, previewAlbum?.slug) : '';
  const iframeCode = previewPhoto ? iframeSnippet(embedUrl, previewPhoto.title) : '';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [nextTemplate, nextPhotos, nextAlbums] = await Promise.all([
        getAdminEmbedSettings(token),
        listAdminGalleryPhotos(token),
        listAdminGalleryAlbums(token),
      ]);
      const approved = nextPhotos.filter((photo) => photo.status === 'approved');
      setTemplate(nextTemplate);
      setPhotos(nextPhotos);
      setAlbums(nextAlbums);
      setPreviewPhotoId((current) => current || approved[0]?.id || '');
      if (nextAlbums[0] && !selectedAlbumSlug) selectAlbum(nextAlbums[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Embed settings failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const selectAlbum = (album: GalleryAlbum | null) => {
    if (!album) {
      setSelectedAlbumSlug('');
      setAlbumDraft(EMPTY_ALBUM);
      return;
    }
    setSelectedAlbumSlug(album.slug);
    setAlbumDraft({
      slug: album.slug,
      title: album.title,
      description: album.description,
      status: album.status,
      coverPhotoId: album.coverPhotoId ?? '',
      photoIds: album.photos.map((photo) => photo.id),
    });
  };

  const saveTemplate = async () => {
    setSaving(true);
    setError(null);
    try {
      setTemplate(await updateAdminEmbedSettings(template, await getToken()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Embed template could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const saveAlbum = async () => {
    if (!albumDraft.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const payload = {
        slug: albumDraft.slug,
        title: albumDraft.title,
        description: albumDraft.description,
        status: albumDraft.status,
        coverPhotoId: albumDraft.coverPhotoId || null,
        photoIds: albumDraft.photoIds,
      };
      const album = selectedAlbumSlug
        ? await updateAdminGalleryAlbum(selectedAlbumSlug, payload, token)
        : await createAdminGalleryAlbum(payload, token);
      const nextAlbums = await listAdminGalleryAlbums(token);
      setAlbums(nextAlbums);
      selectAlbum(album);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Album could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const removeAlbum = async () => {
    if (!selectedAlbumSlug) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      await deleteAdminGalleryAlbum(selectedAlbumSlug, token);
      const nextAlbums = await listAdminGalleryAlbums(token);
      setAlbums(nextAlbums);
      selectAlbum(nextAlbums[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Album could not be deleted');
    } finally {
      setSaving(false);
    }
  };

  const copyIframe = async () => {
    if (!iframeCode) return;
    await navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const updateTemplate = <K extends keyof EmbedTemplate>(key: K, value: EmbedTemplate[K]) => {
    setTemplate((current) => ({ ...current, [key]: value }));
  };

  const toggleField = (field: EmbedFieldId) => {
    setTemplate((current) => {
      const visible = new Set(current.visibleFields);
      if (visible.has(field)) visible.delete(field);
      else visible.add(field);
      return { ...current, visibleFields: EMBED_FIELD_OPTIONS.map((item) => item.id).filter((id) => visible.has(id)) };
    });
  };

  const addPhoto = () => {
    if (!addPhotoId || albumDraft.photoIds.includes(addPhotoId)) return;
    setAlbumDraft((current) => ({
      ...current,
      photoIds: [...current.photoIds, addPhotoId],
      coverPhotoId: current.coverPhotoId || addPhotoId,
    }));
    setAddPhotoId('');
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="label mb-2">Blog embeds</div>
          <h3 className="text-xl font-bold tracking-tight">Embed template and albums</h3>
        </div>
        <Button onClick={load} disabled={loading || saving}>
          <RefreshCw size={14} strokeWidth={1.5} />
          Reload
        </Button>
      </div>

      {error && <div className="border border-line bg-faint p-3 text-xs">{error}</div>}

      <div className="mx-auto max-w-4xl">
        <Panel title="Preview">
          <label className="mb-3 block">
            <span className="label mb-2 block">Preview photo</span>
            <select
              value={previewPhoto?.id ?? ''}
              onChange={(event) => setPreviewPhotoId(event.target.value)}
              className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
            >
              {approvedPhotos.map((photo) => (
                <option key={photo.id} value={photo.id}>{photo.title}</option>
              ))}
            </select>
          </label>
          {previewPhoto ? (
            <div className="overflow-hidden border border-line">
              <div className="max-h-[42rem] overflow-y-auto">
                <PhotoEmbedCard
                  photo={previewPhoto}
                  template={template}
                  album={previewAlbum}
                  linkHref={previewAlbum ? `/g/${previewAlbum.slug}/photo/${previewPhoto.id}` : `/gallery/photo/${previewPhoto.id}`}
                  preview
                />
              </div>
            </div>
          ) : (
            <div className="border border-line px-4 py-8 text-center text-xs text-muted">No approved photos available.</div>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-5">
          <Panel title="Iframe code">
            <textarea
              readOnly
              value={iframeCode}
              rows={5}
              className="w-full resize-none border border-line bg-faint p-3 font-mono text-xs outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={copyIframe} disabled={!iframeCode}>
                <Copy size={14} strokeWidth={1.5} />
                {copied ? 'Copied' : 'Copy iframe'}
              </Button>
              {embedUrl && (
                <a
                  href={embedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-line px-3 py-2 text-xs uppercase tracking-wide hover:border-line-strong"
                >
                  Open embed <ExternalLink size={13} strokeWidth={1.5} />
                </a>
              )}
            </div>
          </Panel>

          <Panel title="Albums">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button onClick={() => selectAlbum(null)}>
                <Plus size={14} strokeWidth={1.5} />
                New album
              </Button>
              {albums.map((album) => (
                <button
                  key={album.slug}
                  type="button"
                  onClick={() => selectAlbum(album)}
                  className={[
                    'border px-3 py-1.5 text-xs uppercase tracking-wide',
                    selectedAlbumSlug === album.slug ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong',
                  ].join(' ')}
                >
                  {album.title}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Title" value={albumDraft.title} onChange={(value) => setAlbumDraft((current) => ({ ...current, title: value }))} className="md:col-span-2" />
              <Field label="Slug" value={albumDraft.slug} onChange={(value) => setAlbumDraft((current) => ({ ...current, slug: value }))} />
              <Select label="Status" value={albumDraft.status} options={['draft', 'published']} onChange={(value) => setAlbumDraft((current) => ({ ...current, status: value as GalleryAlbumStatus }))} />
              <label className="block md:col-span-4">
                <span className="label mb-2 block">Description</span>
                <textarea
                  value={albumDraft.description}
                  onChange={(event) => setAlbumDraft((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="w-full resize-none border border-line bg-transparent px-2 py-2 text-xs outline-none focus:border-line-strong"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="label mb-2 block">Cover photo</span>
                <select
                  value={albumDraft.coverPhotoId}
                  onChange={(event) => setAlbumDraft((current) => ({ ...current, coverPhotoId: event.target.value }))}
                  className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
                >
                  <option value="">Auto</option>
                  {albumDraft.photoIds.map((id) => {
                    const photo = approvedPhotos.find((item) => item.id === id);
                    return photo ? <option key={id} value={id}>{photo.title}</option> : null;
                  })}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="label mb-2 block">Add approved photo</span>
                <div className="flex gap-2">
                  <select
                    value={addPhotoId}
                    onChange={(event) => setAddPhotoId(event.target.value)}
                    className="h-9 min-w-0 flex-1 border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
                  >
                    <option value="">Choose photo</option>
                    {approvedPhotos.filter((photo) => !albumDraft.photoIds.includes(photo.id)).map((photo) => (
                      <option key={photo.id} value={photo.id}>{photo.title}</option>
                    ))}
                  </select>
                  <Button onClick={addPhoto} disabled={!addPhotoId}>Add</Button>
                </div>
              </label>
            </div>

            <div className="mt-4 divide-y divide-line border border-line">
              {albumDraft.photoIds.map((id, index) => {
                const photo = approvedPhotos.find((item) => item.id === id);
                if (!photo) return null;
                return (
                  <div key={id} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-xs">
                    <img src={`/api/gallery/photos/${photo.id}/image`} alt="" className="h-10 w-10 border border-line object-cover grayscale" />
                    <div className="min-w-0">
                      <div className="truncate font-bold">{photo.title}</div>
                      <div className="truncate text-muted">{photo.camera} · {photo.lens}</div>
                    </div>
                    <div className="flex gap-1">
                      <IconButton label="Move up" disabled={index === 0} onClick={() => movePhoto(index, -1, setAlbumDraft)}><ArrowUp size={13} strokeWidth={1.5} /></IconButton>
                      <IconButton label="Move down" disabled={index === albumDraft.photoIds.length - 1} onClick={() => movePhoto(index, 1, setAlbumDraft)}><ArrowDown size={13} strokeWidth={1.5} /></IconButton>
                      <IconButton label="Remove" onClick={() => setAlbumDraft((current) => ({ ...current, photoIds: current.photoIds.filter((photoId) => photoId !== id) }))}><Trash2 size={13} strokeWidth={1.5} /></IconButton>
                    </div>
                  </div>
                );
              })}
              {albumDraft.photoIds.length === 0 && <div className="px-3 py-4 text-center text-xs text-muted">No photos in this album yet.</div>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="solid" onClick={saveAlbum} disabled={saving || !albumDraft.title.trim()}>
                <Save size={14} strokeWidth={1.5} />
                {selectedAlbumSlug ? 'Save album' : 'Create album'}
              </Button>
              {selectedAlbumSlug && (
                <>
                  <Button onClick={removeAlbum} disabled={saving}>
                    <Trash2 size={14} strokeWidth={1.5} />
                    Delete album
                  </Button>
                  <a
                    href={`/g/${encodeURIComponent(selectedAlbumSlug)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-line px-3 py-2 text-xs uppercase tracking-wide hover:border-line-strong"
                  >
                    Open album <ExternalLink size={13} strokeWidth={1.5} />
                  </a>
                </>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Template">
            <div className="space-y-3">
              <Select label="Theme" value={template.theme} options={['light', 'dark', 'system']} onChange={(value) => updateTemplate('theme', value as EmbedTemplate['theme'])} />
              <Select label="Density" value={template.density} options={['compact', 'comfortable']} onChange={(value) => updateTemplate('density', value as EmbedTemplate['density'])} />
              <Select label="Frame" value={template.frameStyle} options={['minimal', 'technical', 'editorial']} onChange={(value) => updateTemplate('frameStyle', value as EmbedTemplate['frameStyle'])} />
              <Select label="Image fit" value={template.imageFit} options={['cover', 'contain']} onChange={(value) => updateTemplate('imageFit', value as EmbedTemplate['imageFit'])} />
              <label className="block">
                <span className="label mb-2 block">Default equivalent</span>
                <select
                  value={template.defaultTargetFormatId}
                  onChange={(event) => updateTemplate('defaultTargetFormatId', event.target.value)}
                  className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
                >
                  {FORMATS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label mb-2 block">CTA label</span>
                <input
                  value={template.ctaLabel}
                  onChange={(event) => updateTemplate('ctaLabel', event.target.value)}
                  className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
                />
              </label>
            </div>
            <div className="mt-4">
              <Button variant="solid" onClick={saveTemplate} disabled={saving}>
                <Save size={14} strokeWidth={1.5} />
                Save template
              </Button>
            </div>
          </Panel>

          <Panel title="Visible metadata">
            <div className="space-y-2">
              {EMBED_FIELD_OPTIONS.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => toggleField(field.id)}
                  className={[
                    'flex w-full items-center justify-between border px-2.5 py-2 text-left text-xs uppercase tracking-wide',
                    template.visibleFields.includes(field.id) ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong',
                  ].join(' ')}
                >
                  <span>{field.label}</span>
                  <span>{template.visibleFields.includes(field.id) ? 'On' : 'Off'}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateTemplate('showEquivalent', !template.showEquivalent)}
                className={[
                  'flex w-full items-center justify-between border px-2.5 py-2 text-left text-xs uppercase tracking-wide',
                  template.showEquivalent ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong',
                ].join(' ')}
              >
                <span>Equivalent panel</span>
                <span>{template.showEquivalent ? 'On' : 'Off'}</span>
              </button>
            </div>
          </Panel>
        </aside>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-line p-4">
      <div className="label mb-3">{title}</div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-2 block">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
      />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center border border-line text-muted hover:border-line-strong hover:text-fg disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function movePhoto(index: number, delta: number, setAlbumDraft: Dispatch<SetStateAction<AlbumDraft>>) {
  setAlbumDraft((current) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= current.photoIds.length) return current;
    const next = [...current.photoIds];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    return { ...current, photoIds: next };
  });
}

function embedUrlFor(photoId: string, albumSlug?: string): string {
  const origin = window.location.origin;
  const params = new URLSearchParams();
  if (albumSlug) params.set('album', albumSlug);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${origin}/embed/photo/${encodeURIComponent(photoId)}${suffix}`;
}

function iframeSnippet(src: string, title: string): string {
  return `<iframe src="${src}" title="blur photo: ${escapeAttribute(title)}" loading="lazy" style="width:100%;min-height:640px;border:0;display:block;"></iframe>`;
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, '&quot;');
}
