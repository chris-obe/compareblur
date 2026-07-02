import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

// The standard hairline section box with a .label heading.
export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <section className={['border border-line p-4', className].join(' ')}>
      <div className="label mb-3">{title}</div>
      {children}
    </section>
  );
}
