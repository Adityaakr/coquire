import { useEffect, useState, type ReactNode } from 'react';

/** Current time, refreshed on an interval, so countdowns re-render without calling Date.now() in render. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t); }, [intervalMs]);
  return now;
}

export function Row({ k, v, accent }: { k: ReactNode; v: ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', fontSize: 13.5, borderTop: '1px solid var(--line-1)', gap: 12 }}>
      <span style={{ color: 'var(--text-3)' }}>{k}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: accent ? 'var(--fx-indigo)' : 'var(--text-1)', textAlign: 'right', fontWeight: 600 }}>{v}</span>
    </div>
  );
}

export function IRow({ icon, k, v, accent, loading }: { icon: ReactNode; k: ReactNode; v: ReactNode; accent?: boolean; loading?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0' }}>
      <span style={{ width: 32, height: 32, minWidth: 32, borderRadius: 99, background: '#fff', border: '1px solid var(--fx-mist)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>{icon}</span>
      <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{k}</span>
      <span className={loading ? 'skeleton' : undefined} style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: accent ? 'var(--fx-indigo)' : 'var(--text-1)', minWidth: loading ? 80 : undefined, textAlign: 'right' }}>{v}</span>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
