import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BookOpen, LayoutGrid, LogOut, Plus, Search, Settings, ShoppingBag, Store } from 'lucide-react';
import './app.css';
import { Badge, Bento, Button, Tabs, Toast } from '@/ui';
import { useStore } from '@/store/store';
import { useWallet } from '@/contexts/WalletContext';
import { hasMetaMask } from '@/lib/wallet';
import { HEDERA_TESTNET } from '@/config/hedera';
import { CoquireMark, Wordmark } from '@/landing/Nav';
import { orderStatus } from '@/domain/selectors';
import { avatarColor, shortAddr } from './kit';
import type { Role } from '@/domain/types';

const TITLES: Record<string, [string, string]> = {
  '/app': ['Overview', 'Orders, budgets and what to do next'],
  '/app/orders/new': ['New order', 'Describe the workload and commit your pages'],
  '/app/discover': ['Open orders', 'Funded group orders any supplier can quote'],
  '/app/settings': ['Settings', 'Account, keys and what is live'],
  '/app/onboard': ['Set up', 'One account, two modes'],
};
const titleFor = (path: string): [string, string] => TITLES[path] ?? (path.startsWith('/app/orders/') ? ['Order', 'Group, quotes and execution'] : ['Coquire', '']);

function Workspace() {
  const { role, myTeam, mySupplier, ownerAddress } = useStore();
  const name = role === 'supplier' ? mySupplier?.name ?? 'Supplier' : myTeam?.name ?? 'Team';
  return (
    <div className="ap-ws" title={ownerAddress ?? ''}>
      <span className="ap-ws-av" style={{ background: avatarColor(ownerAddress ?? name) }}>{name[0]?.toUpperCase()}</span>
      <div style={{ minWidth: 0 }}>
        <div className="ap-ws-t">{name}</div>
        <div className="ap-ws-s">{role === 'supplier' ? 'Supplier workspace' : 'Buyer workspace'} · {ownerAddress ? shortAddr(ownerAddress) : '—'}</div>
      </div>
    </div>
  );
}

function StatusCard() {
  const { me, usingWallet } = useStore();
  return (
    <div className="ap-status">
      <div className="ap-status-row"><span className="ap-dot" data-on="true" /><b>{HEDERA_TESTNET.name}</b><span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{usingWallet ? 'wallet' : 'browser key'}</span></div>
      <div className="ap-status-row"><span className="ap-dot" data-on={me?.facilitator.live ? 'true' : 'sim'} />x402 settlement<span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)' }}>{me?.facilitator.live ? 'live' : 'simulated'}</span></div>
      <div className="ap-status-row"><span className="ap-dot" data-on={me?.arkiv.live ? 'true' : 'sim'} />Arkiv index<span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)' }}>{me?.arkiv.live ? 'Rabdi' : 'local'}</span></div>
      <div className="ap-status-row"><span className="ap-dot" data-on={me?.ccip.simulated ? 'sim' : 'true'} />CCIP approval<span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)' }}>{me?.ccip.simulated ? 'simulated' : 'live'}</span></div>
    </div>
  );
}

function useNav() {
  const { role, state, myTeam, mySupplier } = useStore();
  const mine = state.orders.filter((o) => (role === 'supplier' ? o.quotes.some((q) => q.supplierId === mySupplier?.id) : o.teams.some((t) => t.teamId === myTeam?.id)));
  const open = state.orders.filter((o) => o.status === 'open' && orderStatus(o) !== 'expired').length;
  const items = [
    { to: '/app', label: 'Overview', icon: LayoutGrid, end: true, count: mine.filter((o) => o.status === 'active').length || undefined },
    ...(role === 'buyer' ? [{ to: '/app/orders/new', label: 'New order', icon: Plus }] : []),
    { to: '/app/discover', label: 'Open orders', icon: role === 'supplier' ? Store : ShoppingBag, count: open || undefined },
  ];
  return items;
}

function Sidebar() {
  const nav = useNav();
  return (
    <aside className="ap-side">
      <div className="ap-brand">
        <Wordmark size={22} />
        <Badge size="sm" mono>testnet</Badge>
      </div>
      <Workspace />
      <div className="ap-group">Workspace</div>
      <nav aria-label="App" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {nav.map(({ to, label, icon: Icon, end, count }) => (
          <NavLink key={to} to={to} end={end} className="ap-nav"><Icon size={17} strokeWidth={1.6} />{label}{count ? <span className="ap-nav-count">{count}</span> : null}</NavLink>
        ))}
      </nav>
      <div className="ap-group">Account</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <NavLink className="ap-nav" to="/app/settings"><Settings size={17} strokeWidth={1.6} />Settings</NavLink>
        <Link className="ap-nav" to="/docs"><BookOpen size={17} strokeWidth={1.6} />Developer docs</Link>
        <Link className="ap-nav" to="/"><ArrowLeft size={17} strokeWidth={1.6} />Back to site</Link>
      </div>
      <div style={{ marginTop: 'auto' }}><StatusCard /></div>
    </aside>
  );
}

