import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { groupByMaker } from '../../lib/group';
import type { CatalogLens } from '../../lib/gear';

interface Props {
  lenses: CatalogLens[];
  ownedCatalogIds: Set<string>;
  value: Set<string>; // selected catalog ids
  onChange: (next: Set<string>) => void;
  placeholder?: string;
}

// Controlled multi-select dropdown: search + brand-grouped checkboxes. Owned
// lenses are shown checked + disabled.
export function LensMultiSelect({ lenses, ownedCatalogIds, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? lenses.filter((l) => `${l.maker} ${l.name}`.toLowerCase().includes(needle))
      : lenses;
    return groupByMaker(filtered);
  }, [lenses, q]);

  const toggle = (id: string) => {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const triggerText = value.size ? `${value.size} selected` : (placeholder ?? 'Select lenses');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border border-line bg-transparent px-2 py-1.5 text-xs outline-none hover:border-line-strong"
      >
        <span className={value.size ? '' : 'text-muted'}>{triggerText}</span>
        <ChevronDown size={14} strokeWidth={1.5} className="text-muted" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden border border-line bg-surface">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search lenses…"
              className="w-full border border-line bg-transparent px-2 py-1 text-xs outline-none focus:border-line-strong"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {groups.length === 0 && <div className="px-3 py-3 text-xs text-muted">No matches.</div>}
            {groups.map(([maker, ls]) => (
              <div key={maker}>
                <div className="label sticky top-0 bg-surface px-3 py-1.5">{maker}</div>
                {ls.map((l) => {
                  const owned = ownedCatalogIds.has(l.id);
                  const checked = owned || value.has(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={owned}
                      onClick={() => toggle(l.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-faint disabled:opacity-50"
                    >
                      <span
                        className={[
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center border',
                          checked ? 'border-fg bg-fg text-bg' : 'border-line',
                        ].join(' ')}
                      >
                        {checked && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className="flex-1 truncate">
                        {l.name}
                        {l.thirdParty ? ' ·3rd' : ''}
                        {!l.af ? ' ·MF' : ''}
                      </span>
                      {owned && <span className="label">owned</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
