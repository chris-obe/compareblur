import type { ReactNode, SelectHTMLAttributes } from 'react';

export type SelectOption = string | { value: string; label: string };

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** optional .label caption rendered above the control */
  label?: string;
  /** control height: md = h-9 (forms), sm = h-8 (dense toolbars) */
  size?: 'md' | 'sm';
  /** convenience option list; pass <option> children instead for rich lists */
  options?: SelectOption[];
  /** convenience change handler receiving the plain value */
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

// The standard hard-edged native select. Pass `options` (strings or
// value/label pairs) or <option> children. For searchable/rich pickers keep
// using SearchSelect / FreeTextComboBox.
export function Select({
  label,
  size = 'md',
  options,
  onValueChange,
  onChange,
  className = '',
  children,
  ...rest
}: SelectProps) {
  const control = (
    <select
      className={[
        size === 'sm' ? 'h-8' : 'h-9',
        'w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong disabled:opacity-40',
        className,
      ].join(' ')}
      onChange={(event) => {
        onChange?.(event);
        onValueChange?.(event.target.value);
      }}
      {...rest}
    >
      {options?.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const text = typeof option === 'string' ? option : option.label;
        return (
          <option key={value} value={value}>
            {text}
          </option>
        );
      })}
      {children}
    </select>
  );

  if (!label) return control;
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      {control}
    </label>
  );
}
