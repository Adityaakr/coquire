import type { CSSProperties } from 'react';

export function Switch({ checked, onChange, label, disabled, style }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean; style?: CSSProperties }) {
  const toggle = () => { if (!disabled) onChange(!checked); };
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1, ...style }}>
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } }}
        onClick={toggle}
        style={{ position: 'relative', width: 40, height: 22, borderRadius: 99, background: checked ? 'var(--tide-500)' : 'var(--ink-600)', boxShadow: checked ? 'var(--glow-tide)' : 'inset 0 1px 2px rgba(0,0,0,.4)', transition: 'background var(--dur-2) var(--ease-out),box-shadow var(--dur-2) var(--ease-out)', flexShrink: 0 }}
      >
        <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: 99, background: checked ? 'var(--ink-950)' : 'var(--text-2)', transition: 'left var(--dur-2) var(--ease-spring),background var(--dur-2) var(--ease-out)' }} />
      </span>
      {label ? <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-2)' }}>{label}</span> : null}
    </label>
  );
}
