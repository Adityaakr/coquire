import type { CSSProperties } from 'react';

export type MeterProps = {
  value?: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  marker?: number;
  tone?: 'auto' | 'grad' | 'warn' | 'danger';
  height?: number;
  style?: CSSProperties;
};

export function Meter({ value = 0, max = 100, label, showValue = true, marker, tone = 'auto', height = 8, style }: MeterProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const t = tone === 'auto' ? (pct < 65 ? 'grad' : pct < 85 ? 'warn' : 'danger') : tone;
  const fill = t === 'warn' ? 'var(--warn)' : t === 'danger' ? 'var(--danger)' : 'var(--grad-tide)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{label}</span>
          {showValue && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>{Math.round(pct * 10) / 10}%</span>}
        </div>
      )}
      <div style={{ position: 'relative', height, borderRadius: 99, background: 'var(--fx-mist)', overflow: 'visible' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: fill, transition: 'width var(--dur-3) var(--ease-out)' }} />
        </div>
        {marker != null && (
          <div title={`kink ${marker}%`} style={{ position: 'absolute', left: `${Math.min(100, (marker / max) * 100)}%`, top: -3, bottom: -3, width: 2, background: 'var(--text-3)', borderRadius: 2 }} />
        )}
      </div>
    </div>
  );
}
