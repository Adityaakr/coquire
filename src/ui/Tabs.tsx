import type { CSSProperties } from 'react';

type Item<T extends string> = T | { id: T; label: string };

export function Tabs<T extends string>({ items, active, onChange, block, style }: { items: Item<T>[]; active: T; onChange: (id: T) => void; block?: boolean; style?: CSSProperties }) {
  return (
    <div className="t-tabs" role="tablist" style={{ display: block ? 'flex' : 'inline-flex', width: block ? '100%' : undefined, ...style }}>
      {items.map((it) => {
        const o = typeof it === 'string' ? { id: it, label: it } : it;
        const on = active === o.id;
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} data-on={on ? 'true' : undefined} className="t-tab" style={{ flex: block ? 1 : undefined }} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
