import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  ExternalLink,
  GripVertical,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { adminTokenParams } from '../../auth/config';
import {
  DEFAULT_EMBED_TEMPLATE,
  EMBED_FIELD_OPTIONS,
  EMBED_METADATA_LIMIT,
  EMBED_SIZE_PRESETS,
  MAX_EMBED_LONG_EDGE,
  MIN_EMBED_LONG_EDGE,
} from '../../lib/embedTemplate';
import { GALLERY_FORMAT_OPTIONS, formatOptionLabel } from '../../lib/galleryFormat';
import {
  getAdminEmbedSettings,
  listAdminGalleryAlbums,
  listAdminGalleryPhotos,
  updateAdminEmbedSettings,
  type AdminGalleryPhoto,
  type EmbedFieldId,
  type EmbedTemplate,
  type GalleryAlbum,
} from '../../lib/galleryApi';
import { PhotoEmbedCard } from '../embed/PhotoEmbedCard';
import { Button } from '../ui/Button';

export function BlogEmbedManager() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [template, setTemplate] = useState<EmbedTemplate>(DEFAULT_EMBED_TEMPLATE);
  const [photos, setPhotos] = useState<AdminGalleryPhoto[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [previewPhotoId, setPreviewPhotoId] = useState('');
  const [previewAlbumSlug, setPreviewAlbumSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragFieldId, setDragFieldId] = useState<EmbedFieldId | null>(null);
  const [dragSource, setDragSource] = useState<'visible' | 'hidden' | null>(null);

  const getToken = async () =>
    isAuthenticated ? getAccessTokenSilently({ authorizationParams: adminTokenParams }) : undefined;

  const approvedPhotos = useMemo(() => photos.filter((photo) => photo.status === 'approved'), [photos]);
  const publishedAlbums = useMemo(() => albums.filter((album) => album.status === 'published'), [albums]);
  const previewPhoto = approvedPhotos.find((photo) => photo.id === previewPhotoId) ?? approvedPhotos[0] ?? null;
  const previewAlbum = publishedAlbums.find((album) => album.slug === previewAlbumSlug) ?? null;
  const previewPhotoForCard = previewPhoto ? { ...previewPhoto, src: `/api/gallery/photos/${previewPhoto.id}/image` } : null;
  const embedUrl = previewPhoto ? embedUrlFor(previewPhoto.id, previewAlbum?.slug) : '';
  const iframeCode = previewPhoto ? iframeSnippet(embedUrl, previewPhoto.title, template.maxLongEdge) : '';
  const visibleFieldSet = new Set(template.visibleFields);
  const hiddenFields = EMBED_FIELD_OPTIONS.filter((field) => !visibleFieldSet.has(field.id));

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
      const published = nextAlbums.filter((album) => album.status === 'published');
      setTemplate(nextTemplate);
      setPhotos(nextPhotos);
      setAlbums(nextAlbums);
      setPreviewPhotoId((current) => current || approved[0]?.id || '');
      setPreviewAlbumSlug((current) => current && published.some((album) => album.slug === current) ? current : '');
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

  const copyIframe = async () => {
    if (!iframeCode) return;
    await navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const updateTemplate = <K extends keyof EmbedTemplate>(key: K, value: EmbedTemplate[K]) => {
    setTemplate((current) => ({ ...current, [key]: value }));
  };

  const moveFieldToVisible = (fieldId: EmbedFieldId, index?: number) => {
    setTemplate((current) => {
      if (current.visibleFields.includes(fieldId)) return current;
      if (current.visibleFields.length >= EMBED_METADATA_LIMIT) return current;
      const next = [...current.visibleFields];
      const insertionIndex = index == null ? next.length : Math.max(0, Math.min(index, next.length));
      next.splice(insertionIndex, 0, fieldId);
      return { ...current, visibleFields: next };
    });
  };

  const moveFieldWithinVisible = (fieldId: EmbedFieldId, index: number) => {
    setTemplate((current) => {
      const currentIndex = current.visibleFields.indexOf(fieldId);
      if (currentIndex === -1) return current;
      const next = [...current.visibleFields];
      next.splice(currentIndex, 1);
      const insertionIndex = Math.max(0, Math.min(index, next.length));
      next.splice(insertionIndex, 0, fieldId);
      return { ...current, visibleFields: next };
    });
  };

  const hideField = (fieldId: EmbedFieldId) => {
    setTemplate((current) => ({
      ...current,
      visibleFields: current.visibleFields.filter((field) => field !== fieldId),
    }));
  };

  const handleFieldDragStart = (fieldId: EmbedFieldId, source: 'visible' | 'hidden') => {
    setDragFieldId(fieldId);
    setDragSource(source);
  };

  const clearDrag = () => {
    setDragFieldId(null);
    setDragSource(null);
  };

  const handleDropOnVisible = (index?: number) => {
    if (!dragFieldId || !dragSource) return;
    if (dragSource === 'visible') moveFieldWithinVisible(dragFieldId, index ?? template.visibleFields.length);
    if (dragSource === 'hidden') moveFieldToVisible(dragFieldId, index);
    clearDrag();
  };

  const handleDropOnHidden = () => {
    if (!dragFieldId) return;
    hideField(dragFieldId);
    clearDrag();
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="label mb-2">Blog embeds</div>
          <h3 className="text-xl font-bold tracking-tight">Embed template</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={load} disabled={loading || saving}>
            <RefreshCw size={14} strokeWidth={1.5} />
            Reload
          </Button>
          <Button variant="solid" onClick={saveTemplate} disabled={saving}>
            <Save size={14} strokeWidth={1.5} />
            Save template
          </Button>
        </div>
      </div>

      {error && <div className="border border-line bg-faint p-3 text-xs">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="xl:sticky xl:top-6 xl:self-start">
          <Panel title="Preview">
            {previewPhotoForCard ? (
              <div className="space-y-3">
                <div className="text-xs text-muted">
                  Live preview of the saved public embed. Metadata cards are capped at {EMBED_METADATA_LIMIT} visible items.
                </div>
                <div className="overflow-hidden border border-line bg-faint">
                  <PhotoEmbedCard
                    photo={previewPhotoForCard}
                    template={template}
                    album={previewAlbum}
                    linkHref={previewAlbum ? `/g/${previewAlbum.slug}/photo/${previewPhotoForCard.id}` : `/gallery/photo/${previewPhotoForCard.id}`}
                    preview
                  />
                </div>
              </div>
            ) : (
              <div className="border border-line px-4 py-8 text-center text-xs text-muted">No approved photos available.</div>
            )}
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Customization">
            <div className="space-y-4">
              <label className="block">
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

              <label className="block">
                <span className="label mb-2 block">Album context</span>
                <select
                  value={previewAlbumSlug}
                  onChange={(event) => setPreviewAlbumSlug(event.target.value)}
                  className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
                >
                  <option value="">None</option>
                  {publishedAlbums.map((album) => (
                    <option key={album.slug} value={album.slug}>{album.title}</option>
                  ))}
                </select>
              </label>

              <div>
                <span className="label mb-2 block">Metadata placement</span>
                <div className="grid grid-cols-3 gap-2">
                  <PlacementButton
                    active={template.metadataPlacement === 'left'}
                    icon={<ArrowLeft size={14} strokeWidth={1.5} />}
                    label="Left"
                    onClick={() => updateTemplate('metadataPlacement', 'left')}
                  />
                  <PlacementButton
                    active={template.metadataPlacement === 'bottom'}
                    icon={<ArrowDown size={14} strokeWidth={1.5} />}
                    label="Bottom"
                    onClick={() => updateTemplate('metadataPlacement', 'bottom')}
                  />
                  <PlacementButton
                    active={template.metadataPlacement === 'right'}
                    icon={<ArrowRight size={14} strokeWidth={1.5} />}
                    label="Right"
                    onClick={() => updateTemplate('metadataPlacement', 'right')}
                  />
                </div>
              </div>

              <ToggleRow
                label="Metadata cards"
                active={template.showMetadata}
                onToggle={() => updateTemplate('showMetadata', !template.showMetadata)}
              />
              <ToggleRow
                label="Equivalent note"
                active={template.showEquivalent}
                onToggle={() => updateTemplate('showEquivalent', !template.showEquivalent)}
              />

              <Select
                label="Theme"
                value={template.theme}
                options={['light', 'dark', 'system']}
                onChange={(value) => updateTemplate('theme', value as EmbedTemplate['theme'])}
              />
              <Select
                label="Density"
                value={template.density}
                options={['compact', 'comfortable']}
                onChange={(value) => updateTemplate('density', value as EmbedTemplate['density'])}
              />
              <Select
                label="Frame"
                value={template.frameStyle}
                options={['minimal', 'technical', 'editorial']}
                onChange={(value) => updateTemplate('frameStyle', value as EmbedTemplate['frameStyle'])}
              />
              <Select
                label="Image fit"
                value={template.imageFit}
                options={['cover', 'contain']}
                onChange={(value) => updateTemplate('imageFit', value as EmbedTemplate['imageFit'])}
              />

              <EmbedSizeField
                value={template.maxLongEdge}
                onChange={(value) => updateTemplate('maxLongEdge', value)}
              />

              <label className="block">
                <span className="label mb-2 block">Equivalent target</span>
                <select
                  value={template.defaultTargetFormatId}
                  onChange={(event) => updateTemplate('defaultTargetFormatId', event.target.value)}
                  className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
                >
                  {GALLERY_FORMAT_OPTIONS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {formatOptionLabel(format)}
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
          </Panel>

          <Panel title="Shot metadata">
            <div className="space-y-3">
              <div className="text-xs text-muted">
                Drag between visible and hidden. Visible cards are capped at {EMBED_METADATA_LIMIT}.
              </div>

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDropOnVisible()}
                className="space-y-2 border border-line p-3"
              >
                <div className="label">Visible cards</div>
                {template.visibleFields.map((fieldId, index) => {
                  const field = EMBED_FIELD_OPTIONS.find((item) => item.id === fieldId);
                  if (!field) return null;
                  return (
                    <FieldChip
                      key={field.id}
                      field={field}
                      kind="visible"
                      onDragStart={() => handleFieldDragStart(field.id, 'visible')}
                      onDragEnd={clearDrag}
                      onDrop={() => handleDropOnVisible(index)}
                      onRemove={() => hideField(field.id)}
                    />
                  );
                })}
                {template.visibleFields.length === 0 && (
                  <div className="border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
                    Drop fields here.
                  </div>
                )}
              </div>

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDropOnHidden}
                className="space-y-2 border border-line p-3"
              >
                <div className="label">Hidden fields</div>
                <div className="space-y-2">
                  {hiddenFields.map((field) => (
                    <FieldChip
                      key={field.id}
                      field={field}
                      kind="hidden"
                      disabled={template.visibleFields.length >= EMBED_METADATA_LIMIT}
                      onDragStart={() => handleFieldDragStart(field.id, 'hidden')}
                      onDragEnd={clearDrag}
                      onDrop={() => undefined}
                      onAdd={() => moveFieldToVisible(field.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Embed code">
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

function EmbedSizeField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const normalized = clampEmbedLongEdge(value);
  const matchingPreset = EMBED_SIZE_PRESETS.find((preset) => preset.value === normalized);

  return (
    <label className="block">
      <span className="label mb-2 block">Embed footprint</span>
      <div className="grid grid-cols-[minmax(0,1fr)_9.5rem] border border-line focus-within:border-line-strong">
        <div className="flex min-w-0 items-center">
          <input
            type="number"
            min={MIN_EMBED_LONG_EDGE}
            max={MAX_EMBED_LONG_EDGE}
            step={20}
            value={normalized}
            onChange={(event) => onChange(clampEmbedLongEdge(event.target.value))}
            className="h-9 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
            aria-label="Maximum embed long edge in pixels"
          />
          <span className="pr-2 text-[10px] uppercase tracking-wide text-muted">px</span>
        </div>
        <select
          value={matchingPreset?.value ?? ''}
          onChange={(event) => {
            if (event.target.value) onChange(clampEmbedLongEdge(event.target.value));
          }}
          className="h-9 border-l border-line bg-transparent px-2 text-xs outline-none"
          aria-label="Embed size preset"
        >
          <option value="">Custom</option>
          {EMBED_SIZE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">
        Max long edge. Common blog/forum sizes are available as presets.
      </div>
    </label>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'flex w-full items-center justify-between border px-2.5 py-2 text-left text-xs uppercase tracking-wide',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong',
      ].join(' ')}
    >
      <span>{label}</span>
      <span>{active ? 'On' : 'Off'}</span>
    </button>
  );
}

function PlacementButton({
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
      aria-label={label}
      className={[
        'flex items-center justify-center gap-2 border px-3 py-2 text-xs uppercase tracking-wide',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong',
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FieldChip({
  field,
  kind,
  disabled,
  onDragStart,
  onDragEnd,
  onDrop,
  onAdd,
  onRemove,
}: {
  field: { id: EmbedFieldId; label: string };
  kind: 'visible' | 'hidden';
  disabled?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        onDrop();
      }}
      className={[
        'flex items-center justify-between gap-3 border px-3 py-2 text-xs uppercase tracking-wide',
        disabled ? 'border-line/50 text-muted/60' : 'border-line text-muted hover:border-line-strong hover:text-fg',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-2">
        <GripVertical size={14} strokeWidth={1.5} />
        <span className="truncate">{field.label}</span>
      </div>
      {kind === 'visible' && onRemove && (
        <button type="button" onClick={onRemove} className="border border-line px-2 py-1 text-[10px] hover:border-line-strong">
          Hide
        </button>
      )}
      {kind === 'hidden' && onAdd && (
        <button type="button" onClick={onAdd} disabled={disabled} className="border border-line px-2 py-1 text-[10px] hover:border-line-strong disabled:opacity-40">
          Add
        </button>
      )}
    </div>
  );
}

function embedUrlFor(photoId: string, albumSlug?: string): string {
  const origin = window.location.origin;
  const params = new URLSearchParams();
  if (albumSlug) params.set('album', albumSlug);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${origin}/embed/photo/${encodeURIComponent(photoId)}${suffix}`;
}

function iframeSnippet(src: string, title: string, maxLongEdge: number): string {
  const size = clampEmbedLongEdge(maxLongEdge);
  return `<iframe src="${src}" title="blur photo: ${escapeAttribute(title)}" loading="lazy" style="width:100%;max-width:${size}px;height:${size}px;max-height:${size}px;border:0;display:block;"></iframe>`;
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, '&quot;');
}

function clampEmbedLongEdge(value: number | string | undefined): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_EMBED_TEMPLATE.maxLongEdge;
  return Math.max(MIN_EMBED_LONG_EDGE, Math.min(MAX_EMBED_LONG_EDGE, Math.round(number)));
}