function SearchBox() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus(); setOpen(true); } if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  const hits = useMemo(() => state.orders.filter((o) => o.title.toLowerCase().includes(q.toLowerCase())).slice(0, 6), [state.orders, q]);
  return (
    <div className="ap-search" style={{ position: 'relative' }}>
      <Search size={15} strokeWidth={1.6} />
      <input ref={ref} value={q} placeholder="Search orders" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) { nav(`/app/orders/${hits[0].id}`); setOpen(false); setQ(''); } }} />
      <kbd>⌘K</kbd>
      {open && q && (
        <div className="ap-search-pop">
          {hits.length === 0 ? <div style={{ padding: '9px 10px', fontSize: 13, color: 'var(--text-3)' }}>No orders match</div> : hits.map((o) => (
            <Link key={o.id} to={`/app/orders/${o.id}`} className="ap-search-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); setQ(''); }}>
              <span>{o.title}</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-3)' }}>{orderStatus(o)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const { pathname } = useLocation();
  const { me, role, setRole, ownerAddress, usingWallet, state, signOut, myTeam, mySupplier } = useStore();
  const { isCorrectNetwork } = useWallet();
  const [t, sub] = titleFor(pathname);
  const recent = state.events.filter((e) => Date.now() - e.ts < 3_600_000).length;
  const name = role === 'supplier' ? mySupplier?.name : myTeam?.name;
  return (
    <div className="ap-top">
      <div className="ap-top-title">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, letterSpacing: 'var(--ls-heading)', lineHeight: 1.2 }}>{t}</div>
        {sub && <div className="ap-top-sub">{sub}</div>}
      </div>
      {me?.account && <SearchBox />}
      {me?.account && <Tabs<Role> items={[{ id: 'buyer', label: 'Buyer' }, { id: 'supplier', label: 'Supplier' }]} active={role} onChange={(r) => void setRole(r)} />}
      {me?.account && (
        <Link to="/app" className="ap-ibtn" aria-label="Activity" title={`${recent} events in the last hour`}>
          <Bell size={16} strokeWidth={1.6} />
          {recent > 0 && <span className="ap-badge">{recent > 9 ? '9+' : recent}</span>}
        </Link>
      )}
      {ownerAddress && (
        <button type="button" className="ap-acct" style={{ width: 'auto', padding: '5px 10px 5px 6px', borderRadius: 99, gap: 8 }} onClick={() => { if (window.confirm('Sign out of Coquire?')) void signOut(); }} aria-label="Account">
          <span className="ap-avatar" style={{ background: avatarColor(ownerAddress) }}>{(name ?? 'C')[0]?.toUpperCase()}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: usingWallet && !isCorrectNetwork ? 'var(--warn)' : 'var(--text-1)' }}>{usingWallet && !isCorrectNetwork ? 'wrong network' : shortAddr(ownerAddress)}</span>
          <LogOut size={13} strokeWidth={1.6} style={{ color: 'var(--text-3)' }} />
        </button>
      )}
    </div>
  );
}

function MobileBar() {
  const nav = useNav();
  return (
    <nav className="ap-mobile-bar" aria-label="App">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="ap-nav" style={{ flex: 1 }}><Icon size={18} strokeWidth={1.5} />{label}</NavLink>
      ))}
      <NavLink className="ap-nav" to="/app/settings" style={{ flex: 1 }}><Settings size={18} strokeWidth={1.5} />Settings</NavLink>
    </nav>
  );
}

function SignIn() {
  const { signIn, busy, notify } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const [mm, setMm] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMm(hasMetaMask()), 200); return () => clearTimeout(t); }, []);
  const go = async (mode: 'wallet' | 'browser') => {
    setErr(null);
    try { await signIn(mode); } catch (e) { const m = (e as Error).message; setErr(m); notify('danger', 'Sign-in failed', m); }
  };
  return (
    <div style={{ maxWidth: 400, margin: '56px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
      <CoquireMark size={48} />
      <div>
        <h1 style={{ fontSize: 24 }}>Sign in to Coquire</h1>
        <p style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 13.5 }}>One signature. Your agent key does the rest.</p>
      </div>
      <Bento variant="app" pad={14} style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button size="lg" block loading={!!busy.signIn} disabled={!mm} onClick={() => go('wallet')}>{mm ? 'Continue with MetaMask' : 'MetaMask not detected'}</Button>
          <Button size="lg" block variant="secondary" loading={!!busy.signIn} onClick={() => go('browser')}>Continue with a browser key</Button>
        </div>
      </Bento>
      <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, maxWidth: 320 }}>Hedera testnet. A browser key is a real key kept in this browser; use it on a second profile to act as the other team.</p>
      {err && <p role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>{err}</p>}
    </div>
  );
}

export function AppLayout() {
  const { pathname, search } = useLocation();
  const { ready, signedIn, me, toasts, dismiss, usingWallet } = useStore();
  const { isCorrectNetwork } = useWallet();
  useEffect(() => { document.title = `${titleFor(pathname)[0]} · Coquire`; }, [pathname]);

  const onboarded = !!(me?.account?.teamName || me?.account?.supplierName);
  const onboarding = pathname === '/app/onboard';
  if (ready && signedIn && !onboarded && !onboarding) return <Navigate to={`/app/onboard${search}`} replace />;
  if (ready && signedIn && onboarded && onboarding) return <Navigate to="/app" replace />;

  return (
    <div className="ap-root">
      {signedIn && onboarded && <Sidebar />}
      <main className="ap-main">
        <TopBar />
        {usingWallet && !isCorrectNetwork && (
          <div style={{ padding: '8px 30px', fontSize: 13, color: '#7A4B00', background: '#FFF7E6', borderBottom: '1px solid #F5D9A8' }}>
            Your wallet is on another network. Switch to {HEDERA_TESTNET.name} (chain {HEDERA_TESTNET.chainId}) to sign with it.
          </div>
        )}
        <div className="ap-body" key={signedIn ? pathname : 'signin'}>
          {!ready ? <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Connecting…</p> : !signedIn ? <SignIn /> : <Outlet />}
        </div>
      </main>
      {signedIn && onboarded && <MobileBar />}
      <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 120, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map((t) => <Toast key={t.id} tone={t.tone} title={t.title} detail={t.detail} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </div>
  );
}
