import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

// A numeric field that lets you type freely. It keeps a local string buffer
// while focused (so you can clear it, type "0.", or pass through the min during
// editing) and only parses + clamps on blur or Enter. When not focused it shows
// the committed prop value.
export function NumberField({
  value,
  onCommit,
  min,
  max,
  step,
  disabled,
  className = '',
  'aria-label': ariaLabel,
}: Props) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);

  // Keep the displayed text in sync with the prop when not actively editing.
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = parseFloat(draft);
    if (!isFinite(n)) {
      setDraft(String(value)); // revert empty/invalid
      return;
    }
    let clamped = n;
    if (min != null) clamped = Math.max(min, clamped);
    if (max != null) clamped = Math.min(max, clamped);
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      aria-label={ariaLabel}
      value={draft}
      step={step}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}
