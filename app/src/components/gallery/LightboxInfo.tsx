import { useEffect, useMemo, useState } from 'react';
import { Check, AlertTriangle, Ban } from 'lucide-react';
import { FORMATS, cropFactor, type Format } from '../../lib/engine';
import { computeMatch } from '../../lib/match';
import { useKit } from '../../store/KitProvider';
import type { ViewEntry } from '../../lib/types';

const r1 = (n: number) => Math.round(n * 10) / 10;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-3 py-2">
      <div className="label mb-1">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

// The optical panel inside the lightbox. Editable source (correct EXIF guesses),
// resets whenever the viewed entry changes.
export function LightboxInfo({ entry }: { entry: ViewEntry }) {
  const { kit } = useKit();
  const [format, setFormat] = useState<Format>(entry.format);
  const [focal, setFocal] = useState(entry.focal);
  const [aperture, setAperture] = useState(entry.aperture);

  useEffect(() => {
    setFormat(entry.format);
    setFocal(entry.focal);
    setAperture(entry.aperture);
  }, [entry]);

  // Include the detected format in the dropdown when it's a synthesized one
  // (phones / focal-plane sensors aren't in the static list).
  const options = useMemo<Format[]>(() => {
    const known = FORMATS.some((f) => f.id === entry.format.id);
    return known ? FORMATS : [entry.format, ...FORMATS];
  }, [entry.format]);

  const m = computeMatch(format, focal, aperture, kit);
  const verdict = m.kitEval.verdict;
  const vmap = {
    covered: { Icon: Check, label: 'In your kit' },
    partial: { Icon: AlertTriangle, label: 'Almost' },
    missing: { Icon: Ban, label: 'Not in your kit' },
  } as const;
  const { Icon, label } = vmap[verdict.status];
  const inverted = verdict.status === 'covered';

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold">{entry.title}</div>
        <div className="label mt-1">{entry.metaLine}</div>
      </div>

      <div>
        <div className="label mb-2">Source {entry.guessed && '· format guessed, confirm'}</div>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span className="label">Format</span>
            <select
              value={format.id}
              onChange={(e) => {
                const next = options.find((f) => f.id === e.target.value);
                if (next) setFormat(next);
              }}
              className="border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
            >
              {options.map((f) => (
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

      {/* the two headline calculated numbers */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-line-strong p-4">
          <div className="label mb-2">Sensor</div>
          <div className="text-xl font-bold tracking-tight tabular-nums">
            {format.w} × {format.h}
            <span className="text-xs font-normal text-muted"> mm</span>
          </div>
        </div>
        <div className="border border-line-strong p-4">
          <div className="label mb-2">Crop factor</div>
          <div className="text-xl font-bold tracking-tight tabular-nums">
            {cropFactor(format).toFixed(2)}×
          </div>
        </div>
      </div>

      <div className="border border-line-strong p-4">
        <div className="label mb-2">Full-frame equivalent</div>
        <div className="text-2xl font-bold tracking-tight tabular-nums">
          {r1(m.ff.fullFrameEquivalent.focal)}mm · ƒ/{r1(m.ff.fullFrameEquivalent.aperture)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="FOV h" value={`${r1(m.fov.h)}°`} />
        <Stat label="FOV v" value={`${r1(m.fov.v)}°`} />
        <Stat label="Bg blur" value={`${r1(m.blurFar)}%`} />
      </div>

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
    </div>
  );
}
