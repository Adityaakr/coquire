import type { CSSProperties, ReactNode } from 'react';

export type StatProps = {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  gradient?: boolean;
  mono?: boolean;
  align?: 'left' | 'center' | 'right';
  loading?: boolean;
  style?: CSSProperties;
};

const FS = { sm: 'var(--fs-num-md)', md: 'var(--fs-num-lg)', lg: 'var(--fs-num-xl)' } as const;

export function Stat({ label, value, sub, size = 'md', gradient, mono, align = 'left', loading, style }: StatProps) {
  const grad: CSSProperties = gradient
    ? { background: 'var(--grad-text)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
    : { color: 'var(--text-1)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: align, alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', ...style }}>
      <span className="eyebrow">{label}</span>
      <span
        className={loading ? 'skeleton' : undefined}
        style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: FS[size], lineHeight: 1.1, letterSpacing: mono ? '-0.01em' : '-0.02em', minWidth: loading ? 96 : undefined, ...grad }}
      >
        {value}
      </span>
      {sub ? <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{sub}</span> : null}
    </div>
  );
}
