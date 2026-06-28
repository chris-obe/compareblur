import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { groupByMaker } from '../../lib/group';

export interface SelectOption {
  id: string;
  label: string;
  maker: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

// Single-select searchable dropdown with brand (maker) group headers — the
// single-select sibling of LensMultiSelect, used for camera pickers.
export function SearchSelect({ options, value, onChange, placeholder }: Props) {
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
      ? options.filter((o) => `${o.maker} ${o.label}`.toLowerCase().includes(needle))
      : options;
    return groupByMaker(filtered);
  }, [options, q]);

  const selected = options.find((o) => o.id === value);
  const triggerText = selected ? `${selected.maker} ${selected.label}` : (placeholder ?? 'Select…');

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setQ('');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border border-line bg-transparent px-2 py-1.5 text-xs outline-none hover:border-line-strong"
      >
        <span className={selected ? 'truncate' : 'truncate text-muted'}>{triggerText}</span>
        <ChevronDown size={14} strokeWidth={1.5} className="ml-1 shrink-0 text-muted" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden border border-line bg-surface">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full border border-line bg-transparent px-2 py-1 text-xs outline-none focus:border-line-strong"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {groups.length === 0 && <div className="px-3 py-3 text-xs text-muted">No matches.</div>}
            {groups.map(([maker, opts]) => (
              <div key={maker}>
                <div className="label sticky top-0 bg-surface px-3 py-1.5">{maker}</div>
                {opts.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => choose(o.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-faint"
                  >
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      {o.id === value && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    <span className="flex-1 truncate">{o.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
