import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useCompare, systemLabel } from '../../store/CompareProvider';
import { BlurChart, DashSwatch } from './BlurChart';
import { SubjectControl } from './SubjectControl';
import { AddSystem } from './AddSystem';
import { NumberField } from '../ui/NumberField';

const slotField =
  'w-16 border border-line bg-transparent px-1.5 py-1 text-xs outline-none focus:border-line-strong';

export function ComparePage() {
  const { systems, remove, update, clear } = useCompare();
  const [subjectWidth, setSubjectWidth] = useState(2);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <p className="text-sm text-muted">
          Plot background blur (as % of frame width) against how far behind the subject things
          fall. Higher line = more melt. Add up to four systems and read them off at any distance.
        </p>
      </div>

      <SubjectControl width={subjectWidth} onChange={setSubjectWidth} />

      <BlurChart systems={systems} subjectWidthM={subjectWidth} />

      {/* the systems being compared */}
      {systems.length > 0 && (
        <div className="border border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="label">{systems.length} / 4 systems</span>
            <button type="button" onClick={clear} className="label hover:text-fg">
              Clear all
            </button>
          </div>
          {systems.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <DashSwatch index={i} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{s.context}</div>
                <div className="label mt-0.5">{systemLabel(s)}</div>
              </div>
              <label className="flex flex-col gap-0.5">
                <span className="label">Focal</span>
                <NumberField
                  value={Math.round(s.focal)}
                  onCommit={(n) => update(s.id, { focal: n })}
                  min={1}
                  className={slotField}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="label">ƒ/</span>
                <NumberField
                  value={s.aperture}
                  onCommit={(n) => update(s.id, { aperture: n })}
                  min={0.7}
                  step={0.1}
                  className={slotField}
                />
              </label>
              <button
                type="button"
                onClick={() => remove(s.id)}
                aria-label="Remove"
                className="text-muted hover:text-fg"
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddSystem />
    </div>
  );
}
