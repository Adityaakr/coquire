import { useState, type CSSProperties } from 'react';
import usdc from '@/assets/tokens/usdc.png';

export type TokenSymbol = 'USDC' | 'HBAR';

const META: Record<TokenSymbol, { letter: string; color: string; src?: string }> = {
  USDC: { letter: 'C', color: '--tok-usdc', src: usdc },
  HBAR: { letter: 'H', color: '--fx-jet' },
};

export function TokenIcon({ token = 'USDC', size = 28, style }: { token?: TokenSymbol; size?: number; style?: CSSProperties }) {
  const m = META[token];
  const [err, setErr] = useState(false);
  const c = `var(${m.color})`;
  const mark = m.src && !err ? (
    <img src={m.src} alt="" width={size} height={size} onError={() => setErr(true)} style={{ width: size, height: size, minWidth: size, borderRadius: '50%', display: 'block' }} />
  ) : (
    <span style={{ width: size, height: size, minWidth: size, borderRadius: 99, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: size * 0.44, color: c, background: `color-mix(in srgb,${c} 16%,transparent)`, border: `1px solid color-mix(in srgb,${c} 45%,transparent)` }}>
      {m.letter}
    </span>
  );
  return (
    <span role="img" aria-label={token} style={{ position: 'relative', display: 'inline-flex', width: size, height: size, minWidth: size, verticalAlign: 'middle', ...style }}>
      {mark}
    </span>
  );
}

export function TokenBadge({ token = 'USDC', size = 28, showName = true, sub, style }: { token?: TokenSymbol; size?: number; showName?: boolean; sub?: string; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, ...style }}>
      <TokenIcon token={token} size={size} />
      {showName ? (
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.25 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: Math.max(12, size * 0.5) }}>{token}</span>
          {sub ? <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{sub}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
