import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Ban, Check, MoveDiagonal } from 'lucide-react';
import { FORMATS, cropFactor, diagonal, type Format } from '../../lib/engine';
import { computeMatch } from '../../lib/match';
import { subjectPresetById } from '../../lib/subjectDistance';
import type { EmbedFieldId } from '../../lib/galleryApi';
import type { Kit, ViewEntry } from '../../lib/types';

const r1 = (n: number) => Math.round(n * 10) / 10;
const DEFAULT_TARGET_FORMAT_ID = 'ff';
const EMPTY_KIT: Kit = { cameras: [], lenses: [] };
const ALL_FIELDS: EmbedFieldId[] = ['camera', 'lens', 'focal', 'aperture', 'shutter', 'iso', 'capturedAt', 'format', 'subject'];

interface FooterState {
  format: Format;
  focal: number;
  aperture: number;
}

interface Props {
  entry: ViewEntry;
  defaultTargetFormatId?: string;
  visibleFields?: EmbedFieldId[];
  showEquivalent?: boolean;
  showKitVerdict?: boolean;
  kit?: Kit;
  renderFooter?: (state: FooterState) => ReactNode;
}

export function PhotoOpticsPanel({
  entry,
  defaultTargetFormatId = DEFAULT_TARGET_FORMAT_ID,
  visibleFields = ALL_FIELDS,
  showEquivalent = true,
  showKitVerdict = false,
  kit = EMPTY_KIT,
  renderFooter,
}: Props) {
  const [format, setFormat] = useState<Format>(entry.format);
  const [targetFormatId, setTargetFormatId] = useState(defaultTargetFormatId);
  const [focal, setFocal] = useState(entry.focal);
  const [aperture, setAperture] = useState(entry.aperture);

  useEffect(() => {
    setFormat(entry.format);
    setTargetFormatId(defaultTargetFormatId);
    setFocal(entry.focal);
    setAperture(entry.aperture);
  }, [defaultTargetFormatId, entry.id, entry.format, entry.focal, entry.aperture]);

  const options = useMemo<Format[]>(() => {
    const known = FORMATS.some((f) => f.id === entry.format.id);
    return known ? FORMATS : [entry.format, ...FORMATS];
  }, [entry.format]);

  const visible = useMemo(() => new Set(visibleFields.length > 0 ? visibleFields : ALL_FIELDS), [visibleFields]);
  const targetFormat = FORMATS.find((f) => f.id === targetFormatId)
    ?? FORMATS.find((f) => f.id === DEFAULT_TARGET_FORMAT_ID)
    ?? FORMATS[0];
  const m = computeMatch(format, focal, aperture, kit, targetFormat, entry.subjectWidthM ?? 2);
  const subject = subjectPresetById(entry.subjectPreset)?.label;
  const sourceStats = ([
    { id: 'camera', label: 'Camera', value: entry.camera },
    { id: 'lens', label: 'Lens', value: entry.lens },
    { id: 'focal', label: 'Focal length', value: `${Math.round(focal)} mm` },
    { id: 'aperture', label: 'Shot aperture', value: `f/${aperture.toFixed(1)}` },
    { id: 'shutter', label: 'Shutter', value: entry.shutterSpeed },
    { id: 'iso', label: 'ISO', value: entry.iso ? String(entry.iso) : undefined },
    { id: 'capturedAt', label: 'Captured', value: formatDate(entry.capturedAt) },
    { id: 'format', label: 'Format', value: shortName(format.name) },
    { id: 'subject', label: 'Framing', value: subject },
  ] satisfies Array<{ id: EmbedFieldId; label: string; value: string | null | undefined }>).filter(
    (stat): stat is { id: EmbedFieldId; label: string; value: string } => visible.has(stat.id) && Boolean(stat.value),
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="label mb-2">Source {entry.guessed && '· confirm format'}</div>
        {entry.guessed && (
          <select
            value={format.id}
            onChange={(event) => {
              const next = options.find((f) => f.id === event.target.value);
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

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {sourceStats.map((stat) => (
            <Stat key={stat.id} label={stat.label} value={stat.value ?? ''} />
          ))}
          <Stat label="Field of view" value={`${Math.round(m.fov.h)} deg`} />
          <SensorCell fmt={format} />
        </div>
      </div>

      <label className="block border border-line px-3 py-2">
        <span className="label mb-2 block">Equivalent format</span>
        <select
          value={targetFormat.id}
          onChange={(event) => setTargetFormatId(event.target.value)}
          className="w-full bg-transparent text-sm font-bold outline-none"
        >
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {shortName(f.name)}
            </option>
          ))}
        </select>
      </label>

      {showEquivalent && (
        <div className="border border-line-strong p-4">
          <div className="label mb-2">{equivalentLabel(targetFormat)}</div>
          <div className="text-2xl font-bold tracking-tight tabular-nums">
            {r1(m.equivalent.target.focal)}mm · f/{r1(m.equivalent.target.aperture)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Crop factor" value={`${cropFactor(format).toFixed(2)}x`} />
        <Stat label="Bg blur (50 m)" value={`${r1(m.blurFar)}%`} />
      </div>

      {showKitVerdict && <KitVerdict verdict={m.kitEval.verdict} />}
      {renderFooter?.({ format, focal, aperture })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-3 py-2">
      <div className="label mb-1">{label}</div>
      <div className="break-words text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function SensorCell({ fmt }: { fmt: Format }) {
  const diag = diagonal(fmt);
  return (
    <div className="border border-line px-3 py-2 md:col-span-2">
      <div className="label mb-1">Sensor size</div>
      {isSmallSensor(fmt) ? (
        <div className="text-sm font-bold tabular-nums">
          Type {sensorType(diag)} <span className="font-normal text-muted">({(fmt.w * fmt.h).toFixed(1)} mm2)</span>
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

function KitVerdict({ verdict }: { verdict: ReturnType<typeof computeMatch>['kitEval']['verdict'] }) {
  const vmap = {
    covered: { Icon: Check, label: 'In your kit' },
    partial: { Icon: AlertTriangle, label: 'Almost' },
    missing: { Icon: Ban, label: 'Not in your kit' },
  } as const;
  const { Icon, label } = vmap[verdict.status];
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
          See Suggestions for what to buy
        </div>
      )}
    </div>
  );
}

function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function sensorType(diagMm: number): string {
  const inches = diagMm / 16;
  return inches >= 0.95 ? `${inches.toFixed(1)}"` : `1/${(1 / inches).toFixed(1)}"`;
}

function isSmallSensor(fmt: Format): boolean {
  return fmt.family === 'phone' || diagonal(fmt) < 18;
}

export function shortName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, '').trim() || name;
}

function equivalentLabel(fmt: Format): string {
  const name = shortName(fmt.name);
  if (fmt.id === 'ff') return 'Full-frame Equivalent';
  return `${name} Equivalent`;
}
