import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface FreeTextOption {
  id: string;
  label: string;
  maker?: string;
  detail?: string;
}

interface Props {
  options: FreeTextOption[];
  value: string;
  selectedId?: string;
  onTextChange: (value: string) => void;
  onSelect: (option: FreeTextOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

export function FreeTextComboBox({
  options,
  value,
  selectedId,
  onTextChange,
  onSelect,
  placeholder = 'Search or type…',
  searchPlaceholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const groups = useMemo(() => {
    const needle = value.trim().toLowerCase();
    const filtered = needle
      ? options.filter((option) => `${option.maker ?? ''} ${option.label} ${option.detail ?? ''}`.toLowerCase().includes(needle))
      : options;
    const byMaker = new Map<string, FreeTextOption[]>();
    for (const option of filtered.slice(0, 80)) {
      const maker = option.maker ?? 'Matches';
      byMaker.set(maker, [...(byMaker.get(maker) ?? []), option]);
    }
    return [...byMaker.entries()];
  }, [options, value]);

  const choose = (option: FreeTextOption) => {
    onSelect(option);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex border border-line bg-transparent focus-within:border-line-strong">
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onTextChange(event.target.value);
            setOpen(true);
          }}
          placeholder={searchPlaceholder ?? placeholder}
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle options"
          className="flex w-8 shrink-0 items-center justify-center text-muted"
        >
          <ChevronDown size={14} strokeWidth={1.5} />
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden border border-line bg-surface">
          <div className="max-h-72 overflow-y-auto">
            {groups.length === 0 && <div className="px-3 py-3 text-xs text-muted">No catalog match. Keep typing to use free text.</div>}
            {groups.map(([maker, opts]) => (
              <div key={maker}>
                <div className="label sticky top-0 bg-surface px-3 py-1.5">{maker}</div>
                {opts.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-faint"
                  >
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      {option.id === selectedId && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.detail && <span className="label block truncate opacity-70">{option.detail}</span>}
                    </span>
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

