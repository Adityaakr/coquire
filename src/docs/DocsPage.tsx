import { useEffect } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import '@/landing/landing.css';
import { LandingNav } from '@/landing/Nav';
import { Footer } from '@/landing/Closing';
import { Container } from '@/landing/fx';
import { DOCS, type Block } from './content';

function Render({ b }: { b: Block }) {
  switch (b.t) {
    case 'p': return <p className="fx-sm" style={{ lineHeight: 1.6, color: 'var(--text-2)' }}>{b.text}</p>;
    case 'h2': return <h2 className="fx-h5" style={{ marginTop: 18 }}>{b.text}</h2>;
    case 'h3': return <h3 className="fx-hsm" style={{ marginTop: 12 }}>{b.text}</h3>;
    case 'ul': return <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>{b.items.map((i) => <li key={i} className="fx-sm" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{i}</li>)}</ul>;
    case 'code': return <pre style={{ margin: 0, background: 'var(--fx-jet)', color: '#EDF1F4', borderRadius: 16, padding: '16px 18px', fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.6, overflowX: 'auto' }}><code>{b.code}</code></pre>;
    case 'note': return <div style={{ border: '1px dashed var(--accent-line)', background: 'var(--accent-soft)', borderRadius: 14, padding: '12px 14px', fontSize: 13.5, color: 'var(--fx-indigo)', lineHeight: 1.55 }}>{b.text}</div>;
    case 'table': return (
      <div style={{ overflowX: 'auto', border: '1px solid var(--fx-mist)', borderRadius: 16 }}>
        <table style={{ width: '100%', minWidth: 520, fontSize: 13.5 }}>
          <thead><tr>{b.head.map((h) => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', background: 'var(--fx-lgb)', color: 'var(--text-2)', fontWeight: 500 }}>{h}</th>)}</tr></thead>
          <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '10px 14px', borderTop: '1px solid var(--fx-mist)', fontFamily: j > 0 && /^[\d.]+$/.test(c) ? 'var(--font-mono)' : undefined }}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
}

export function DocsPage() {
  const { slug } = useParams();
  const page = DOCS.find((d) => d.slug === (slug ?? 'overview')) ?? DOCS[0];
  useEffect(() => { document.title = `${page.title} · Coquire docs`; window.scrollTo(0, 0); }, [page]);
  return (
    <div style={{ background: '#fff', overflow: 'clip' }}>
      <LandingNav />
      <main style={{ paddingTop: 140, paddingBottom: 120 }}>
        <Container>
          <div className="fx-split" style={{ gap: 50 }}>
            <aside className="fx-split-narrow" style={{ flex: '0 0 260px' }}>
              <div className="fx-pretitle" style={{ marginBottom: 18 }}>Developer docs</div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {DOCS.map((d) => (
                  <NavLink key={d.slug} to={`/docs/${d.slug}`} className="fx-navlink" style={({ isActive }) => ({ justifyContent: 'flex-start', fontWeight: isActive ? 600 : 500, background: isActive ? 'var(--fx-lgb)' : undefined })}>{d.title}</NavLink>
                ))}
              </nav>
              <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Source of truth: the code under <span className="mono">src/domain</span>. Pages here cite it.
              </div>
            </aside>
            <article style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
              <div>
                <h1 className="fx-h3">{page.title}</h1>
                <p className="fx-body" style={{ marginTop: 8 }}>{page.summary}</p>
              </div>
              {page.blocks.map((b, i) => <Render key={i} b={b} />)}
              <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {DOCS.map((d, i) => (d.slug === page.slug && DOCS[i + 1] ? <Link key={d.slug} to={`/docs/${DOCS[i + 1].slug}`} className="fx-btn fx-btn-mist" style={{ padding: '12px 24px', fontSize: 15 }}>Next: {DOCS[i + 1].title}</Link> : null))}
              </div>
            </article>
          </div>
        </Container>
      </main>
      <Footer current="/docs" />
    </div>
  );
}
