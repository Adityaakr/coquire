import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { Button, TokenIcon } from '@/ui';
import { useStore } from '@/store/store';
import { agentHederaStatus, associateUsdc, USDC_TOKEN_ID, type AgentHederaStatus } from '@/lib/hedera';
import { teamBudget } from '@/domain/selectors';
import { Money } from './kit';

export function WalletPage() {
  const { me, agentAddress, ownerAddress, notify, state, myTeam } = useStore();
  const [st, setSt] = useState<AgentHederaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => agentHederaStatus().then(setSt).catch(() => setSt(null));
  useEffect(() => { void refresh(); }, []);
  const live = !!me?.facilitator.live;
  const usdc = st?.usdc ?? 0;
  const committed = myTeam ? state.orders.filter((o) => o.teams.some((t) => t.teamId === myTeam.id) && o.status === 'active').reduce((a, o) => a + teamBudget(state, o, myTeam.id).remaining, 0n) : 0n;
  const steps = [
    { t: 'Create the agent account', s: 'Send testnet HBAR to the agent address. Hedera creates the account automatically.', done: !!st?.accountId, link: 'https://portal.hedera.com/faucet', label: 'Hedera faucet' },
    { t: 'Associate USDC', s: `Token ${USDC_TOKEN_ID}. One transaction, signed by the agent key.`, done: !!st?.associated, action: true },
    { t: 'Fund with testnet USDC', s: '20 USDC per address every two hours.', done: usdc > 0, link: 'https://faucet.circle.com', label: 'Circle faucet' },
  ];
  return (
    <>
      <h1 className="px-h1">Wallet</h1>
      <p className="px-lead">Your agent key holds the account that pays per call. Your sign-in account only signs permissions.</p>
      <div className="px-cols">
        <div>
          <div className="px-label">Balance</div>
          <div className="px-balance">
            <div className="px-amount">{usdc.toFixed(2)}<small><TokenIcon token="USDC" size={18} />USDC</small></div>
            <Button size="lg" variant="secondary" onClick={() => void refresh()}><RefreshCw size={15} strokeWidth={1.8} />Refresh</Button>
          </div>
          <div className="px-note"><span className="px-pill"><span className="ap-dot" data-on={live ? 'true' : 'sim'} />Hedera testnet</span><span>{st ? `${st.hbar.toFixed(2)} HBAR` : '…'}{live ? '. Per-call fees are sponsored by the facilitator.' : '. Settlement is simulated on this server.'}</span></div>
          <div className="px-hr" />
          <div className="px-label">Agent account</div>
          <div className="px-list">
            <div className="px-row"><div><div className="px-row-t">Agent address</div><div className="px-row-s"><span className="mono">{agentAddress}</span></div></div><div className="px-row-r"><Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(agentAddress); notify('ok', 'Copied'); }}><Copy size={14} /></Button></div></div>
            <div className="px-row"><div><div className="px-row-t">Hedera account id</div><div className="px-row-s"><span className="mono">{st?.accountId ?? 'not created yet'}</span></div></div><div className="px-row-r">{st?.accountId && <a href={`https://hashscan.io/testnet/account/${st.accountId}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>HashScan <ExternalLink size={13} /></a>}</div></div>
            <div className="px-row"><div><div className="px-row-t">Sign-in account</div><div className="px-row-s"><span className="mono">{ownerAddress}</span></div></div><div className="px-row-r">signs permissions</div></div>
            <div className="px-row"><div><div className="px-row-t">Committed on active orders</div><div className="px-row-s">remaining allowance your agent may still spend</div></div><div className="px-row-r"><span className="mono"><Money value={committed} /></span></div></div>
          </div>
        </div>
        <div>
          <div className="px-label">Fund the agent</div>
          <div className="px-steps">
            {steps.map((s) => (
              <div key={s.t} className="px-step" data-done={s.done}>
                <span className="px-step-ic">{s.done && <Check size={14} strokeWidth={3} />}</span>
                <div style={{ flex: 1 }}>
                  <div className="px-step-t">{s.t}</div>
                  <div className="px-step-s">{s.s}</div>
                  {!s.done && (
                    <div style={{ marginTop: 10 }}>
                      {s.action ? (
                        <Button size="sm" disabled={!st?.accountId} loading={busy} onClick={async () => { if (!st?.accountId) return; setBusy(true); try { const tx = await associateUsdc(st.accountId); notify('ok', 'USDC associated', tx); await new Promise((r) => setTimeout(r, 3500)); await refresh(); } catch (e) { notify('danger', 'Association failed', (e as Error).message); } finally { setBusy(false); } }}>Associate USDC</Button>
                      ) : (
                        <Button size="sm" variant="secondary" href={s.link} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={13} /></Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!live && <p className="px-promo-d" style={{ marginTop: 14 }}>This server settles payments in simulation, so funding is optional here. On a live deployment these three steps are required once per team.</p>}
        </div>
      </div>
    </>
  );
}
