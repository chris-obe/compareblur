import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertTriangle, Ban, MoveDiagonal, GitCompare } from 'lucide-react';
import { FORMATS, cropFactor, diagonal, type Format } from '../../lib/engine';
import { computeMatch } from '../../lib/match';
import { useKit } from '../../store/KitProvider';
import { useCompare, nextSystemId } from '../../store/CompareProvider';
import type { ViewEntry } from '../../lib/types';

const r1 = (n: number) => Math.round(n * 10) / 10;

// "type" inch designation from the sensor diagonal (1" optical format ≈ 16mm).
function sensorType(diagMm: number): string {
  const inches = diagMm / 16;
  // ≥ ~0.95 reads as a whole-inch type (e.g. the nominal 1″ sensor), else 1/x″.
  return inches >= 0.95 ? `${inches.toFixed(1)}″` : `1/${(1 / inches).toFixed(1)}″`;
}

// Sensors small enough that the "type" notation is the meaningful description
// (phones and compacts, ~1" and below). Larger camera formats use name + diagonal.
function isSmallSensor(fmt: Format): boolean {
  return fmt.family === 'phone' || diagonal(fmt) < 18;
}

// "Full frame (35mm)" -> "Full frame"; drops the trailing parenthetical.
function shortName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, '').trim() || name;
}

function equivalentLabel(fmt: Format): string {
  const name = shortName(fmt.name);
  if (fmt.id === 'ff') return 'Full-frame Equivalent';
  return `${name} Equivalent`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-3 py-2">
      <div className="label mb-1">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

// Mobile/compact -> "Type 1/3.6″ (12.0 mm²)". Camera formats -> name + a
// diagonal icon and the physical diagonal in mm (no "type", no "diagonal" word).
function SensorCell({ fmt }: { fmt: Format }) {
  const diag = diagonal(fmt);
  return (
    <div className="col-span-3 border border-line px-3 py-2">
      <div className="label mb-1">Sensor size</div>
      {isSmallSensor(fmt) ? (
        <div className="text-sm font-bold tabular-nums">
          Type {sensorType(diag)}{' '}
          <span className="font-normal text-muted">({(fmt.w * fmt.h).toFixed(1)} mm²)</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm font-bold">
          <span>{shortName(fmt.name)}</span>
          <span className="flex items-center gap-1 font-normal text-muted tabular-nums">
            <MoveDiagonal size={13} strokeWidth={1.5} />
            {diag.toFixed(1)} mm
          </span>
        </div>
      )}
    </div>
  );
}

// The optical panel inside the lightbox. The format can be corrected (EXIF
// guesses), and everything recomputes live; resets when the viewed entry changes.
export function LightboxInfo({ entry }: { entry: ViewEntry }) {
  const { cameras, lenses } = useKit();
  const { add: addToCompare } = useCompare();
  const navigate = useNavigate();
  const [format, setFormat] = useState<Format>(entry.format);
  const [targetFormat, setTargetFormat] = useState<Format>(FORMATS.find((f) => f.id === 'ff') ?? FORMATS[0]);
  const [focal, setFocal] = useState(entry.focal);
  const [aperture, setAperture] = useState(entry.aperture);

  useEffect(() => {
    setFormat(entry.format);
    setTargetFormat(FORMATS.find((f) => f.id === 'ff') ?? FORMATS[0]);
    setFocal(entry.focal);
    setAperture(entry.aperture);
  }, [entry]);

  // Include the detected format in the dropdown when it's a synthesized one
  // (phones / focal-plane sensors aren't in the static list).
  const options = useMemo<Format[]>(() => {
    const known = FORMATS.some((f) => f.id === entry.format.id);
    return known ? FORMATS : [entry.format, ...FORMATS];
  }, [entry.format]);

  const m = computeMatch(format, focal, aperture, { cameras, lenses }, targetFormat);
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

      {/* Source — the format dropdown only appears when the format is uncertain
          (an upload the tool had to guess); otherwise it's known, so we hide it. */}
      <div>
        <div className="label mb-2">Source {entry.guessed && '· confirm format'}</div>
        {entry.guessed && (
          <select
            value={format.id}
            onChange={(e) => {
              const next = options.find((f) => f.id === e.target.value);
              if (next) setFormat(next);
            }}
            className="mb-2 w-full border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
          >
            {options.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Focal length" value={`${Math.round(focal)} mm`} />
          <Stat label="Shot aperture" value={`ƒ/${aperture.toFixed(1)}`} />
          <Stat label="Field of view" value={`${Math.round(m.fov.h)}°`} />
          <SensorCell fmt={format} />
        </div>
      </div>

      <label className="block border border-line px-3 py-2">
        <span className="label mb-2 block">Equivalent format</span>
        <select
          value={targetFormat.id}
          onChange={(e) => {
            const next = FORMATS.find((f) => f.id === e.target.value);
            if (next) setTargetFormat(next);
          }}
          className="w-full bg-transparent text-sm font-bold outline-none"
        >
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {shortName(f.name)}
            </option>
          ))}
        </select>
      </label>

      <div className="border border-line-strong p-4">
        <div className="label mb-2">{equivalentLabel(targetFormat)}</div>
        <div className="text-2xl font-bold tracking-tight tabular-nums">
          {r1(m.equivalent.target.focal)}mm · ƒ/{r1(m.equivalent.target.aperture)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Crop factor" value={`${cropFactor(format).toFixed(2)}×`} />
        <Stat label="Bg blur (50 m)" value={`${r1(m.blurFar)}%`} />
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

      <button
        type="button"
        onClick={() => {
          addToCompare({ id: nextSystemId(), context: entry.title, format, focal, aperture });
          navigate('/compare');
        }}
        className="flex w-full items-center justify-center gap-2 border border-line px-3 py-2 text-xs uppercase tracking-wide transition-colors hover:border-line-strong"
      >
        <GitCompare size={14} strokeWidth={1.5} /> Compare this look
      </button>
    </div>
  );
}
