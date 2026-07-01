import { Trash2 } from 'lucide-react';
import { cropFactor } from '../../lib/engine';
import { COMPARE_LINE_COLORS, COMPARE_LINE_STYLES, compareLineColor, compareLineStyle } from '../../lib/compareStyles';
import { useCompare, type CompareSystem } from '../../store/CompareProvider';
import { DashSwatch } from './BlurChart';
import { NumberField } from '../ui/NumberField';
import { Dropdown } from '../ui/Dropdown';

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

      <StyleMenu
        colorId={color.id}
        styleId={style.id}
        onChange={(lineColor, lineStyle) => onUpdate({ lineColor, lineStyle })}
      />
    </div>
  );
}

function StyleMenu({
  colorId,
  styleId,
  onChange,
}: {
  colorId: string;
  styleId: string;
  onChange: (lineColor: string, lineStyle: string) => void;
}) {
  const color = compareLineColor(colorId);
  const style = compareLineStyle(styleId);

  return (
    <div className="mt-2">
      <Dropdown
        align="left"
        className="w-64 p-2"
        trigger={
          <div
            className="flex h-8 w-14 items-center justify-center border border-line transition-colors hover:border-line-strong"
            title={`${color.label} · ${style.label}`}
            aria-label={`Style: ${color.label}, ${style.label}`}
            style={{ background: color.stroke }}
          >
            <DashSwatch color="var(--bg)" dash={style.dash} />
          </div>
        }
      >
        <div className="grid grid-cols-5 gap-1">
          {COMPARE_LINE_COLORS.flatMap((colorOption) =>
            COMPARE_LINE_STYLES.map((styleOption) => {
              const selected = colorOption.id === colorId && styleOption.id === styleId;
              return (
                <button
                  key={`${colorOption.id}-${styleOption.id}`}
                  type="button"
                  onClick={() => onChange(colorOption.id, styleOption.id)}
                  title={`${colorOption.label} · ${styleOption.label}`}
                  aria-label={`${colorOption.label} ${styleOption.label}`}
                  aria-pressed={selected}
                  className={[
                    'flex h-8 items-center justify-center border transition-colors hover:border-line-strong',
                    selected ? 'border-fg' : 'border-line',
                  ].join(' ')}
                  style={{ background: colorOption.stroke }}
                >
                  <DashSwatch color="var(--bg)" dash={styleOption.dash} />
                </button>
              );
            }),
          )}
        </div>
      </Dropdown>
    </div>
  );
}

function compactContext(system: CompareSystem): string {
  const [first, ...rest] = system.context.split(' · ');
  if (rest.length === 0) return first;
  return `${first} · ${rest[rest.length - 1]}`;
}
