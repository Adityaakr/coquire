import type { InputHTMLAttributes, ReactNode } from 'react';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  size?: 'md' | 'lg';
};

export function Input({ label, hint, error, prefix, suffix, size = 'md', style, ...rest }: InputProps) {
  const h = size === 'lg' ? 46 : 38;
  return (
    <div className={['t-in', error ? 't-in-err' : ''].join(' ')} style={style}>
      {label ? <span className="t-in-l">{label}</span> : null}
      <div className="t-in-b" style={{ height: h }}>
        {prefix ?? null}
        <input {...rest} />
        {suffix ?? null}
      </div>
      {error || hint ? <span className="t-in-msg">{error || hint}</span> : null}
    </div>
  );
}
