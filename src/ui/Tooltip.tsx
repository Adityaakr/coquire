import type { CSSProperties, ReactNode } from 'react';

export function Tooltip({ label, children, style }: { label: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="t-tip" tabIndex={0} style={style}>
      <span className="t-tip-b" role="tooltip">{label}</span>
      {children}
    </span>
  );
}
