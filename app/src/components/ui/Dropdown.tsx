import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface DropdownRenderProps {
  close: () => void;
}

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode | ((props: DropdownRenderProps) => ReactNode);
  align?: 'left' | 'right';
  className?: string;
  closeOnClick?: boolean;
}

// Tight, fast dropdown. Closes on outside click / Escape.
export function Dropdown({ trigger, children, align = 'right', className = '', closeOnClick = true }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

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

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="block">
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            className={[
              'absolute z-50 mt-1 min-w-44 border bg-surface',
              align === 'right' ? 'right-0' : 'left-0',
              className,
            ].join(' ')}
            style={{ borderColor: 'var(--line)' }}
            onClick={closeOnClick ? () => setOpen(false) : undefined}
          >
            {typeof children === 'function' ? children({ close }) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs tracking-wide hover:bg-faint"
    >
      {children}
    </button>
  );
}
