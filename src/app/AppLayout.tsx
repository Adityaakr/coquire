import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftRight, BookOpen, ChevronDown, Home, Settings, Store, Wallet } from 'lucide-react';
import './app.css';
import { Bento, Button, Toast } from '@/ui';
import { useStore } from '@/store/store';
import { useWallet } from '@/contexts/WalletContext';
import { HEDERA_TESTNET } from '@/config/hedera';
import { CoquireMark } from '@/landing/Nav';
import { hasMetaMask } from '@/lib/wallet';
import { shortAddr } from './kit';

const TITLES: Record<string, string> = { '/app': 'Home', '/app/orders/new': 'New order', '/app/discover': 'Market', '/app/wallet': 'Wallet', '/app/settings': 'Settings', '/app/onboard': 'Set up' };
const titleFor = (path: string) => TITLES[path] ?? (path.startsWith('/app/orders/') ? 'Order' : 'Coquire');

function Sidebar() {
  const { role, setRole } = useStore();
  const buyer = role === 'buyer';
  return (
    <aside className="ap-side">
      <Link to="/" className="px-brand"><CoquireMark size={28} />Coquire</Link>
      <div className="px-group">{buyer ? 'Buy' : 'Supply'}</div>
      <nav aria-label="App" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavLink to="/app" end className="px-nav"><Home size={18} strokeWidth={1.7} />Home</NavLink>
        <NavLink to="/app/discover" className="px-nav"><Store size={18} strokeWidth={1.7} />Market</NavLink>
        <NavLink to="/app/wallet" className="px-nav"><Wallet size={18} strokeWidth={1.7} />Wallet</NavLink>
      </nav>
      <div className="px-bottom">
        <Link to="/docs" className="px-nav"><BookOpen size={17} strokeWidth={1.7} />Docs</Link>
        <button type="button" className="px-nav" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'var(--font-body)' }} onClick={() => void setRole(buyer ? 'supplier' : 'buyer')}><ArrowLeftRight size={17} strokeWidth={1.7} />Switch to {buyer ? 'supplying' : 'buying'}</button>
        <NavLink to="/app/settings" className="px-nav"><Settings size={17} strokeWidth={1.7} />Settings</NavLink>
      </div>
    </aside>
  );
}

function TopBar() {
  const { pathname } = useLocation();
  const { me, ownerAddress, usingWallet, signOut, myTeam, mySupplier, role, signedIn } = useStore();
  const { isCorrectNetwork } = useWallet();
  const name = (role === 'supplier' ? mySupplier?.name : myTeam?.name) ?? 'C';
  return (
    <div className="ap-top">
      {signedIn ? <div className="px-title">{titleFor(pathname)}</div> : <Link to="/" className="px-brand" style={{ padding: 0 }}><CoquireMark size={28} />Coquire</Link>}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {me?.account && <span className="px-pill"><span className="ap-dot" data-on={me.facilitator.live ? 'true' : 'sim'} />{HEDERA_TESTNET.name}{usingWallet && !isCorrectNetwork ? ' · wrong network' : ''}</span>}
        {ownerAddress && (
          <button type="button" className="px-acct" onClick={() => { if (window.confirm('Sign out of Coquire?')) void signOut(); }} aria-label="Account">
            <span className="ap-avatar">{name[0]?.toUpperCase()}</span>
            {shortAddr(ownerAddress)}
            <ChevronDown size={14} strokeWidth={1.7} style={{ color: 'var(--text-3)' }} />
          </button>
        )}
      </div>
    </div>
  );
}

function MobileBar() {
  return (
    <nav className="ap-mobile-bar" aria-label="App">
      <NavLink to="/app" end className="ap-nav" style={{ flex: 1 }}><Home size={18} strokeWidth={1.5} />Home</NavLink>
      <NavLink to="/app/discover" className="ap-nav" style={{ flex: 1 }}><Store size={18} strokeWidth={1.5} />Market</NavLink>
      <NavLink to="/app/wallet" className="ap-nav" style={{ flex: 1 }}><Wallet size={18} strokeWidth={1.5} />Wallet</NavLink>
      <NavLink to="/app/settings" className="ap-nav" style={{ flex: 1 }}><Settings size={18} strokeWidth={1.5} />Settings</NavLink>
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
  const { ready, signedIn, me, toasts, dismiss } = useStore();
  useEffect(() => { document.title = `${titleFor(pathname)} · Coquire`; }, [pathname]);

  const onboarded = !!(me?.account?.teamName || me?.account?.supplierName);
  const onboarding = pathname === '/app/onboard';
  if (ready && signedIn && !onboarded && !onboarding) return <Navigate to={`/app/onboard${search}`} replace />;
  if (ready && signedIn && onboarded && onboarding) return <Navigate to="/app" replace />;

  return (
    <div className="ap-root">
      {signedIn && onboarded && <Sidebar />}
      <main className="ap-main">
        <TopBar />
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
