import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { Button, TokenIcon } from '@/ui';
import { api } from '@/api/client';
import { useStore } from '@/store/store';
import { associateUsdc, USDC_TOKEN_ID } from '@/lib/hedera';
import { teamBudget } from '@/domain/selectors';
import { Money } from './kit';

interface WalletInfo { agent: { account: string; evmAddress: string; hbar: number; usdc: number | null; associated: boolean; maxAuto: number } | null; fundingEnabled: boolean; supplierUsdc: number; supplierHbar: number; supplierAccount: string | null; supplierEvm: string | null; createCostHbar: number; fundUsdc: number; usdcToken: string; hashscan: string | null }
interface FundResult { accountId: string; txs: { label: string; id: string; url: string }[]; agent: WalletInfo['agent']; supplierUsdc: number; hashscan: string }

export function WalletPage() {
  const { me, agentAddress, ownerAddress, notify, state, myTeam } = useStore();
  const [w, setW] = useState<WalletInfo | null>(null);
  const [busy, setBusy] = useState<'fund' | 'assoc' | null>(null);
  const [txs, setTxs] = useState<FundResult['txs']>([]);
  const refresh = () => api.get<WalletInfo>('/api/wallet').then(setW).catch(() => setW(null));
  useEffect(() => { void refresh(); }, []);
  const live = !!me?.facilitator.live;
  const a = w?.agent ?? null;
  const usdc = a?.usdc ?? 0;
  const ready = !!a && (a.associated || a.maxAuto !== 0) && usdc > 0;
  const treasuryLow = !!w?.fundingEnabled && !a && (w.supplierHbar ?? 0) < (w.createCostHbar ?? 1);
  const committed = myTeam ? state.orders.filter((o) => o.teams.some((t) => t.teamId === myTeam.id) && o.status === 'active').reduce((acc, o) => acc + teamBudget(state, o, myTeam.id).remaining, 0n) : 0n;

  const fund = async () => {
    setBusy('fund');
    try {
      const r = await api.post<FundResult>('/api/wallet/fund');
      setTxs((t) => [...r.txs, ...t]);
      notify('ok', r.txs.length ? `Agent account ${r.accountId} funded` : `Agent account ${r.accountId} already exists`, r.txs.map((t) => t.label).join(' · ') || (r.supplierUsdc <= 0 ? 'The supplier account has no USDC left to send.' : undefined));
      await refresh();
    } catch (e) { notify('danger', 'Funding failed', (e as Error).message); } finally { setBusy(null); }
  };

  return (
    <>
      <h1 className="px-h1">Wallet</h1>
      <p className="px-lead">Your agent key holds the account that pays per call. Your sign-in account only signs permissions.</p>
      <div className="px-cols">
        <div>
          <div className="px-label">Balance</div>
          <div className="px-balance">
            <div className="px-amount">{usdc.toFixed(2)}<small><TokenIcon token="USDC" size={18} />USDC</small></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button size="lg" variant="secondary" onClick={() => void refresh()}><RefreshCw size={15} strokeWidth={1.8} />Refresh</Button>
              {w?.fundingEnabled && <Button size="lg" className="px-btn-primary" loading={busy === 'fund'} disabled={treasuryLow} onClick={fund}><Zap size={15} strokeWidth={1.8} />{a ? 'Top up from supplier' : 'Create and fund agent'}</Button>}
            </div>
          </div>
          <div className="px-note"><span className="px-pill"><span className="ap-dot" data-on={live ? 'true' : 'sim'} />Hedera testnet</span><span>{a ? `${a.hbar.toFixed(2)} HBAR on ${a.account}` : 'No agent account yet'}{live ? '. Per-call fees are sponsored by the facilitator.' : '. Settlement is simulated on this server.'}</span></div>
          {treasuryLow && w && (
            <div className="px-callout" data-tone="warn">
              <div className="px-callout-t">Supplier treasury needs HBAR</div>
              <div>It holds <span className="mono">{w.supplierHbar.toFixed(2)} HBAR</span>; creating your agent account costs about <span className="mono">{w.createCostHbar} HBAR</span>. Send testnet HBAR to <span className="mono">{w.supplierAccount}</span>{w.supplierEvm ? <> (EVM <span className="mono">{w.supplierEvm}</span>)</> : null}, then refresh.</div>
            </div>
          )}
          <div className="px-hr" />
          <div className="px-label">Agent account</div>
          <div className="px-list">
            <div className="px-row"><div><div className="px-row-t">Agent address</div><div className="px-row-s"><span className="mono">{agentAddress}</span></div></div><div className="px-row-r"><Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(agentAddress); notify('ok', 'Copied'); }}><Copy size={14} /></Button></div></div>
            <div className="px-row"><div><div className="px-row-t">Hedera account id</div><div className="px-row-s"><span className="mono">{a?.account ?? 'not created yet'}</span></div></div><div className="px-row-r">{w?.hashscan && <a href={w.hashscan} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>HashScan <ExternalLink size={13} /></a>}</div></div>
            <div className="px-row"><div><div className="px-row-t">USDC association</div><div className="px-row-s">{a ? (a.associated ? 'associated' : a.maxAuto !== 0 ? 'automatic on first transfer' : 'not associated') : '—'}</div></div><div className="px-row-r">{a && !a.associated && a.maxAuto === 0 && <Button size="sm" variant="secondary" loading={busy === 'assoc'} onClick={async () => { setBusy('assoc'); try { const tx = await associateUsdc(a.account); notify('ok', 'USDC associated', tx); await new Promise((r) => setTimeout(r, 3500)); await refresh(); } catch (e) { notify('danger', 'Association failed', (e as Error).message); } finally { setBusy(null); } }}>Associate {USDC_TOKEN_ID}</Button>}</div></div>
            <div className="px-row"><div><div className="px-row-t">Sign-in account</div><div className="px-row-s"><span className="mono">{ownerAddress}</span></div></div><div className="px-row-r">signs permissions</div></div>
            <div className="px-row"><div><div className="px-row-t">Committed on active orders</div><div className="px-row-s">remaining allowance your agent may still spend</div></div><div className="px-row-r"><span className="mono"><Money value={committed} /></span></div></div>
          </div>
          {txs.length > 0 && (
            <>
              <div className="px-hr" />
              <div className="px-label">Transactions on Hedera</div>
              <div className="px-list">
                {txs.map((t) => (
                  <a key={t.id} href={t.url} target="_blank" rel="noreferrer" className="px-row"><div><div className="px-row-t">{t.label}</div><div className="px-row-s"><span className="mono">{t.id}</span></div></div><div className="px-row-r">HashScan <ExternalLink size={13} /></div></a>
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <div className="px-label">Fund the agent</div>
          <div className="px-steps">
            {[
              { t: 'Agent account on Hedera', s: a ? `${a.account}, ${a.hbar.toFixed(2)} HBAR` : 'Created on chain by the supplier account, with a small HBAR float and automatic token associations.', done: !!a },
              { t: 'USDC on the agent', s: a && usdc > 0 ? `${usdc.toFixed(2)} USDC` : w?.fundingEnabled ? `${w.fundUsdc} USDC sent from the supplier's balance (${(w.supplierUsdc ?? 0).toFixed(2)} USDC available).` : 'Send testnet USDC to the agent address.', done: usdc > 0 },
              { t: 'Ready to pay per call', s: 'The x402 facilitator sponsors the network fee. Each settled call gets a HashScan receipt.', done: ready },
            ].map((s) => (
              <div key={s.t} className="px-step" data-done={s.done}><span className="px-step-ic">{s.done && <Check size={14} strokeWidth={3} />}</span><div><div className="px-step-t">{s.t}</div><div className="px-step-s">{s.s}</div></div></div>
            ))}
          </div>
          <p className="px-promo-d" style={{ marginTop: 14 }}>Interoperability: this account is an ordinary Hedera account. Any x402 client can pay the supplier from it, and any explorer can audit it. Faucets if you prefer to fund it yourself: <a href="https://portal.hedera.com/faucet" target="_blank" rel="noreferrer">HBAR</a>, <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">USDC</a>.</p>
        </div>
      </div>
    </>
  );
}
