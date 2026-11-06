import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Input } from '@/ui';
import { useStore } from '@/store/store';
import { usdc } from '@/domain/money';
import type { Role } from '@/domain/types';
import { Panel, shortAddr } from './kit';

export function OnboardPage() {
  const [params] = useSearchParams();
  const preset: Role = params.get('mode') === 'supplier' ? 'supplier' : 'buyer';
  const [role, setRole] = useState<Role>(preset);
  const [teamName, setTeamName] = useState('Northwind Books');
  const [supplierName, setSupplierName] = useState('Your OCR API');
  const [listRate, setListRate] = useState('0.06');
  const [saving, setSaving] = useState(false);
  const { completeOnboarding, ownerAddress, usingWallet, notify } = useStore();
  const navigate = useNavigate();

  const submit = async () => {
    setSaving(true);
    try {
      await completeOnboarding({ role, teamName: teamName.trim() || 'My team', supplierName: supplierName.trim() || 'My API', listRate: usdc(Number(listRate) || 0.06) });
      navigate('/app', { replace: true });
    } catch (e) {
      notify('danger', 'Could not save your profile', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div className="eyebrow">One account, two modes</div>
        <h1 style={{ fontSize: 32, marginTop: 8 }}>How will you use Coquire first?</h1>
        <p style={{ color: 'var(--text-2)', marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>One account can buy and supply. Switch modes any time from the top bar.</p>
      </div>
      <Panel>
        <div style={{ display: 'flex', gap: 10 }}>
          {([
            ['buyer', 'Buyer team', 'Pool demand with other teams and let your agent pay per call.'],
            ['supplier', 'API supplier', 'See funded group orders and quote against combined volume.'],
          ] as const).map(([r, t, s]) => (
            <button key={r} type="button" className="ap-exit" aria-pressed={role === r} onClick={() => setRole(r)}>
              <div className="ap-exit-t">{t}</div>
              <div className="ap-exit-s">{s}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 18, display: 'grid', gap: 14, gridTemplateColumns: role === 'supplier' ? '1fr 1fr' : '1fr' }}>
          {role === 'buyer' ? (
            <Input label="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} hint="Suppliers see this on the order. Your invoices never leave your client unencrypted." />
          ) : (
            <>
              <Input label="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              <Input label="List rate per page (USDC)" value={listRate} onChange={(e) => setListRate(e.target.value)} inputMode="decimal" hint="Buyers compare group quotes against this." />
            </>
          )}
        </div>
        <div style={{ marginTop: 18, background: 'var(--fx-lgb)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{usingWallet ? 'Signing with your wallet' : 'Signing with your browser key'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{ownerAddress ? shortAddr(ownerAddress) : '—'} · Hedera testnet</div>
          </div>
          <Badge tone="ok" size="sm">agent key registered</Badge>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, margin: '12px 0 18px' }}>
          Your agent key is registered to this account. Your account signs one permission per order; the agent key signs each per-call payment and decrypts results.
        </p>
        <Button size="xl" block loading={saving} onClick={submit}>Continue</Button>
      </Panel>
    </div>
  );
}
