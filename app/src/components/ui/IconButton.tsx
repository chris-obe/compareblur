import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** accessible name; also used as the tooltip */
  label: string;
  /** md = h-9 w-9, sm = h-8 w-8 */
  size?: 'md' | 'sm';
  /** inverted (bg-fg text-bg) state for toggles */
  active?: boolean;
  children: ReactNode;
}

// The standard square hairline icon button used in toolbars, dialogs, and
// action bars. Active state inverts, matching the app's toggle convention.
export function IconButton({ label, size = 'md', active = false, className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        'flex items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
