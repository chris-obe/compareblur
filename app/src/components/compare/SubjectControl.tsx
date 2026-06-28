interface Props {
  width: number;
  onChange: (w: number) => void;
}

const PRESETS: { label: string; w: number }[] = [
  { label: 'Face', w: 0.5 },
  { label: 'Half body', w: 1 },
  { label: 'Full body', w: 2 },
  { label: 'Group', w: 4 },
];

// What you're framing sets the subject distance, which scales the whole curve.
export function SubjectControl({ width, onChange }: Props) {
  const isPreset = PRESETS.some((p) => p.w === width);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label mr-1">Subject</span>
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onChange(p.w)}
          className={[
            'border px-2.5 py-1 text-xs transition-colors',
            width === p.w ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-line-strong',
          ].join(' ')}
        >
          {p.label}
        </button>
      ))}
      <label
        className={[
          'flex items-center gap-1 border px-2 py-1 text-xs transition-colors',
          isPreset ? 'border-line' : 'border-fg',
        ].join(' ')}
      >
        <input
          type="number"
          step={0.1}
          min={0.1}
          value={width}
          onChange={(e) => onChange(Math.max(0.1, +e.target.value || 0.1))}
          className="w-14 bg-transparent text-right outline-none tabular-nums"
        />
        <span className="text-muted">m wide</span>
      </label>
    </div>
  );
}
