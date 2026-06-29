import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost';
  children: ReactNode;
}

export function Button({ variant = 'ghost', className = '', children, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const styles =
    variant === 'solid'
      ? 'bg-fg text-bg border-fg hover:opacity-85'
      : 'bg-transparent text-fg border-line hover:border-line-strong';
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}
