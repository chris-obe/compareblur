import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  Check,
  Code2,
  EllipsisVertical,
  Eye,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  Settings2,
  Square,
  Upload,
} from 'lucide-react';
import { categoryForFormat, formatLabel, type CategoryId } from '../../lib/categories';
import type { GalleryItem, ViewEntry } from '../../lib/types';
import { resolveGalleryFormat } from '../../lib/galleryFormat';
import type { GalleryAlbumPhotoVisibility, GalleryAlbumStatus } from '../../lib/galleryApi';
import { ReactionBar } from '../ui/ReactionBar';
import { Button } from '../ui/Button';
import { PhotoLightbox } from '../lightbox/PhotoLightbox';
import { LightboxInfo } from './LightboxInfo';
import { FormatFilter } from './FormatFilter';
import { TagSearch } from './TagSearch';

export interface GallerySurfaceItem extends GalleryItem {
  visibility?: GalleryAlbumPhotoVisibility;
}

export interface GallerySelectionConfig {
  selectedIds: Set<string>;
  anchorId: string | null;
  onChange: (ids: Set<string>, anchorId: string | null) => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  selectedSecondaryCount?: number;
  selectedEmbeddableCount?: number;
  embedReady?: boolean;
  embedSelectedLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onEmbedSelected?: () => void;
}

export interface GalleryOwnerControls {
  visibility?: {
    value: GalleryAlbumStatus;
    busy?: boolean;
    onChange: (value: GalleryAlbumStatus) => void;
  };
  mode?: {
    value: 'view' | 'edit';
    onView: () => void;
    onEdit: () => void;
  };
  canEmbedAlbum?: boolean;
  embedAlbumTitle?: string;
  embedAlbumDisabledReason?: string;
  onEmbedAlbum?: () => void;
  onReload?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}

interface Props<T extends GallerySurfaceItem> {
  items: T[];
  title?: string;
  description?: string;
  ownerName?: string;
  protectedLabel?: string;
  enableFilters?: boolean;
  enableReactions?: boolean;
  uploadSlot?: ReactNode;
  selection?: GallerySelectionConfig;
  ownerControls?: GalleryOwnerControls;
  activePhotoId?: string | null;
  initialPhotoId?: string;
  emptyMessage?: string;
  renderImage?: (item: T, className: string) => ReactNode;
  renderInfo?: (item: T, context: { entry: ViewEntry; index: number; count: number; close: () => void }) => ReactNode;
  onOpenPhoto?: (item: T) => void;
  onClosePhoto?: () => void;
}

interface View<T extends GallerySurfaceItem> {
  list: Array<ViewEntry & { item: T }>;
  index: number;
}

function toEntry<T extends GallerySurfaceItem>(item: T): ViewEntry & { item: T } {
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
    item,
  };
}

