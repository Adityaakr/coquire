import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, LayoutGrid, Plus, Search, Settings } from 'lucide-react';
import './app.css';
import { Badge, Bento, Button, Tabs, Toast } from '@/ui';
import { useStore } from '@/store/store';
import { useWallet } from '@/contexts/WalletContext';
import { HEDERA_TESTNET } from '@/config/hedera';
import { Wordmark } from '@/landing/Nav';
import { shortAddr } from './kit';
import type { Role } from '@/domain/types';

const TITLES: Record<string, string> = { '/app': 'Overview', '/app/orders/new': 'New order', '/app/discover': 'Open orders', '/app/settings': 'Settings', '/app/onboard': 'Set up' };
const titleFor = (path: string) => TITLES[path] ?? (path.startsWith('/app/orders/') ? 'Order' : 'Coquire');

function NetworkCard() {
  const { me, ownerAddress, usingWallet } = useStore();
  const live = me?.facilitator.live;
  return (
    <Bento variant="app" pad={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-1)', fontWeight: 500 }}>
        {HEDERA_TESTNET.name}
        <Badge size="sm" tone={live ? 'ok' : 'warn'} style={{ marginLeft: 'auto' }}>{live ? 'x402 live' : 'settlement simulated'}</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', marginTop: 10 }}>
        <span>{usingWallet ? 'wallet' : 'browser key'} {ownerAddress ? shortAddr(ownerAddress) : '—'}</span>
        <span>arkiv {me?.arkiv.live ? 'rabdi testnet' : 'local index'} · ccip {me?.ccip.simulated ? 'simulated' : 'sepolia → hedera'}</span>
      </div>
    </Bento>
  );
}

function useNav() {
  const { role } = useStore();
  const base = [
    { to: '/app', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/app/orders/new', label: 'New order', icon: Plus },
    { to: '/app/discover', label: 'Open orders', icon: Search },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ];
  return role === 'supplier' ? base.filter((n) => n.to !== '/app/orders/new') : base;
}

function Sidebar() {
  const nav = useNav();
  return (
    <aside className="ap-side">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', marginBottom: 28 }}>
        <Wordmark size={22} />
        <Badge size="sm" mono>testnet</Badge>
      </div>
      <nav aria-label="App" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="ap-nav"><Icon size={17} strokeWidth={1.5} />{label}</NavLink>
        ))}
      </nav>
      <div className="eyebrow" style={{ fontSize: 12.5, margin: '24px 13px 8px' }}>Resources</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Link className="ap-nav" to="/docs"><BookOpen size={17} strokeWidth={1.5} />Docs</Link>
        <Link className="ap-nav" to="/"><ArrowLeft size={17} strokeWidth={1.5} />Back to site</Link>
      </div>
      <div style={{ marginTop: 'auto' }}><NetworkCard /></div>
    </aside>
  );
}

function TopBar() {
  const { pathname } = useLocation();
  const { me, role, setRole, ownerAddress, usingWallet, myTeam, mySupplier, signOut } = useStore();
  const { isCorrectNetwork } = useWallet();
  const who = role === 'supplier' ? mySupplier?.name : myTeam?.name;
  return (
    <div className="ap-top">
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, letterSpacing: 'var(--ls-heading)', lineHeight: 1.2 }}>{titleFor(pathname)}</div>
      </div>
      {me?.account && (
        <span className="ap-pill ap-rate" style={{ marginLeft: 'auto' }}>
          {who ?? 'Set up'} · <span style={{ color: 'var(--fx-indigo)', fontWeight: 600 }}>1 call = 1 page</span>
        </span>
      )}
      {me?.account && <Tabs<Role> items={[{ id: 'buyer', label: 'Buyer' }, { id: 'supplier', label: 'Supplier' }]} active={role} onChange={(r) => void setRole(r)} />}
      {ownerAddress && (
        <button type="button" onClick={() => { if (window.confirm('Sign out of Coquire?')) void signOut(); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label="Account">
          <Badge tone={usingWallet ? (isCorrectNetwork ? 'accent' : 'warn') : 'neutral'} mono>{usingWallet ? (isCorrectNetwork ? shortAddr(ownerAddress) : 'wrong network') : `browser · ${shortAddr(ownerAddress)}`}</Badge>
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
    </nav>
  );
}

function SignIn() {
  const { signIn, busy, notify } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const go = async (mode: 'wallet' | 'browser') => {
    setErr(null);
    try { await signIn(mode); } catch (e) { setErr((e as Error).message); notify('danger', 'Sign-in failed', (e as Error).message); }
  };
  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum;
  return (
    <div style={{ maxWidth: 560, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div className="eyebrow">Sign in</div>
        <h1 style={{ fontSize: 32, marginTop: 8 }}>One signature registers your agent key</h1>
        <p style={{ color: 'var(--text-2)', marginTop: 8, fontSize: 15, lineHeight: 1.55 }}>Your account signs a sign-in message that binds a local agent key to it. The agent key signs each per-call payment and receives sealed results, so your wallet is never prompted per call.</p>
      </div>
      <Bento variant="app" pad={24}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button size="xl" block loading={!!busy.signIn} disabled={!hasMetaMask} onClick={() => go('wallet')}>{hasMetaMask ? 'Sign in with MetaMask (Hedera testnet)' : 'MetaMask not detected'}</Button>
          <Button size="xl" block variant="secondary" loading={!!busy.signIn} onClick={() => go('browser')}>Use a browser key</Button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 14 }}>
          A browser key is a real secp256k1 key stored in this browser. It signs the same messages a wallet would. Use it on a second device or profile to act as the other team.
        </p>
        {err && <p role="alert" style={{ fontSize: 13, color: 'var(--danger)', marginTop: 8 }}>{err}</p>}
      </Bento>
    </div>
  );
}

export function AppLayout() {
  const { pathname, search } = useLocation();
  const { ready, signedIn, me, toasts, dismiss } = useStore();
  const { isConnected, isCorrectNetwork } = useWallet();
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
        {isConnected && !isCorrectNetwork && (
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
