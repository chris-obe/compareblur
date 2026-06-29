import type { ReactNode } from 'react';

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  children: ReactNode;
}

// A hard-edged toggle/removable chip. Active = inverted fill (museum label tag).
export function Chip({ active, onClick, onRemove, children }: ChipProps) {
  return (
    <span
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs tracking-wide select-none transition-colors',
        onClick ? 'cursor-pointer' : '',
        active
          ? 'bg-fg text-bg border-fg'
          : 'bg-transparent text-fg border-line hover:border-line-strong',
      ].join(' ')}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 ml-0.5 leading-none opacity-60 hover:opacity-100"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
