import { useEffect, useRef, type ReactNode } from 'react';

export type DialogProps = { open: boolean; onClose?: () => void; title: ReactNode; width?: number; children?: ReactNode; footer?: ReactNode };

export function Dialog({ open, onClose, title, width = 440, children, footer }: DialogProps) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(box.current?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? []).filter((el) => !el.hasAttribute('disabled'));
    const isTop = () => { const all = document.querySelectorAll('.t-dlg'); return all[all.length - 1] === box.current; };
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key === 'Tab') {
        const f = focusable();
        if (f.length === 0) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (focusable().find((el) => !el.classList.contains('t-dlg-x')) ?? focusable()[0])?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; opener?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="t-dlg-ov" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={box} className="t-dlg" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} style={{ width, maxWidth: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, letterSpacing: 'var(--ls-heading)' }}>{title}</span>
          <button type="button" className="t-dlg-x" aria-label="Close" onClick={onClose} />
        </div>
        <div>{children}</div>
        {footer ? <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>{footer}</div> : null}
      </div>
    </div>
  );
}