export function GallerySurface<T extends GallerySurfaceItem>({
  items,
  title,
  description,
  ownerName,
  protectedLabel,
  enableFilters = true,
  enableReactions = true,
  uploadSlot,
  selection,
  ownerControls,
  activePhotoId,
  initialPhotoId,
  emptyMessage = 'No images match these filters.',
  renderImage,
  renderInfo,
  onOpenPhoto,
  onClosePhoto,
}: Props<T>) {
  const [formats, setFormats] = useState<Set<CategoryId>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [view, setView] = useState<View<T> | null>(null);
  const openedInitialId = useRef<string | null>(null);
  const anchors = useRef(new Map<string, HTMLElement>());

  const registerAnchor = useCallback((id: string, el: HTMLElement | null) => {
    if (el) anchors.current.set(id, el);
    else anchors.current.delete(id);
  }, []);
  const getAnchorRect = useCallback((id: string) => anchors.current.get(id)?.getBoundingClientRect() ?? null, []);

  const filtered = useMemo(() => {
    if (!enableFilters) return items;
    return items.filter((item) => {
      if (formats.size > 0) {
        const cat = categoryForFormat(item.formatId);
        if (!cat || !formats.has(cat)) return false;
      }
      if (tags.length > 0 && !tags.every((tag) => item.tags.includes(tag))) return false;
      return true;
    });
  }, [enableFilters, formats, items, tags]);

  const allTags = useMemo(() => [...new Set(items.flatMap((item) => item.tags))].sort(), [items]);
  const visibleIds = useMemo(() => filtered.map((item) => item.id), [filtered]);
  const selectedCount = selection?.selectedIds.size ?? 0;
  const allSelected = !!selection && visibleIds.length > 0 && visibleIds.every((id) => selection.selectedIds.has(id));
  const current = view ? view.list[view.index] : null;
  const currentActiveId = activePhotoId ?? (current?.morph ? current.id : null);

  useEffect(() => {
    openedInitialId.current = null;
  }, [initialPhotoId]);

  useEffect(() => {
    if (!initialPhotoId || openedInitialId.current === initialPhotoId || filtered.length === 0) return;
    const index = filtered.findIndex((item) => item.id === initialPhotoId);
    if (index < 0) return;
    openedInitialId.current = initialPhotoId;
    setView({ list: filtered.map(toEntry), index });
  }, [filtered, initialPhotoId]);

  const toggleFormat = (id: CategoryId) =>
    setFormats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addTag = (tag: string) => setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  const removeTag = (tag: string) => setTags((prev) => prev.filter((item) => item !== tag));

  const setAllVisible = () => {
    if (!selection) return;
    selection.onChange(allSelected ? new Set() : new Set(visibleIds), allSelected ? null : visibleIds[0] ?? null);
  };

  const toggleSelection = (id: string, shiftKey: boolean) => {
    if (!selection) return;
    const checked = !selection.selectedIds.has(id);
    selection.onChange(
      updateSelectionRange(selection.selectedIds, visibleIds, id, checked, shiftKey, selection.anchorId),
      shiftKey && selection.anchorId ? selection.anchorId : id,
    );
  };

  const openPhoto = (item: T, shiftKey = false) => {
    if (selection && shiftKey) {
      toggleSelection(item.id, true);
      return;
    }
    onOpenPhoto?.(item);
    const index = filtered.findIndex((entry) => entry.id === item.id);
    setView({ list: filtered.map(toEntry), index: Math.max(0, index) });
  };

  const closeView = () => {
    setView(null);
    onClosePhoto?.();
  };

  return (
    <div className="flex min-h-0 flex-col">
      {(title || description || ownerName) && (
        <div className="border-b border-line px-6 py-5">
          <div className="label mb-2">{protectedLabel ?? 'Gallery'}</div>
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
          {ownerName && <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted">Shared by {ownerName}</p>}
        </div>
      )}

      <GallerySurfaceToolbar
        enableFilters={enableFilters}
        formats={formats}
        toggleFormat={toggleFormat}
        tags={tags}
        allTags={allTags}
        addTag={addTag}
        removeTag={removeTag}
        resultCount={filtered.length}
        allSelected={allSelected}
        selectedCount={selectedCount}
        selection={selection}
        ownerControls={ownerControls}
        onSelectAll={setAllVisible}
      />

      {uploadSlot}

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center px-6 py-20">
          <div className="border border-line px-8 py-10 text-center text-xs text-muted">{emptyMessage}</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <GallerySurfaceCard
              key={item.id}
              item={item}
              hidden={currentActiveId === item.id}
              selected={selection?.selectedIds.has(item.id) ?? false}
              selectable={!!selection}
              enableReactions={enableReactions}
              registerAnchor={registerAnchor}
              renderImage={renderImage}
              onOpen={(event) => openPhoto(item, event.shiftKey)}
              onSelect={(event) => toggleSelection(item.id, event.shiftKey)}
            />
          ))}
        </div>
      )}

      {view && (
        <PhotoLightbox
          entries={view.list}
          index={view.index}
          onIndex={(index) => setView((currentView) => (currentView ? { ...currentView, index } : currentView))}
          onClose={closeView}
          getAnchorRect={getAnchorRect}
          renderImage={renderImage ? (entry, className) => renderImage(entry.item, className) : undefined}
          renderInfo={(entry, context) => renderInfo
            ? renderInfo(entry.item, { entry, ...context })
            : <LightboxInfo entry={entry} enableReactions={enableReactions} />}
        />
      )}
    </div>
  );
}

