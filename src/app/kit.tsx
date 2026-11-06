import type { CSSProperties, ReactNode } from 'react';
import { Badge, Bento } from '@/ui';
import { formatUSDC, type Micro } from '@/domain/money';
import type { OrderStatus } from '@/domain/types';

export function Money({ value, compact = true, style }: { value: Micro; compact?: boolean; style?: CSSProperties }) {
  return <span style={{ fontFamily: 'var(--font-mono)', ...style }}>{formatUSDC(value, { compact })}</span>;
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function formatDate(ts: number) {
  return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function Countdown({ until, prefix }: { until: number; prefix?: string }) {
  const ms = until - Date.now();
  if (ms <= 0) return <span>{prefix} ended</span>;
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  const text = d >= 2 ? `${d}d` : h >= 1 ? `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m` : `${Math.max(1, Math.floor(ms / 60_000))}m`;
  return <span style={{ fontFamily: 'var(--font-mono)' }}>{prefix} {text}</span>;
}

const TONE: Record<OrderStatus, 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info'> = {
  draft: 'neutral', open: 'info', quoted: 'info', approved: 'warn', active: 'accent', completed: 'ok', expired: 'neutral',
};
const LABEL: Record<OrderStatus, string> = {
  draft: 'draft', open: 'open for quotes', quoted: 'quotes in', approved: 'approved', active: 'active', completed: 'completed', expired: 'expired',
};
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]} size="sm">{LABEL[status]}</Badge>;
}

export function SimTag({ children = 'simulated' }: { children?: ReactNode }) {
  return <Badge size="sm" mono>{children}</Badge>;
}

export function Panel({ title, aside, children, pad = 26, style }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; pad?: number; style?: CSSProperties }) {
  return (
    <Bento variant="app" pad={pad} style={style}>
      {(title || aside) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          {title ? <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{title}</div> : <span />}
          {aside}
        </div>
      )}
      {children}
    </Bento>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: 12, color: 'var(--text-2)', background: '#fff', border: '1px solid var(--fx-mist)', borderRadius: 99, padding: '4px 10px', whiteSpace: 'nowrap' }}>{children}</span>;
}

export function Empty({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div style={{ padding: '40px 24px 48px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{title}</div>
      <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 8, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>{body}</p>
      {children && <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}

export function Note({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, ...style }}>{children}</p>;
}

export const Th = ({ children }: { children: ReactNode }) => <th className="ap-th">{children}</th>;

/** Deterministic avatar colour from an address or name. */
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${(hue + 40) % 360} 70% 42%))`;
}

export function TeamAvatar({ name, seed, size = 22 }: { name: string; seed?: string; size?: number }) {
  return <span className="ap-team-av" style={{ width: size, height: size, background: avatarColor(seed ?? name), fontSize: Math.max(9, size * 0.45) }}>{name[0]?.toUpperCase()}</span>;
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return <div className="ap-prog"><span><i style={{ width: `${pct}%` }} /></span><b>{done}/{total}</b></div>;
}

export function Kpi({ label, value, sub, icon, bar, tone, mono }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; bar?: number; tone?: 'primary' | 'dark'; mono?: boolean }) {
  return (
    <div className={`ap-kpi${tone ? ` ap-kpi-${tone}` : ''}`}>
      <div className="ap-kpi-h"><span className="ap-kpi-l">{label}</span>{icon && <span className="ap-kpi-ic">{icon}</span>}</div>
      <div className={`ap-kpi-v${mono ? ' mono' : ''}`}>{value}</div>
      {sub && <div className="ap-kpi-s">{sub}</div>}
      {bar !== undefined && <div className="ap-kpi-bar"><i style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} /></div>}
    </div>
  );
}
