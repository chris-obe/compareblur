import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { FORMATS, cropFactor, getFormat } from '../../lib/engine';
import { type ReferenceLook } from '../../lib/lookMatching';
import { SUBJECT_DISTANCE_PRESETS, subjectPresetForWidth } from '../../lib/subjectDistance';
import { NumberField } from '../ui/NumberField';
import { SearchSelect, type SelectOption } from '../ui/SearchSelect';

const fieldCls = 'border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong';

interface Props {
  value: ReferenceLook;
  onChange: (next: ReferenceLook) => void;
}

export function ReferenceLookBuilder({ value, onChange }: Props) {
  const formatOptions = useMemo<SelectOption[]>(
    () => FORMATS.map((format) => ({ id: format.id, label: `${format.name} · ${cropFactor(format).toFixed(1)}x`, maker: 'Format' })),
    [],
  );

  const update = (patch: Partial<ReferenceLook>) => onChange({ ...value, ...patch });

  return (
    <section className="border border-line">
      <div className="border-b border-line px-4 py-2">
        <div className="text-xs font-bold uppercase tracking-wide">Manual reference</div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="label">Format</span>
          <SearchSelect
            options={formatOptions}
            value={value.format.id}
            onChange={(formatId) => update({ format: getFormat(formatId) })}
            placeholder="Select format"
            showMakerInTrigger={false}
          />
        </label>
        <Field label="Focal length">
          <NumberField value={value.focal} onCommit={(focal) => update({ focal })} min={1} className={fieldCls} />
        </Field>
        <Field label="Aperture">
          <NumberField value={value.aperture} onCommit={(aperture) => update({ aperture })} min={0.7} step={0.1} className={fieldCls} />
        </Field>
        <div className="sm:col-span-2">
          <div className="label mb-2">Framing</div>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_DISTANCE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => update({ subjectWidthM: preset.widthM })}
                className={[
                  'border px-2.5 py-1 text-xs transition-colors',
                  subjectPresetForWidth(value.subjectWidthM)?.id === preset.id
                    ? 'border-fg bg-fg text-bg'
                    : 'border-line hover:border-line-strong',
                ].join(' ')}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
