import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ViewEntry } from '../../lib/types';
import { LightboxInfo } from './LightboxInfo';

interface Props {
  list: ViewEntry[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** live rect of a gallery thumbnail by id, for the open/close morph */
  getAnchorRect: (id: string) => DOMRect | null;
}

const FRAME_SPRING = { type: 'spring', stiffness: 320, damping: 34 } as const;

const slide = {
  enter: (d: number) => ({ x: d >= 0 ? 36 : -36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d >= 0 ? -36 : 36, opacity: 0 }),
};

// FLIP: the transform that maps a target rect onto a base rect (origin top-left).
function flip(target: DOMRect, base: DOMRect) {
  return {
    x: target.left - base.left,
    y: target.top - base.top,
    scaleX: target.width / base.width,
    scaleY: target.height / base.height,
  };
}

export function Lightbox({ list, index, onIndex, onClose, getAnchorRect }: Props) {
  const [dir, setDir] = useState(0);
  const current = list[index];
  const many = list.length > 1;

  const frameRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  // We close to whichever image is showing *now*, so keep current.id in a ref
  // that the (stable) close handler can read.
  const currentIdRef = useRef(current?.id);
  currentIdRef.current = current?.id;
  const morphRef = useRef(current?.morph);
  morphRef.current = current?.morph;

  const go = useCallback(
    (delta: number) => {
      setDir(delta);
      onIndex((index + delta + list.length) % list.length);
    },
    [index, list.length, onIndex],
  );

  // ENTER — grow the frame out of the clicked thumbnail.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (backdropRef.current) animate(backdropRef.current, { opacity: [0, 1] }, { duration: 0.2 });
    if (panelRef.current) animate(panelRef.current, { opacity: [0, 1], x: [12, 0] }, { duration: 0.22 });
    if (!frame) return;
    const origin = morphRef.current ? getAnchorRect(currentIdRef.current!) : null;
    if (origin) {
      const t = flip(origin, frame.getBoundingClientRect());
      animate(
        frame,
        { x: [t.x, 0], y: [t.y, 0], scaleX: [t.scaleX, 1], scaleY: [t.scaleY, 1], opacity: [0.5, 1] },
        FRAME_SPRING,
      );
    } else {
      animate(frame, { opacity: [0, 1], scale: [0.96, 1] }, { duration: 0.2 });
    }
    // run once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CLOSE — shrink the frame back into the *currently viewed* thumbnail.
  const doClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const frame = frameRef.current;
    if (backdropRef.current) animate(backdropRef.current, { opacity: 0 }, { duration: 0.2 });
    if (panelRef.current) animate(panelRef.current, { opacity: 0, x: 12 }, { duration: 0.18 });
    const target = morphRef.current ? getAnchorRect(currentIdRef.current!) : null;
    if (frame && target) {
      const t = flip(target, frame.getBoundingClientRect());
      animate(frame, { ...t, opacity: 0.5 }, FRAME_SPRING).then(onClose);
    } else if (frame) {
      animate(frame, { opacity: 0, scale: 0.96 }, { duration: 0.18 }).then(onClose);
    } else {
      onClose();
    }
  }, [getAnchorRect, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') doClose();
      else if (e.key === 'ArrowRight' && many) go(1);
      else if (e.key === 'ArrowLeft' && many) go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, many, doClose]);

  if (!current) return null;

  return (
    <>
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-bg/90 backdrop-blur-sm"
        style={{ opacity: 0 }}
        onClick={doClose}
      />

      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col md:flex-row">
        <div className="relative flex min-h-0 flex-1 p-4 md:p-10">
          {many && (
            <NavButton side="left" onClick={() => go(-1)}>
              <ChevronLeft size={22} strokeWidth={1.5} />
            </NavButton>
          )}

          <div
            ref={frameRef}
            style={{ transformOrigin: 'top left' }}
            className="pointer-events-auto relative mx-auto h-full w-full max-w-[1100px] border border-line-strong bg-surface"
          >
            <AnimatePresence custom={dir} initial={false}>
              <motion.img
                key={current.id}
                src={current.src}
                alt={current.title}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.26, ease: 'easeInOut' }}
                className="absolute inset-0 h-full w-full object-contain p-2"
              />
            </AnimatePresence>
          </div>

          {many && (
            <NavButton side="right" onClick={() => go(1)}>
              <ChevronRight size={22} strokeWidth={1.5} />
            </NavButton>
          )}
        </div>

        <div
          ref={panelRef}
          style={{ opacity: 0 }}
          className="pointer-events-auto flex max-h-[46vh] w-full shrink-0 flex-col border-t border-line bg-surface md:max-h-none md:w-[360px] md:border-l md:border-t-0"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
            <span className="label tabular-nums">
              {index + 1} / {list.length}
            </span>
            <button type="button" onClick={doClose} aria-label="Close">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <LightboxInfo entry={current} />
          </div>
        </div>
      </div>
    </>
  );
}

function NavButton({
  side,
  onClick,
  children,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      className={[
        'pointer-events-auto absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-line bg-surface transition-colors hover:border-line-strong',
        side === 'left' ? 'left-2 md:left-4' : 'right-2 md:right-4',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
