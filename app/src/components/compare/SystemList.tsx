import { Trash2 } from 'lucide-react';
import { cropFactor } from '../../lib/engine';
import { COMPARE_LINE_COLORS, COMPARE_LINE_STYLES, compareLineColor, compareLineStyle } from '../../lib/compareStyles';
import { useCompare, type CompareSystem } from '../../store/CompareProvider';
import { DashSwatch } from './BlurChart';
import { NumberField } from '../ui/NumberField';

const slotField =
  'h-8 w-16 border border-line bg-transparent px-1.5 text-xs outline-none focus:border-line-strong';
const textField =
  'h-8 min-w-0 border border-line bg-transparent px-2 text-xs font-bold outline-none focus:border-line-strong';

// The systems currently plotted — lives in the Compare sidebar on desktop.
export function SystemList() {
  const { systems, remove, update, clear } = useCompare();

  if (systems.length === 0) {
    return (
      <div className="border border-line px-4 py-6 text-center text-xs text-muted">
        No systems yet — add one below to plot it.
      </div>
    );
  }

  return (
    <div className="border border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="label">{systems.length} systems</span>
        <button type="button" onClick={clear} className="label hover:text-fg">
          Clear all
        </button>
      </div>
      {systems.map((s, i) => (
        <SystemRow key={s.id} system={s} index={i} onUpdate={(patch) => update(s.id, patch)} onRemove={() => remove(s.id)} />
      ))}
    </div>
  );
}

function SystemRow({
  system,
  index,
  onUpdate,
  onRemove,
}: {
  system: CompareSystem;
  index: number;
  onUpdate: (patch: Partial<CompareSystem>) => void;
  onRemove: () => void;
}) {
  const color = compareLineColor(system.lineColor, index);
  const style = compareLineStyle(system.lineStyle, index);

  return (
    <div className="border-b border-line px-3 py-2 last:border-b-0">
      <div className="grid grid-cols-[1.7rem_minmax(0,1fr)_auto] items-center gap-2">
        <DashSwatch color={color.stroke} dash={style.dash} />
        <input
          value={system.identifier ?? system.id}
          onChange={(event) => onUpdate({ identifier: event.target.value })}
          aria-label="Compare system identifier"
          className={textField}
        />
        <button type="button" onClick={onRemove} aria-label="Remove" className="flex h-8 w-8 items-center justify-center text-muted hover:text-fg">
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold">{compactContext(system)}</div>
          <div className="label mt-1 truncate">{system.format.name} · {cropFactor(system.format).toFixed(1)}x</div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="label">Focal</span>
          <NumberField value={Math.round(system.focal)} onCommit={(n) => onUpdate({ focal: n })} min={1} className={slotField} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">ƒ/</span>
          <NumberField value={system.aperture} onCommit={(n) => onUpdate({ aperture: n })} min={0.7} step={0.1} className={slotField} />
        </label>
      </div>

      <div className="mt-2 space-y-1.5">
        <ColorButtons
          label="Colour"
          value={color.id}
          onChange={(lineColor) => onUpdate({ lineColor })}
        />
        <LineButtons
          label="Line"
          value={style.id}
          onChange={(lineStyle) => onUpdate({ lineStyle })}
        />
      </div>
    </div>
  );
}

function ColorButtons({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label w-12 shrink-0">{label}</span>
      <div className="flex min-w-0 flex-wrap gap-1">
        {COMPARE_LINE_COLORS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            title={option.label}
            aria-label={`${label}: ${option.label}`}
            aria-pressed={value === option.id}
            className={[
              'flex h-5 w-5 items-center justify-center border transition-colors hover:border-line-strong',
              value === option.id ? 'border-fg' : 'border-line',
            ].join(' ')}
          >
            <span className="h-2.5 w-2.5" style={{ background: option.stroke }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function LineButtons({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label w-12 shrink-0">{label}</span>
      <div className="flex min-w-0 flex-wrap gap-1">
        {COMPARE_LINE_STYLES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            title={option.label}
            aria-label={`${label}: ${option.label}`}
            aria-pressed={value === option.id}
            className={[
              'flex h-5 w-8 items-center justify-center border transition-colors hover:border-line-strong',
              value === option.id ? 'border-fg' : 'border-line',
            ].join(' ')}
          >
            <DashSwatch color="var(--fg)" dash={option.dash} />
          </button>
        ))}
      </div>
    </div>
  );
}

function compactContext(system: CompareSystem): string {
  const [first, ...rest] = system.context.split(' · ');
  if (rest.length === 0) return first;
  return `${first} · ${rest[rest.length - 1]}`;
}
