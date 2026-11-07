import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentHederaStatus, associateUsdc, USDC_TOKEN_ID, type AgentHederaStatus } from '@/lib/hedera';
import { Badge, Button } from '@/ui';
import { useStore } from '@/store/store';
import { useWallet } from '@/contexts/WalletContext';
import { Row } from './bits';
import { Panel, formatDate, shortAddr } from './kit';

function AgentHederaPanel() {
  const { me, agentAddress, notify } = useStore();
  const [st, setSt] = useState<AgentHederaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => agentHederaStatus().then(setSt).catch(() => setSt(null));
  useEffect(() => { void refresh(); }, []);
  const live = !!me?.facilitator.live;
  return (
    <Panel title="Agent account on Hedera testnet" aside={<Badge size="sm" tone={st?.associated && (st.usdc ?? 0) > 0 ? 'ok' : live ? 'warn' : 'neutral'}>{st?.associated && (st.usdc ?? 0) > 0 ? 'ready to pay' : st?.accountId ? 'needs USDC' : 'not created'}</Badge>}>
      <Row k="Agent address (EVM alias)" v={agentAddress} />
      <Row k="Hedera account" v={st?.accountId ?? 'none yet'} accent={!!st?.accountId} />
      <Row k="HBAR" v={st ? st.hbar.toFixed(2) : '…'} />
      <Row k="USDC" v={st ? (st.associated ? `${(st.usdc ?? 0).toFixed(2)} USDC` : 'not associated') : '…'} />
      <ol style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
        <li>Send testnet HBAR to the agent address from <a href="https://portal.hedera.com/faucet" target="_blank" rel="noreferrer">portal.hedera.com/faucet</a>. That creates the account.</li>
        <li>Associate USDC {USDC_TOKEN_ID} with one click below (signed by the agent key).</li>
        <li>Send 20 testnet USDC to the agent address from <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">faucet.circle.com</a> (Hedera Testnet).</li>
      </ol>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <Button size="md" disabled={!st?.accountId || st.associated} loading={busy} onClick={async () => { if (!st?.accountId) return; setBusy(true); try { const tx = await associateUsdc(st.accountId); notify('ok', 'USDC associated', tx); await new Promise((r) => setTimeout(r, 3500)); await refresh(); } catch (e) { notify('danger', 'Association failed', (e as Error).message); } finally { setBusy(false); } }}>Associate USDC</Button>
        <Button size="md" variant="secondary" onClick={() => void refresh()}>Refresh</Button>
        <Button size="md" variant="ghost" onClick={() => { navigator.clipboard?.writeText(agentAddress); notify('ok', 'Agent address copied'); }}>Copy address</Button>
      </div>
      {!live && <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 10 }}>Settlement is simulated on this server, so this account is optional until a facilitator is configured.</p>}
    </Panel>
  );
}

export function SettingsPage() {
  const { me, ownerAddress, usingWallet, agentAddress, guardAddress, role, setRole, signOut, resetLocalKeys, delegations, network } = useStore();
  const { isConnected, disconnect } = useWallet();
  const navigate = useNavigate();
  const a = me?.account;
  if (!a) return null;
  const rows: [string, 'Live' | 'Simulated' | 'Local', string][] = [
    ['Sign-in and sessions', 'Live', 'EIP-4361 style message signed by your wallet or browser key; httpOnly session cookie.'],
    ['Agent key registration and sealing', 'Live', 'The agent public key is recovered from its signature; results are ECIES-sealed to it.'],
    ['Guard co-signature', 'Live', `Server-side key ${shortAddr(guardAddress)} co-signs only after the four checks pass.`],
    ['Supplier OCR (built-in)', 'Live', 'tesseract.js on your sealed page; result sealed back to your team.'],
    ['x402 settlement on Hedera testnet', me?.facilitator.live ? 'Live' : 'Simulated', me?.facilitator.live ? `Facilitator ${me.facilitator.url}` : 'Set X402_FACILITATOR_URL and fund the agent account with testnet USDC to go live.'],
    ['Arkiv order discovery', me?.arkiv.live ? 'Live' : 'Local', me?.arkiv.live ? 'Rabdi testnet entities' : 'Set ARKIV_ACCESS_KEY and ARKIV_PRIVATE_KEY to publish entities on Rabdi testnet.'],
    ['Chainlink CCIP treasury approval', me?.ccip.simulated ? 'Simulated' : 'Live', me?.ccip.simulated ? 'Deploy contracts/ccip and set CCIP_* to send real messages Sepolia → Hedera testnet.' : 'Ethereum Sepolia → Hedera testnet'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 820 }}>
      <Panel title="Account" aside={<Badge size="sm" tone={usingWallet ? 'accent' : 'neutral'} mono>{usingWallet ? 'wallet' : 'browser key'}</Badge>}>
        <Row k="Signing with" v={ownerAddress ? shortAddr(ownerAddress) : '—'} />
        <Row k="Team" v={a.teamName ?? '—'} />
        <Row k="Supplier profile" v={a.supplierName ?? '—'} />
        <Row k="Mode" v={role} />
        <Row k="Network" v={network} />
        <Row k="Created" v={formatDate(a.createdAt)} />
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => void setRole(role === 'buyer' ? 'supplier' : 'buyer')}>Switch to {role === 'buyer' ? 'supplier' : 'buyer'} mode</Button>
          {isConnected && <Button variant="ghost" onClick={disconnect}>Disconnect wallet</Button>}
          <Button variant="secondary" onClick={() => void signOut().then(() => navigate('/app'))}>Sign out</Button>
        </div>
      </Panel>

      <AgentHederaPanel />

      <Panel title="Keys and permissions" aside={<Badge size="sm" tone="ok">real signatures</Badge>}>
        <Row k="Agent key (this browser)" v={shortAddr(agentAddress)} />
        <Row k="Guard co-signer (server)" v={guardAddress ? shortAddr(guardAddress) : '—'} />
        <Row k="Permissions signed" v={String(Object.keys(delegations).length)} accent={Object.keys(delegations).length > 0} />
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, marginTop: 12 }}>
          The agent key lives only in this browser. It signs every per-call payment and decrypts your results. Resetting it invalidates permissions you signed for it.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <Button variant="danger" onClick={() => { if (window.confirm('Reset the local agent and browser keys? Results sealed to the current agent key become unreadable.')) void resetLocalKeys().then(() => navigate('/app')); }}>Reset local keys</Button>
        </div>
      </Panel>

      <Panel title="What is live in this deployment">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map(([name, status, note]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line-1)', fontSize: 13.5 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.5 }}>{note}</div>
              </div>
              <Badge size="sm" tone={status === 'Live' ? 'ok' : 'neutral'}>{status}</Badge>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-3)', marginTop: 12 }}>Server env: see .env.example. Docs: /docs/live-wiring</p>
      </Panel>
    </div>
  );
}