function GallerySurfaceToolbar({
  enableFilters,
  formats,
  toggleFormat,
  tags,
  allTags,
  addTag,
  removeTag,
  resultCount,
  allSelected,
  selectedCount,
  selection,
  ownerControls,
  onSelectAll,
}: {
  enableFilters: boolean;
  formats: Set<CategoryId>;
  toggleFormat: (id: CategoryId) => void;
  tags: string[];
  allTags: string[];
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  resultCount: number;
  allSelected: boolean;
  selectedCount: number;
  selection?: GallerySelectionConfig;
  ownerControls?: GalleryOwnerControls;
  onSelectAll: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {enableFilters ? <FormatFilter selected={formats} onToggle={toggleFormat} /> : <span className="label">Images</span>}
          <div className="flex flex-wrap items-center gap-2">
            {ownerControls?.visibility && (
              <GalleryVisibilityDropdown
                value={ownerControls.visibility.value}
                busy={ownerControls.visibility.busy}
                onChange={ownerControls.visibility.onChange}
              />
            )}
            {ownerControls?.mode && (
              <div className="flex border border-line">
                <IconButton label="View album" active={ownerControls.mode.value === 'view'} onClick={ownerControls.mode.onView}>
                  <Eye size={14} strokeWidth={1.5} />
                </IconButton>
                <IconButton label="Album settings" active={ownerControls.mode.value === 'edit'} onClick={ownerControls.mode.onEdit}>
                  <Settings2 size={14} strokeWidth={1.5} />
                </IconButton>
              </div>
            )}
            {ownerControls?.onEmbedAlbum && (
              <Button
                onClick={ownerControls.onEmbedAlbum}
                disabled={!ownerControls.canEmbedAlbum}
                title={ownerControls.canEmbedAlbum ? ownerControls.embedAlbumTitle ?? 'Copy album iframe code' : ownerControls.embedAlbumDisabledReason}
              >
                <Code2 size={14} strokeWidth={1.5} />
                Embed album
              </Button>
            )}
            <span className="label">{resultCount} images</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {enableFilters ? <TagSearch tags={tags} allTags={allTags} onAdd={addTag} onRemove={removeTag} /> : <span />}
          <div className="flex flex-wrap items-center gap-1.5">
            {selection && (
              <TextButton active={allSelected} onClick={onSelectAll} label={allSelected ? 'Clear selection' : 'Select all'}>
                {allSelected ? <Check size={13} strokeWidth={1.7} /> : <Square size={13} strokeWidth={1.6} />}
                Select all
              </TextButton>
            )}
            {ownerControls?.onReload && (
              <IconButton label="Reload" onClick={ownerControls.onReload}>
                <RefreshCw size={14} strokeWidth={1.5} />
              </IconButton>
            )}
            {ownerControls?.onAdd && (
              <IconButton label={ownerControls.addLabel ?? 'Add'} onClick={ownerControls.onAdd}>
                {ownerControls.addLabel?.toLowerCase().includes('upload')
                  ? <Upload size={14} strokeWidth={1.5} />
                  : <Plus size={14} strokeWidth={1.5} />}
              </IconButton>
            )}
            {selection?.onEmbedSelected && (
              <IconButton
                label={selection.embedSelectedLabel ?? 'Embed selected'}
                onClick={selection.onEmbedSelected}
                disabled={!selection.embedReady || (selection.selectedEmbeddableCount ?? 0) === 0}
                active={(selection.selectedEmbeddableCount ?? 0) > 0}
              >
                <Code2 size={14} strokeWidth={1.5} />
              </IconButton>
            )}
            {selection && (
              <SelectionActionMenu
                selectedCount={selectedCount}
                selectedSecondaryCount={selection.selectedSecondaryCount ?? 0}
                primaryActionLabel={selection.primaryActionLabel}
                secondaryActionLabel={selection.secondaryActionLabel}
                onPrimaryAction={selection.onPrimaryAction}
                onSecondaryAction={selection.onSecondaryAction}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GallerySurfaceCard<T extends GallerySurfaceItem>({
  item,
  hidden,
  selected,
  selectable,
  enableReactions,
  registerAnchor,
  renderImage,
  onOpen,
  onSelect,
}: {
  item: T;
  hidden?: boolean;
  selected: boolean;
  selectable: boolean;
  enableReactions: boolean;
  registerAnchor: (id: string, el: HTMLElement | null) => void;
  renderImage?: (item: T, className: string) => ReactNode;
  onOpen: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSelect: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="group relative flex flex-col border border-line transition-colors hover:border-line-strong">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div
          ref={(el) => registerAnchor(item.id, el)}
          className="aspect-square w-full overflow-hidden bg-faint"
          style={{ opacity: hidden ? 0 : 1 }}
        >
          {renderImage ? (
            renderImage(item, 'h-full w-full object-cover grayscale transition-[filter,transform] duration-300 group-hover:grayscale-0 group-hover:scale-[1.02]')
          ) : (
            <img
              src={item.src}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover grayscale transition-[filter,transform] duration-300 group-hover:grayscale-0 group-hover:scale-[1.02]"
            />
          )}
        </div>
      </button>

      {selectable && (
        <button
          type="button"
          aria-label={`Select ${item.title}`}
          title={`Select ${item.title}`}
          onClick={onSelect}
          className={[
            'absolute left-2 top-2 z-10 inline-flex h-8 min-w-8 items-center justify-center border px-2 text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity',
            selected ? 'border-fg bg-fg text-bg' : 'border-line bg-surface/90 text-fg opacity-0 hover:border-line-strong group-hover:opacity-100 group-focus-within:opacity-100',
          ].join(' ')}
        >
          {selected ? <Check size={12} strokeWidth={1.9} /> : <Square size={12} strokeWidth={1.6} />}
        </button>
      )}

      {enableReactions && (
        <div className="absolute right-2 top-2 z-10">
          <ReactionBar photoId={item.id} mode="compact" />
        </div>
      )}

      {item.visibility === 'hidden' && (
        <div className="absolute bottom-[4.7rem] right-2 z-10 border border-line bg-surface/90 px-1.5 py-1 text-[10px] uppercase tracking-wide">
          Hidden
        </div>
      )}

      <button type="button" onClick={onOpen} className="flex flex-col gap-1 border-t border-line px-3 py-2 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-bold">{item.title}</span>
          <span className="label shrink-0">f/{item.aperture}</span>
        </div>
        <div className="label truncate">
          {item.camera} · {item.focal}mm
        </div>
        <div className="label truncate opacity-70">{formatLabel(item.formatId)}</div>
      </button>
    </div>
  );
}

function GalleryVisibilityDropdown({
  value,
  busy,
  onChange,
}: {
  value: GalleryAlbumStatus;
  busy?: boolean;
  onChange: (value: GalleryAlbumStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={busy}
        className="inline-flex h-9 items-center gap-2 border border-line px-3 text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-line-strong disabled:opacity-40"
      >
        {value === 'published' ? <Globe size={13} strokeWidth={1.6} /> : <Lock size={13} strokeWidth={1.6} />}
        {value === 'published' ? 'Public' : 'Private'}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.45rem)] z-40 flex min-w-44 flex-col border border-line bg-surface p-1 shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
          <MenuButton onClick={() => { setOpen(false); onChange('draft'); }} label="Private" icon={<Lock size={13} strokeWidth={1.5} />} />
          <MenuButton onClick={() => { setOpen(false); onChange('published'); }} label="Public" icon={<Globe size={13} strokeWidth={1.5} />} />
        </div>
      )}
    </div>
  );
}

function SelectionActionMenu({
  selectedCount,
  selectedSecondaryCount,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
}: {
  selectedCount: number;
  selectedSecondaryCount: number;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  if (!primaryActionLabel && !secondaryActionLabel) return null;

  return (
    <div ref={ref} className="relative">
      <IconButton label="Selection actions" onClick={() => setOpen((current) => !current)} active={open} disabled={selectedCount === 0}>
        <EllipsisVertical size={14} strokeWidth={1.5} />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.45rem)] z-40 flex min-w-52 flex-col border border-line bg-surface p-1 shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
          {primaryActionLabel && (
            <MenuButton
              label={primaryActionLabel}
              disabled={selectedCount === 0}
              icon={<Eye size={13} strokeWidth={1.5} />}
              onClick={() => {
                setOpen(false);
                onPrimaryAction?.();
              }}
            />
          )}
          {secondaryActionLabel && (
            <MenuButton
              label={secondaryActionLabel}
              disabled={selectedCount === 0 || selectedSecondaryCount === 0}
              icon={<Lock size={13} strokeWidth={1.5} />}
              onClick={() => {
                setOpen(false);
                onSecondaryAction?.();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
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
        'group relative flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-line-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'bg-fg text-bg hover:text-bg' : 'bg-transparent',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function TextButton({
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

function MenuButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between gap-3 px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-fg transition-colors hover:bg-faint disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{label}</span>
      {icon}
    </button>
  );
}

function updateSelectionRange(
  current: Set<string>,
  orderedIds: string[],
  id: string,
  checked: boolean,
  shiftKey: boolean,
  anchorId: string | null,
) {
  const next = new Set(current);
  if (!shiftKey || !anchorId) {
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  }

  const anchorIndex = orderedIds.indexOf(anchorId);
  const targetIndex = orderedIds.indexOf(id);
  if (anchorIndex < 0 || targetIndex < 0) {
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  }

  const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  for (let index = start; index <= end; index += 1) {
    const entry = orderedIds[index];
    if (!entry) continue;
    if (checked) next.add(entry);
    else next.delete(entry);
  }
  return next;
}
