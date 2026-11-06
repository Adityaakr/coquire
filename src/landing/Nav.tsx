import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BtnIcon } from './fx';
import { CoquireMark } from './Mark';

export { CoquireMark } from './Mark';

export function Wordmark({ size = 24, href = '/', light }: { size?: number; href?: string; light?: boolean }) {
  return (
    <Link to={href} aria-label="Coquire home" className="fx-wordmark" style={{ fontSize: size, color: light ? '#fff' : undefined }}>
      <CoquireMark size={Math.round(size * 1.33)} light={light} />
      coquire
    </Link>
  );
}

const LINKS = [['/#how-it-works', 'How it works'], ['/product', 'Product'], ['/use-cases', 'Use cases'], ['/docs', 'Docs']] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fx-nav-wrap">
      <div className="fx-nav">
        <div className="fx-nav-in">
          <div className="fx-nav-left"><Wordmark /></div>
          <nav className="fx-nav-menu" aria-label="Primary">
            {LINKS.map(([href, label]) => href.startsWith('/#')
              ? <a key={href} className="fx-navlink" href={href}>{label}</a>
              : <NavLink key={href} className="fx-navlink" to={href}>{label}</NavLink>)}
          </nav>
          <div className="fx-nav-right">
            <BtnIcon variant="nav" to="/app">Explore the demo</BtnIcon>
            <button type="button" className="fx-nav-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)} />
          </div>
        </div>
        {open && (
          <div className="fx-nav-drop" role="menu">
            {LINKS.map(([href, label]) => href.startsWith('/#')
              ? <a key={href} className="fx-navlink" href={href} role="menuitem" onClick={() => setOpen(false)}>{label}</a>
              : <NavLink key={href} className="fx-navlink" to={href} role="menuitem" onClick={() => setOpen(false)}>{label}</NavLink>)}
          </div>
        )}
      </div>
    </div>
  );
}
