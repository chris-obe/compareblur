import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** optional .label caption rendered above the control */
  label?: string;
  /** control height: md = h-9 (forms), sm = h-8 (dense toolbars) */
  size?: 'md' | 'sm';
  /** convenience change handler receiving the plain value */
  onValueChange?: (value: string) => void;
}

// The standard hard-edged text input. For free-typing numeric fields with
// clamp-on-commit semantics use NumberField instead.
export function TextField({ label, size = 'md', onValueChange, onChange, className = '', ...rest }: TextFieldProps) {
  const control = (
    <input
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
    />
  );

  if (!label) return control;
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      {control}
    </label>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  onValueChange?: (value: string) => void;
}

export function TextArea({ label, onValueChange, onChange, className = '', ...rest }: TextAreaProps) {
  const control = (
    <textarea
      className={[
        'w-full resize-none border border-line bg-transparent p-3 text-xs outline-none focus:border-line-strong disabled:opacity-40',
        className,
      ].join(' ')}
      onChange={(event) => {
        onChange?.(event);
        onValueChange?.(event.target.value);
      }}
      {...rest}
    />
  );

  if (!label) return control;
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      {control}
    </label>
  );
}
