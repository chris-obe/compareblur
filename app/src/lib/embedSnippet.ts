// Shared embed snippet/URL builders. Used by the admin embed manager and the
// album owner UI (per-image, selected-set, and album auto-select embeds).
import {
  DEFAULT_EMBED_MAX_LONG_EDGE,
  MIN_EMBED_LONG_EDGE,
  MAX_EMBED_LONG_EDGE,
} from './embedTemplate';

export type EmbedLayout = 'grid' | 'carousel';
export type EmbedMode = 'single' | EmbedLayout;

/** Hard cap on photos packed into a single multi-image iframe (URL length + sanity). */
export const EMBED_SELECTION_LIMIT = 24;

export function clampEmbedLongEdge(value: number | string | undefined): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_EMBED_MAX_LONG_EDGE;
  return Math.max(MIN_EMBED_LONG_EDGE, Math.min(MAX_EMBED_LONG_EDGE, Math.round(number)));
}

export function escapeAttribute(value: string): string {
  return value.replace(/"/g, '&quot;');
}

function origin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** Single-photo embed, optionally scoped to an album for the "open in blur" link. */
export function photoEmbedUrl(photoId: string, albumSlug?: string | null): string {
  const params = new URLSearchParams();
  if (albumSlug) params.set('album', albumSlug);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${origin()}/embed/photo/${encodeURIComponent(photoId)}${suffix}`;
}

/** Album auto-select embed: the first `count` approved photos of a published album. */
export function albumEmbedUrl(slug: string, opts: { count?: number; layout?: EmbedLayout } = {}): string {
  const params = new URLSearchParams();
  if (opts.count) params.set('count', String(Math.max(1, Math.min(EMBED_SELECTION_LIMIT, Math.round(opts.count)))));
  if (opts.layout) params.set('layout', opts.layout);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${origin()}/embed/album/${encodeURIComponent(slug)}${suffix}`;
}

/** Selected-set embed: the exact photo ids chosen via multi-select (ephemeral, capped). */
export function selectionEmbedUrl(ids: string[], opts: { layout?: EmbedLayout } = {}): string {
  const capped = ids.slice(0, EMBED_SELECTION_LIMIT);
  const params = new URLSearchParams();
  params.set('ids', capped.join(','));
  if (opts.layout) params.set('layout', opts.layout);
  return `${origin()}/embed/photos?${params.toString()}`;
}

interface SnippetOptions {
  maxLongEdge: number;
  mode?: EmbedMode;
  /** number of frames (grid height estimate) */
  count?: number;
  /** grid columns (grid height estimate) */
  columns?: number;
}

// Iframes can't auto-grow to their content, so we compute a fixed height. Single
// and carousel embeds are a single square-ish frame (today's behaviour). Grid
// embeds estimate height from rows × per-row height at the max footprint width.
function snippetHeight(size: number, { mode = 'single', count = 1, columns = 3 }: SnippetOptions): number {
  if (mode !== 'grid') return size;
  const cols = Math.max(2, Math.min(4, Math.round(columns)));
  const rows = Math.max(1, Math.ceil(Math.max(1, count) / cols));
  // per-frame ≈ a near-square image plus its metadata plaque, scaled to column width.
  const perRow = (size / cols) * 1.35;
  return Math.round(rows * perRow + 64);
}

export function iframeSnippet(src: string, title: string, options: SnippetOptions): string {
  const size = clampEmbedLongEdge(options.maxLongEdge);
  const height = snippetHeight(size, options);
  return `<iframe src="${src}" title="blur photo: ${escapeAttribute(title)}" loading="lazy" style="width:100%;max-width:${size}px;height:${height}px;max-height:${height}px;border:0;display:block;"></iframe>`;
}
