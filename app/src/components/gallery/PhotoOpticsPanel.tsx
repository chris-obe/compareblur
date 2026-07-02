import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Ban, Check } from 'lucide-react';
import { cropFactor, diagonal, type Format } from '../../lib/engine';
import { GALLERY_FORMAT_OPTIONS, formatDisplayName, formatOptionLabel } from '../../lib/galleryFormat';
import { computeMatch } from '../../lib/match';
import { subjectPresetById } from '../../lib/subjectDistance';
import type { EmbedFieldId } from '../../lib/galleryApi';
import type { Kit, ViewEntry } from '../../lib/types';
import { Select } from '../ui/Select';

const r1 = (n: number) => Math.round(n * 10) / 10;
const DEFAULT_TARGET_FORMAT_ID = 'ff';
const EMPTY_KIT: Kit = { cameras: [], lenses: [] };
const ALL_FIELDS: EmbedFieldId[] = ['camera', 'lens', 'focal', 'aperture', 'shutter', 'iso', 'capturedAt', 'format', 'subject'];

type FactDefinition = { id: EmbedFieldId; label: string; value: string | null | undefined };
type ResolvedFact = FactDefinition & { value: string };

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
  showIdentityFields?: boolean;
  kit?: Kit;
  renderFooter?: (state: FooterState) => ReactNode;
}

export function PhotoOpticsPanel({
  entry,
  defaultTargetFormatId = DEFAULT_TARGET_FORMAT_ID,
  visibleFields = ALL_FIELDS,
  showEquivalent = true,
  showKitVerdict = false,
  showIdentityFields = true,
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
    const known = GALLERY_FORMAT_OPTIONS.some((f) => f.id === entry.format.id);
    return known ? GALLERY_FORMAT_OPTIONS : [entry.format, ...GALLERY_FORMAT_OPTIONS];
  }, [entry.format]);

  const visible = useMemo(() => new Set(visibleFields.length > 0 ? visibleFields : ALL_FIELDS), [visibleFields]);
  const targetFormat = GALLERY_FORMAT_OPTIONS.find((f) => f.id === targetFormatId)
    ?? GALLERY_FORMAT_OPTIONS.find((f) => f.id === DEFAULT_TARGET_FORMAT_ID)
    ?? GALLERY_FORMAT_OPTIONS[0];
  const m = computeMatch(format, focal, aperture, kit, targetFormat, entry.subjectWidthM ?? 2);
  const subject = subjectPresetById(entry.subjectPreset)?.label;

  const identityCandidates: FactDefinition[] = [
    { id: 'camera', label: 'Camera', value: entry.camera },
    { id: 'lens', label: 'Lens', value: entry.lens },
  ];
  const identityStats = identityCandidates.filter(
    (stat): stat is ResolvedFact => showIdentityFields && visible.has(stat.id) && Boolean(stat.value),
  );

  const captureCandidates: FactDefinition[] = [
    { id: 'focal', label: 'Focal length', value: `${Math.round(focal)} mm` },
    { id: 'aperture', label: 'Aperture', value: `ƒ/${aperture.toFixed(1)}` },
    { id: 'format', label: 'Format', value: formatDisplayName(format) },
    { id: 'subject', label: 'Framing', value: subject },
    { id: 'shutter', label: 'Shutter', value: entry.shutterSpeed },
    { id: 'iso', label: 'ISO', value: entry.iso ? String(entry.iso) : undefined },
    { id: 'capturedAt', label: 'Captured', value: formatDate(entry.capturedAt) },
  ];
  const captureStats = captureCandidates.filter(
    (stat): stat is ResolvedFact => visible.has(stat.id) && Boolean(stat.value),
  );

  return (
    <div className="space-y-3 text-sm">
      {entry.guessed && (
        <Select
          value={format.id}
          onValueChange={(value) => {
            const next = options.find((f) => f.id === value);
            if (next) setFormat(next);
          }}
          options={options.map((f) => ({ value: f.id, label: formatOptionLabel(f) }))}
        />
      )}

      {identityStats.length > 0 && (
        <div className="divide-y divide-line border border-line">
          {identityStats.map((stat) => (
            <div key={stat.id} className="flex items-baseline gap-3 px-3 py-1.5">
              <span className="label w-12 shrink-0">{stat.label}</span>
              <span className="min-w-0 flex-1 break-words font-bold leading-snug">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* capture facts — tight label/value stat grid */}
      <div className="grid grid-cols-2 gap-px border border-line bg-line">
        {captureStats.map((stat) => (
          <Stat key={stat.id} label={stat.label} value={stat.value} />
        ))}
        <Stat label="Field of view" value={`${Math.round(m.fov.h)}°`} />
        <SensorCell fmt={format} />
      </div>

      <label className="flex items-center justify-between gap-2 border border-line px-3 py-2">
        <span className="label shrink-0">Equivalent on</span>
        <select
          value={targetFormat.id}
          onChange={(event) => setTargetFormatId(event.target.value)}
          className="min-w-0 flex-1 cursor-pointer bg-transparent text-right text-sm font-bold outline-none"
        >
          {GALLERY_FORMAT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {formatOptionLabel(f)}
            </option>
          ))}
        </select>
      </label>

      {showEquivalent && (
        <div className="border border-line-strong px-3 py-3">
          <div className="label mb-1">{equivalentLabel(targetFormat)}</div>
          <div className="text-2xl font-bold tracking-tight tabular-nums">
            {r1(m.equivalent.target.focal)}mm · ƒ/{r1(m.equivalent.target.aperture)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-px border border-line bg-line">
        <Stat label="Crop factor" value={`${cropFactor(targetFormat).toFixed(2)}×`} />
        <Stat label="Bg blur · 50 m" value={`${r1(m.blurFar)}%`} />
      </div>

      {showKitVerdict && <KitVerdict verdict={m.kitEval.verdict} />}
      {renderFooter?.({ format, focal, aperture })}
    </div>
  );
}

// Compact label/value cell. Cells share hairlines via the parent grid's gap-px
// over a bg-line, so there's no doubled border or wasted padding.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-bg px-3 py-2">
      <div className="label mb-0.5">{label}</div>
      <div className="break-words text-sm font-bold leading-tight tabular-nums">{value}</div>
    </div>
  );
}

function SensorCell({ fmt }: { fmt: Format }) {
  const diag = diagonal(fmt);
  const value = isSmallSensor(fmt)
    ? `Type ${sensorType(diag)} · ${(fmt.w * fmt.h).toFixed(1)} mm²`
    : `${formatDisplayName(fmt)} · ⌀ ${diag.toFixed(1)} mm`;
  return (
    <div className="col-span-2 min-w-0 bg-bg px-3 py-2">
      <div className="label mb-0.5">Sensor</div>
      <div className="break-words text-sm font-bold leading-tight">{value}</div>
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
    <div className={['border p-3', inverted ? 'border-line-strong bg-fg text-bg' : 'border-line'].join(' ')}>
      <div className="mb-1.5 flex items-center gap-2">
        <Icon size={14} strokeWidth={1.75} />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xs leading-relaxed">{verdict.note}</div>
      {verdict.status !== 'covered' && (
        <div className={['label mt-1.5', inverted ? 'text-bg/70' : ''].join(' ')}>See Suggestions for what to buy</div>
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

function equivalentLabel(fmt: Format): string {
  const name = formatDisplayName(fmt);
  if (fmt.id === 'ff') return 'Full-frame Equivalent';
  return `${name} Equivalent`;
}
