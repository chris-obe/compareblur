interface ToggleRowProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// Full-width labelled on/off row; active state inverts per the app convention.
export function ToggleRow({ label, active, onToggle, disabled }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onToggle}
      className={[
        'flex w-full items-center justify-between border px-2.5 py-2 text-left text-xs uppercase tracking-wide disabled:opacity-40',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong',
      ].join(' ')}
    >
      <span>{label}</span>
      <span>{active ? 'On' : 'Off'}</span>
    </button>
  );
}
