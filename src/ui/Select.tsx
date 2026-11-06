import type { SelectHTMLAttributes } from 'react';

type Option = string | { value: string; label: string };
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { options?: Option[]; block?: boolean };

export function Select({ options = [], block, style, ...rest }: SelectProps) {
  return (
    <span className="t-sel" style={{ width: block ? '100%' : undefined, ...style }}>
      <select style={{ width: block ? '100%' : undefined }} {...rest}>
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>{o.label}</option>
          ),
        )}
      </select>
    </span>
  );
}
