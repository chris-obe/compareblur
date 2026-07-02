import type { ReactNode } from 'react';
import { tooltip, type TooltipKey } from '../../lib/tooltips';

interface TooltipProps {
  tip?: TooltipKey;
  content?: ReactNode;
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  className?: string;
  children: ReactNode;
}

export function Tooltip({ tip, content, side = 'top', align = 'center', className = '', children }: TooltipProps) {
  const body = content ?? (tip ? tooltip(tip) : null);
  if (!body) return <>{children}</>;

  return (
    <span className={['group/tooltip relative inline-flex', className].join(' ')}>
      {children}
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute z-[80] w-max max-w-64 border border-line bg-bg px-2.5 py-2 text-left text-[11px] leading-snug text-fg opacity-0 shadow-none transition-opacity duration-150 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
        ].join(' ')}
      >
        {body}
      </span>
    </span>
  );
}
