import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, AlertTriangle, Ban } from 'lucide-react';
import {
  FORMATS,
  getFormat,
  matchSystem,
  fieldOfView,
  blurFraction,
  focusDistanceForFraming,
  type System,
} from '../../lib/engine';
import type { ExtractedExif } from '../../lib/types';
import { evaluateKit } from '../../lib/kit';
import { useKit } from '../../store/KitProvider';

export interface Analysis {
  title: string;
  metaLine: string;
  previewSrc?: string;
  source: System;
  exif?: ExtractedExif;
  guessed: boolean;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-3 py-2">
      <div className="label mb-1">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

export function MatchDrawer({ analysis, onClose }: { analysis: Analysis | null; onClose: () => void }) {
  const { kit } = useKit();

  // Editable correction state (EXIF guesses can be wrong).
  const [formatId, setFormatId] = useState('ff');
  const [focal, setFocal] = useState(50);
  const [aperture, setAperture] = useState(1.8);

  useEffect(() => {
    if (analysis) {
      setFormatId(analysis.source.format.id);
      setFocal(analysis.source.focal);
      setAperture(analysis.source.aperture);
    }
  }, [analysis]);

  const computed = useMemo(() => {
    if (!analysis) return null;
    const source: System = { format: getFormat(formatId), focal, aperture };
    const ff = matchSystem(source, getFormat('ff'), { axis: 'h' });
    const fov = fieldOfView(focal, source.format);
    const s = focusDistanceForFraming(focal, source.format, 2, 'h');
    const blurFar = blurFraction(source, s, 50) * 100;
    const kitEval = evaluateKit(source, kit);
    return { source, ff, fov, blurFar, kitEval };
  }, [analysis, formatId, focal, aperture, kit]);

  return (
    <AnimatePresence>
      {analysis && computed && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            {/* header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
              <span className="text-sm font-bold tracking-tight">Match the look</span>
              <button type="button" onClick={onClose} aria-label="Close">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {analysis.previewSrc && (
                <div className="aspect-video w-full overflow-hidden border-b border-line bg-faint">
                  <img src={analysis.previewSrc} alt={analysis.title} className="h-full w-full object-cover" />
                </div>
              )}

              <div className="space-y-5 p-5">
                <div>
                  <div className="text-sm font-bold">{analysis.title}</div>
                  <div className="label mt-1">{analysis.metaLine}</div>
                </div>

                {/* Source — editable (correct EXIF guesses) */}
                <div>
                  <div className="label mb-2">
                    Source {analysis.guessed && '· format guessed, confirm below'}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="label">Format</span>
                      <select
                        value={formatId}
                        onChange={(e) => setFormatId(e.target.value)}
                        className="border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
                      >
                        {FORMATS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="label">Focal</span>
                      <input
                        type="number"
                        value={focal}
                        min={1}
                        onChange={(e) => setFocal(Math.max(1, +e.target.value || 0))}
                        className="border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="label">ƒ/</span>
                      <input
                        type="number"
                        value={aperture}
                        step={0.1}
                        min={0.7}
                        onChange={(e) => setAperture(Math.max(0.7, +e.target.value || 0))}
                        className="border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
                      />
                    </label>
                  </div>
                </div>

                {/* The answer */}
                <div className="border border-line-strong p-4">
                  <div className="label mb-2">Full-frame equivalent</div>
                  <div className="text-2xl font-bold tracking-tight tabular-nums">
                    {r1(computed.ff.fullFrameEquivalent.focal)}mm · ƒ/{r1(computed.ff.fullFrameEquivalent.aperture)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Stat label="FOV h" value={`${r1(computed.fov.h)}°`} />
                  <Stat label="FOV v" value={`${r1(computed.fov.v)}°`} />
                  <Stat label="Bg blur" value={`${r1(computed.blurFar)}%`} />
                </div>

                {/* Kit verdict */}
                <KitVerdictBlock verdict={computed.kitEval.verdict} />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function KitVerdictBlock({ verdict }: { verdict: ReturnType<typeof evaluateKit>['verdict'] }) {
  const map = {
    covered: { Icon: Check, label: 'In your kit' },
    partial: { Icon: AlertTriangle, label: 'Almost' },
    missing: { Icon: Ban, label: 'Not in your kit' },
  } as const;
  const { Icon, label } = map[verdict.status];
  const inverted = verdict.status === 'covered';
  return (
    <div className={['border p-4', inverted ? 'border-line-strong bg-fg text-bg' : 'border-line'].join(' ')}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} strokeWidth={1.75} />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xs leading-relaxed">{verdict.note}</div>
      {verdict.status !== 'covered' && (
        <div className={['label mt-2', inverted ? 'text-bg/70' : ''].join(' ')}>
          See Suggestions for what to buy →
        </div>
      )}
    </div>
  );
}
