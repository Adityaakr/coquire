import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select } from '@/ui';
import { useStore } from '@/store/store';
import { usdc } from '@/domain/money';
import { Money, Panel } from './kit';

export function NewOrderPage() {
  const { createOrder, busy, state, role, notify } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState('Invoice backlog, October');
  const [description, setDescription] = useState('Scanned supplier invoices, PDF, one invoice per page. Need vendor, invoice number, date and total.');
  const [pages, setPages] = useState('150');
  const [limit, setLimit] = useState('6.75');
  const [window, setWindow] = useState('48');
  const [neededBy, setNeededBy] = useState('7');

  const bestList = useMemo(() => {
    const rates = state.suppliers.map((s) => s.listRate);
    return rates.length ? rates.reduce((a, b) => (a < b ? a : b)) : usdc(0.06);
  }, [state.suppliers]);
  const n = Math.max(1, Number(pages) || 1);
  const alone = BigInt(n) * bestList;

  if (role === 'supplier') return <Panel><p style={{ fontSize: 14, color: 'var(--text-2)' }}>Switch to Buyer mode to create an order.</p></Panel>;

  const submit = async () => {
    try {
      const order = await createOrder({ title: title.trim(), description: description.trim(), pages: n, limit: usdc(Number(limit) || 0), offerWindowHours: Number(window), neededByDays: Number(neededBy) });
      notify('ok', 'Order listed on Arkiv', 'Suppliers can see the combined demand and your funded balance.');
      navigate(`/app/orders/${order.id}`);
    } catch (err) {
      notify('danger', (err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h1 className="px-h1">New order</h1><p className="px-lead">Describe the workload and how much of it you need. Other teams join with their own volume; suppliers quote on the total.</p></div>
      <Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="t-in">
            <span className="t-in-l">Workload</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: '100%', border: '1px solid var(--fx-mist)', borderRadius: 12, padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: 14, resize: 'vertical' }} />
            <span className="t-in-msg">What the supplier's API must return. Other buyers see this; your files do not.</span>
          </div>
          <div className="ap-grid-2">
            <Input label="Pages you need (1 API call = 1 page)" value={pages} onChange={(e) => setPages(e.target.value)} inputMode="numeric" />
            <Input label="Your agent's spending limit (USDC)" value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="decimal" hint={`Alone at the best list rate this would cost ${''}`} suffix={<Money value={alone} style={{ fontSize: 12, color: 'var(--text-3)' }} />} />
            <div className="t-in"><span className="t-in-l">Offer window</span><Select block value={window} onChange={(e) => setWindow(e.target.value)} options={[{ value: '24', label: '24 hours' }, { value: '48', label: '48 hours' }, { value: '72', label: '72 hours' }]} /><span className="t-in-msg">Suppliers can quote until it closes. The Arkiv listing expires with it.</span></div>
            <div className="t-in"><span className="t-in-l">Needed by</span><Select block value={neededBy} onChange={(e) => setNeededBy(e.target.value)} options={[{ value: '3', label: '3 days' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }]} /></div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, background: 'var(--fx-lgb)', borderRadius: 14, padding: '10px 12px' }}>
            Listing puts the order terms, combined volume and your team's funded balance on Arkiv. Invoice contents stay on your machine until a supplier is approved, then each page is encrypted for that supplier only.
          </p>
          <Button size="xl" block loading={!!busy.createOrder} onClick={submit}>{busy.createOrder ? 'Listing on Arkiv…' : 'List order'}</Button>
        </div>
      </Panel>
    </div>
  );
}
