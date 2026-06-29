import { NumberField } from '../ui/NumberField';
import { SUBJECT_DISTANCE_PRESETS } from '../../lib/subjectDistance';

interface Props {
  width: number;
  onChange: (w: number) => void;
}

// What you're framing sets the subject distance, which scales the whole curve.
export function SubjectControl({ width, onChange }: Props) {
  const isPreset = SUBJECT_DISTANCE_PRESETS.some((preset) => preset.widthM === width);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label mr-1">Subject</span>
      {SUBJECT_DISTANCE_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(preset.widthM)}
          className={[
            'border px-2.5 py-1 text-xs transition-colors',
            width === preset.widthM ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-line-strong',
          ].join(' ')}
        >
          {preset.label}
        </button>
      ))}
      <label
        className={[
          'flex items-center gap-1 border px-2 py-1 text-xs transition-colors',
          isPreset ? 'border-line' : 'border-fg',
        ].join(' ')}
      >
        <NumberField
          value={width}
          onCommit={onChange}
          min={0.1}
          step={0.1}
          aria-label="Subject width in metres"
          className="w-14 bg-transparent text-right outline-none tabular-nums"
        />
        <span className="text-muted">m wide</span>
      </label>
    </div>
  );
}
