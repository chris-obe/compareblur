import { useMemo, useState } from 'react';
import { Copy, ExternalLink, X } from 'lucide-react';
import type { EmbedTemplate } from '../../lib/galleryApi';
import {
  albumEmbedUrl,
  iframeSnippet,
  photoEmbedUrl,
  selectionEmbedUrl,
  type EmbedLayout,
  type EmbedMode,
} from '../../lib/embedSnippet';
import { Button } from '../ui/Button';

type DialogMode = 'photo' | 'selection' | 'album';

interface Props {
  mode: DialogMode;
  template: EmbedTemplate;
  onClose: () => void;
  /** photo mode */
  photo?: { id: string; title: string };
  /** photo + album mode */
  albumSlug?: string;
  albumTitle?: string;
  /** selection mode */
  photoIds?: string[];
}

const TITLES: Record<DialogMode, string> = {
  photo: 'Embed this photo',
  selection: 'Embed selected photos',
  album: 'Embed this album',
};

// One iframe-builder surface for all three album-owner entry points. Live-updates
// the snippet as layout/count change, reusing the shared embedSnippet helpers.
export function EmbedCodeDialog({ mode, template, onClose, photo, albumSlug, albumTitle, photoIds = [] }: Props) {
  const imageTemplate = template.image;
  const galleryTemplate = template.gallery;
  const [layout, setLayout] = useState<EmbedLayout>(galleryTemplate.albumLayout);
  const [count, setCount] = useState(galleryTemplate.albumCount);
  const [copied, setCopied] = useState(false);

  const { src, snippet } = useMemo(() => {
    const frames = mode === 'photo' ? 1 : mode === 'selection' ? photoIds.length : count;
    const snippetMode: EmbedMode = mode === 'photo' ? 'single' : layout;
    let url = '';
    if (mode === 'photo' && photo) url = photoEmbedUrl(photo.id, albumSlug);
    else if (mode === 'selection') url = selectionEmbedUrl(photoIds, { layout, albumSlug });
    else if (mode === 'album' && albumSlug) url = albumEmbedUrl(albumSlug, { count, layout });
    const title = photo?.title ?? albumTitle ?? 'gallery';
    return {
      src: url,
      snippet: url
        ? iframeSnippet(url, title, {
            maxLongEdge: mode === 'photo' ? imageTemplate.maxLongEdge : galleryTemplate.maxLongEdge,
            mode: snippetMode,
            count: frames,
            columns: galleryTemplate.albumColumns,
          })
        : '',
    };
  }, [mode, layout, count, photo, albumSlug, albumTitle, photoIds, imageTemplate.maxLongEdge, galleryTemplate.maxLongEdge, galleryTemplate.albumColumns]);

  const copy = async () => {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const showLayout = mode !== 'photo';
  const showCount = mode === 'album';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg space-y-4 border border-line bg-bg p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="label">Blog embed</div>
            <h3 className="text-base font-bold tracking-tight">{TITLES[mode]}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center border border-line hover:border-line-strong"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {mode === 'selection' && (
          <div className="text-xs text-muted">
            {photoIds.length} photo{photoIds.length === 1 ? '' : 's'} in this iframe.
          </div>
        )}

        {(showLayout || showCount) && (
          <div className="flex flex-wrap items-end gap-4">
            {showLayout && (
              <div>
                <span className="label mb-2 block">Layout</span>
                <div className="flex border border-line">
                  {(['grid', 'carousel'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setLayout(option)}
                      className={[
                        'px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
                        layout === option ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
                      ].join(' ')}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {showCount && (
              <label className="block">
                <span className="label mb-2 block">Frames</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={count}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setCount(Number.isFinite(next) ? Math.max(1, Math.min(24, Math.round(next))) : galleryTemplate.albumCount);
                  }}
                  className="h-9 w-24 border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
                />
              </label>
            )}
          </div>
        )}

        <textarea
          readOnly
          value={snippet}
          rows={5}
          className="w-full resize-none border border-line bg-faint p-3 font-mono text-xs outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="solid" onClick={copy} disabled={!snippet}>
            <Copy size={14} strokeWidth={1.5} />
            {copied ? 'Copied' : 'Copy iframe'}
          </Button>
          {src && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-line px-3 py-1.5 text-xs uppercase tracking-wide hover:border-line-strong"
            >
              Preview <ExternalLink size={13} strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
