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
  EMBED_FRAME_COLOR_OPTIONS,
  EMBED_METADATA_LIMIT,
  EMBED_SIZE_PRESETS,
  MAX_EMBED_LONG_EDGE,
  MIN_EMBED_LONG_EDGE,
  templateForMode,
  updateTemplateMode,
} from '../../lib/embedTemplate';
import { albumEmbedUrl, clampEmbedLongEdge, iframeSnippet, photoEmbedUrl } from '../../lib/embedSnippet';
import { GALLERY_FORMAT_OPTIONS, formatOptionLabel } from '../../lib/galleryFormat';
import {
  getAdminEmbedSettings,
  listAdminGalleryAlbums,
  listAdminGalleryPhotos,
  updateAdminEmbedSettings,
  type AdminGalleryPhoto,
  type EmbedFieldId,
  type EmbedGalleryModeTemplate,
  type EmbedModeTemplate,
  type EmbedTemplate,
  type GalleryAlbum,
} from '../../lib/galleryApi';
import { EmbedGalleryCard } from '../embed/EmbedGalleryCard';
import { PhotoEmbedCard } from '../embed/PhotoEmbedCard';
import { Button } from '../ui/Button';

export function BlogEmbedManager() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [template, setTemplate] = useState<EmbedTemplate>(DEFAULT_EMBED_TEMPLATE);
  const [mode, setMode] = useState<'image' | 'gallery'>('image');
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

  const approvedPhotos = useMemo(() => photos.filter((photo) => photo.galleryStatus === 'approved'), [photos]);
  const publishedAlbums = useMemo(
    () => albums.filter((album) => album.status === 'published' && !album.hasPassword),
    [albums],
  );
  const previewPhoto = approvedPhotos.find((photo) => photo.id === previewPhotoId) ?? approvedPhotos[0] ?? null;
  const previewAlbum = publishedAlbums.find((album) => album.slug === previewAlbumSlug) ?? null;
  const modeTemplate = templateForMode(template, mode);
  const imageTemplate = templateForMode(template, 'image');
  const galleryTemplate = templateForMode(template, 'gallery');
  const previewPhotoForCard = previewPhoto ? { ...previewPhoto, src: `/api/gallery/photos/${previewPhoto.id}/image` } : null;
  const previewAlbumPhotos = useMemo(() => {
    const source = previewAlbum?.photos.length
      ? previewAlbum.photos
      : approvedPhotos.map((photo) => ({ ...photo, src: `/api/gallery/photos/${photo.id}/image` }));
    return source
      .slice(0, galleryTemplate.albumCount)
      .map((photo) => ({ ...photo }));
  }, [approvedPhotos, galleryTemplate.albumCount, previewAlbum]);
  const embedUrl = previewPhoto ? photoEmbedUrl(previewPhoto.id, previewAlbum?.slug) : '';
  const galleryEmbedUrl = previewAlbum
    ? albumEmbedUrl(previewAlbum.slug, { count: galleryTemplate.albumCount, layout: galleryTemplate.albumLayout })
    : '';
  const iframeCode = mode === 'image' && previewPhoto
    ? iframeSnippet(embedUrl, previewPhoto.title, { maxLongEdge: imageTemplate.maxLongEdge })
    : mode === 'gallery' && previewAlbum
      ? iframeSnippet(galleryEmbedUrl, previewAlbum.title, {
          maxLongEdge: galleryTemplate.maxLongEdge,
          mode: galleryTemplate.albumLayout,
          count: galleryTemplate.albumCount,
          columns: galleryTemplate.albumColumns,
        })
      : '';
  const visibleFieldSet = new Set(modeTemplate.visibleFields);
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
      const approved = nextPhotos.filter((photo) => photo.galleryStatus === 'approved');
      const published = nextAlbums.filter((album) => album.status === 'published' && !album.hasPassword);
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

  const saveMode = async (targetMode: 'image' | 'gallery') => {
    setMode(targetMode);
    await saveTemplate();
  };

  const copyIframe = async () => {
    if (!iframeCode) return;
    await navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const updateImageTemplate = <K extends keyof EmbedModeTemplate>(key: K, value: EmbedModeTemplate[K]) => {
    setTemplate((current) => updateTemplateMode(current, 'image', { [key]: value } as Partial<EmbedModeTemplate>));
  };

  const updateGalleryTemplate = <K extends keyof EmbedGalleryModeTemplate>(
    key: K,
    value: EmbedGalleryModeTemplate[K],
  ) => {
    setTemplate((current) => updateTemplateMode(current, 'gallery', { [key]: value } as Partial<EmbedGalleryModeTemplate>));
  };

  const updateModeTemplate = <K extends keyof EmbedGalleryModeTemplate>(key: K, value: EmbedGalleryModeTemplate[K]) => {
    if (mode === 'image') {
      updateImageTemplate(key as keyof EmbedModeTemplate, value as EmbedModeTemplate[keyof EmbedModeTemplate]);
      return;
    }
    updateGalleryTemplate(key, value);
  };

  const moveFieldToVisible = (fieldId: EmbedFieldId, index?: number) => {
    setTemplate((current) => {
      const currentMode = templateForMode(current, mode);
      if (currentMode.visibleFields.includes(fieldId)) return current;
      if (currentMode.visibleFields.length >= EMBED_METADATA_LIMIT) return current;
      const next = [...currentMode.visibleFields];
      const insertionIndex = index == null ? next.length : Math.max(0, Math.min(index, next.length));
      next.splice(insertionIndex, 0, fieldId);
      return mode === 'image'
        ? updateTemplateMode(current, 'image', { visibleFields: next })
        : updateTemplateMode(current, 'gallery', { visibleFields: next });
    });
  };

  const moveFieldWithinVisible = (fieldId: EmbedFieldId, index: number) => {
    setTemplate((current) => {
      const currentMode = templateForMode(current, mode);
      const currentIndex = currentMode.visibleFields.indexOf(fieldId);
      if (currentIndex === -1) return current;
      const next = [...currentMode.visibleFields];
      next.splice(currentIndex, 1);
      const insertionIndex = Math.max(0, Math.min(index, next.length));
      next.splice(insertionIndex, 0, fieldId);
      return mode === 'image'
        ? updateTemplateMode(current, 'image', { visibleFields: next })
        : updateTemplateMode(current, 'gallery', { visibleFields: next });
    });
  };

  const hideField = (fieldId: EmbedFieldId) => {
    setTemplate((current) => {
      const currentMode = templateForMode(current, mode);
      const visibleFields = currentMode.visibleFields.filter((field) => field !== fieldId);
      return mode === 'image'
        ? updateTemplateMode(current, 'image', { visibleFields })
        : updateTemplateMode(current, 'gallery', { visibleFields });
    });
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
    if (dragSource === 'visible') moveFieldWithinVisible(dragFieldId, index ?? modeTemplate.visibleFields.length);
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
            Save all
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
                  Live preview of the {mode === 'image' ? 'image' : 'multi-image'} embed mode.
                </div>
                <div className="overflow-hidden border border-line bg-faint">
                  {mode === 'image' ? (
                    <PhotoEmbedCard
                      photo={previewPhotoForCard}
                      template={imageTemplate}
                      album={previewAlbum}
                      linkHref={previewAlbum ? `/g/${previewAlbum.slug}/photo/${previewPhotoForCard.id}` : `/gallery/photo/${previewPhotoForCard.id}`}
                      preview
                    />
                  ) : (
                    <EmbedGalleryCard
                      photos={previewAlbumPhotos}
                      template={galleryTemplate}
                      layout={galleryTemplate.albumLayout}
                      columns={galleryTemplate.albumColumns}
                      album={previewAlbum}
                      linkHrefFor={(photo) => previewAlbum
                        ? `/g/${previewAlbum.slug}/photo/${photo.id}`
                        : `/gallery/photo/${photo.id}`}
                      openHref={previewAlbum ? `/g/${previewAlbum.slug}` : previewAlbumPhotos[0] ? `/gallery/photo/${previewAlbumPhotos[0].id}` : '/'}
                      preview
                    />
                  )}
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
              <div className="grid grid-cols-2 gap-2">
                <ModeButton active={mode === 'image'} label="Image" onClick={() => setMode('image')} />
                <ModeButton active={mode === 'gallery'} label="Multi image" onClick={() => setMode('gallery')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => saveMode('image')} disabled={saving}>
                  <Save size={14} strokeWidth={1.5} />
                  Save image
                </Button>
                <Button onClick={() => saveMode('gallery')} disabled={saving}>
                  <Save size={14} strokeWidth={1.5} />
                  Save multi
                </Button>
              </div>

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
                <span className="label mb-2 block">{mode === 'image' ? 'Metadata placement' : 'Open button placement'}</span>
                <div className="grid grid-cols-3 gap-2">
                  <PlacementButton
                    active={mode === 'image' ? imageTemplate.metadataPlacement === 'left' : galleryTemplate.openButtonPlacement === 'metadata'}
                    icon={<ArrowLeft size={14} strokeWidth={1.5} />}
                    label={mode === 'image' ? 'Left' : 'Header'}
                    onClick={() => mode === 'image' ? updateImageTemplate('metadataPlacement', 'left') : updateGalleryTemplate('openButtonPlacement', 'metadata')}
                  />
                  <PlacementButton
                    active={mode === 'image' ? imageTemplate.metadataPlacement === 'bottom' : galleryTemplate.openButtonPlacement === 'below'}
                    icon={<ArrowDown size={14} strokeWidth={1.5} />}
                    label="Bottom"
                    onClick={() => mode === 'image' ? updateImageTemplate('metadataPlacement', 'bottom') : updateGalleryTemplate('openButtonPlacement', 'below')}
                  />
                  <PlacementButton
                    active={mode === 'image' ? imageTemplate.metadataPlacement === 'right' : galleryTemplate.openButtonPlacement === 'top-right'}
                    icon={<ArrowRight size={14} strokeWidth={1.5} />}
                    label={mode === 'image' ? 'Right' : 'Top'}
                    onClick={() => mode === 'image' ? updateImageTemplate('metadataPlacement', 'right') : updateGalleryTemplate('openButtonPlacement', 'top-right')}
                  />
                </div>
              </div>

              <ToggleRow
                label="Open in blur button"
                active={modeTemplate.showOpenButton}
                onToggle={() => updateModeTemplate('showOpenButton', !modeTemplate.showOpenButton)}
              />
              {mode === 'image' && (
                <div>
                  <span className="label mb-2 block">Open button placement</span>
                  <div className="grid grid-cols-3 gap-2">
                    <PlacementButton
                      active={imageTemplate.openButtonPlacement === 'metadata'}
                      icon={<ArrowLeft size={14} strokeWidth={1.5} />}
                      label="Metadata"
                      onClick={() => updateImageTemplate('openButtonPlacement', 'metadata')}
                    />
                    <PlacementButton
                      active={imageTemplate.openButtonPlacement === 'below'}
                      icon={<ArrowDown size={14} strokeWidth={1.5} />}
                      label="Bottom"
                      onClick={() => updateImageTemplate('openButtonPlacement', 'below')}
                    />
                    <PlacementButton
                      active={imageTemplate.openButtonPlacement === 'top-right'}
                      icon={<ArrowRight size={14} strokeWidth={1.5} />}
                      label="Top"
                      onClick={() => updateImageTemplate('openButtonPlacement', 'top-right')}
                    />
                  </div>
                </div>
              )}
              <ToggleRow
                label={mode === 'image' ? 'Metadata cards' : 'Per-image metadata'}
                active={modeTemplate.showMetadata}
                onToggle={() => updateModeTemplate('showMetadata', !modeTemplate.showMetadata)}
              />
              {mode === 'image' && (
                <ToggleRow
                  label="Equivalent note"
                  active={imageTemplate.showEquivalent}
                  onToggle={() => updateImageTemplate('showEquivalent', !imageTemplate.showEquivalent)}
                />
              )}
              {mode === 'gallery' && (
                <>
                  <ToggleRow
                    label="Album header"
                    active={galleryTemplate.showAlbumHeader}
                    onToggle={() => updateGalleryTemplate('showAlbumHeader', !galleryTemplate.showAlbumHeader)}
                  />
                  <ToggleRow
                    label="Carousel arrows"
                    active={galleryTemplate.showCarouselControls}
                    onToggle={() => updateGalleryTemplate('showCarouselControls', !galleryTemplate.showCarouselControls)}
                  />
                </>
              )}

              <Select
                label="Theme"
                value={modeTemplate.theme}
                options={['light', 'dark', 'system']}
                onChange={(value) => updateModeTemplate('theme', value as EmbedModeTemplate['theme'])}
              />
              <Select
                label="Density"
                value={modeTemplate.density}
                options={['compact', 'comfortable']}
                onChange={(value) => updateModeTemplate('density', value as EmbedModeTemplate['density'])}
              />
              <Select
                label="Frame"
                value={modeTemplate.frameStyle}
                options={['minimal', 'technical', 'editorial']}
                onChange={(value) => updateModeTemplate('frameStyle', value as EmbedModeTemplate['frameStyle'])}
              />
              <Select
                label="Image fit"
                value={modeTemplate.imageFit}
                options={['cover', 'contain']}
                onChange={(value) => updateModeTemplate('imageFit', value as EmbedModeTemplate['imageFit'])}
              />
              <Select
                label="Image position"
                value={modeTemplate.imagePosition}
                options={['auto', 'center', 'top', 'bottom']}
                onChange={(value) => updateModeTemplate('imagePosition', value as EmbedModeTemplate['imagePosition'])}
              />

              <div className="space-y-3 border border-line p-3">
                <div>
                  <div className="label mb-1">Frame options</div>
                  <div className="text-xs text-muted">The frame shrinks the image area and applies to square crops too.</div>
                </div>
                <ToggleRow
                  label="Make images square"
                  active={modeTemplate.squareImages}
                  onToggle={() => updateModeTemplate('squareImages', !modeTemplate.squareImages)}
                />
                <FrameWidthField
                  value={modeTemplate.frameWidth}
                  maxLongEdge={modeTemplate.maxLongEdge}
                  onChange={(value) => updateModeTemplate('frameWidth', value)}
                />
                <FrameColorField
                  value={modeTemplate.frameColor}
                  onChange={(value) => updateModeTemplate('frameColor', value)}
                />
              </div>

              <EmbedSizeField
                value={modeTemplate.maxLongEdge}
                onChange={(value) => updateModeTemplate('maxLongEdge', value)}
              />

              {mode === 'gallery' && <div className="space-y-3 border border-line p-3">
                <div>
                  <div className="label mb-1">Albums</div>
                  <div className="text-xs text-muted">
                    Defaults for album and selected-set iframes.
                  </div>
                </div>
                <Select
                  label="Multi-image layout"
                  value={galleryTemplate.albumLayout}
                  options={['grid', 'carousel']}
                  onChange={(value) => updateGalleryTemplate('albumLayout', value as EmbedGalleryModeTemplate['albumLayout'])}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="Frames"
                    value={galleryTemplate.albumCount}
                    min={1}
                    max={24}
                    onChange={(value) => updateGalleryTemplate('albumCount', value)}
                  />
                  <NumberField
                    label="Grid columns"
                    value={galleryTemplate.albumColumns}
                    min={2}
                    max={4}
                    disabled={galleryTemplate.albumLayout !== 'grid'}
                    onChange={(value) => updateGalleryTemplate('albumColumns', value)}
                  />
                </div>
              </div>}

              <label className="block">
                <span className="label mb-2 block">Equivalent target</span>
                <select
                  value={modeTemplate.defaultTargetFormatId}
                  onChange={(event) => updateModeTemplate('defaultTargetFormatId', event.target.value)}
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
                  value={modeTemplate.ctaLabel}
                  onChange={(event) => updateModeTemplate('ctaLabel', event.target.value)}
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
                {modeTemplate.visibleFields.map((fieldId, index) => {
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
                {modeTemplate.visibleFields.length === 0 && (
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
                      disabled={modeTemplate.visibleFields.length >= EMBED_METADATA_LIMIT}
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

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'border px-3 py-2 text-xs uppercase tracking-wide transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
      ].join(' ')}
    >
      {label}
    </button>
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

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(clampInteger(event.target.value, min, max, value))}
        className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong disabled:opacity-40"
      />
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

function FrameWidthField({
  value,
  maxLongEdge,
  onChange,
}: {
  value: number;
  maxLongEdge: number;
  onChange: (value: number) => void;
}) {
  const adaptiveMax = Math.max(4, Math.min(40, Math.round(clampEmbedLongEdge(maxLongEdge) / 64)));
  const normalized = clampInteger(value, 0, 40, 10);
  return (
    <label className="block">
      <span className="label mb-2 block">Frame width</span>
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3">
        <input
          type="range"
          min={0}
          max={40}
          value={normalized}
          onChange={(event) => onChange(clampInteger(event.target.value, 0, 40, 10))}
          className="w-full accent-current"
        />
        <span className="border border-line px-2 py-1 text-center text-xs tabular-nums">{normalized}px</span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">
        Rendered frame caps near {adaptiveMax}px at this embed size.
      </div>
    </label>
  );
}

function FrameColorField({
  value,
  onChange,
}: {
  value: EmbedModeTemplate['frameColor'];
  onChange: (value: EmbedModeTemplate['frameColor']) => void;
}) {
  return (
    <div>
      <span className="label mb-2 block">Frame colour</span>
      <div className="grid grid-cols-3 gap-2">
        {EMBED_FRAME_COLOR_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              'flex items-center gap-2 border px-2 py-2 text-left text-[10px] uppercase tracking-wide',
              value === option.id ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
            ].join(' ')}
          >
            <span
              className="h-4 w-4 shrink-0 border border-line"
              style={{ background: option.value }}
              aria-hidden="true"
            />
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function clampInteger(value: number | string, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
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
