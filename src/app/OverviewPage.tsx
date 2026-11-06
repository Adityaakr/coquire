import { Link, useNavigate } from 'react-router-dom';
import { Badge, Bento, Button, Stat } from '@/ui';
import { useStore } from '@/store/store';
import { approvedQuote, orderStatus, settledPayments, supplierEarnings, teamBudget, teamCostAlone, teamCostAtQuote, totalCalls } from '@/domain/selectors';
import type { LedgerEvent, Order } from '@/domain/types';
import { Countdown, Empty, Money, Note, Panel, SimTag, StatusBadge, Th, formatDate } from './kit';

function OrdersTable({ orders, empty }: { orders: Order[]; empty: React.ReactNode }) {
  const { state, myTeam, mySupplier, role } = useStore();
  if (orders.length === 0) return <>{empty}</>;
  return (
    <div className="ap-table-wrap">
      <table className="ap-table">
        <thead><tr><Th>Order</Th><Th>Volume</Th><Th>Rate</Th><Th>Progress</Th><Th>Status</Th><Th>Next</Th></tr></thead>
        <tbody>
          {orders.map((o) => {
            const st = orderStatus(o);
            const q = approvedQuote(o);
            const best = o.quotes.length ? o.quotes.reduce((a, x) => (x.ratePerCall < a.ratePerCall ? x : a), o.quotes[0]) : null;
            const settled = settledPayments(state, o.id).length;
            const creator = state.teams.find((t) => t.id === o.createdBy);
            const mine = o.teams.some((t) => t.teamId === myTeam?.id);
            const myQuote = o.quotes.find((x) => x.supplierId === mySupplier?.id);
            const next = role === 'supplier' && myQuote
              ? (q?.id === myQuote.id ? 'Your quote approved' : o.approvedQuoteId ? 'Not selected' : 'Quote pending')
              : st === 'open' || st === 'quoted' ? <Countdown until={o.offerWindowEnd} prefix="closes in" /> : st === 'approved' ? 'Ready to start' : st === 'completed' ? `done ${formatDate(o.completedAt ?? o.createdAt)}` : 'Agents paying';
            return (
              <tr key={o.id} className="ap-row">
                <td>
                  <Link to={`/app/orders/${o.id}`} style={{ fontWeight: 600 }}>{o.title}</Link>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {creator?.name}{creator?.simulated && !mine && <SimTag>sample</SimTag>}
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{totalCalls(o)} pages · {o.teams.length} teams</td>
                <td style={{ color: 'var(--fx-indigo)' }}>{q ? <Money value={q.ratePerCall} /> : best ? <><Money value={best.ratePerCall} /> <span style={{ color: 'var(--text-3)' }}>best</span></> : '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{st === 'active' || st === 'completed' ? `${settled}/${totalCalls(o)}` : `${o.quotes.length} quotes`}</td>
                <td><StatusBadge status={st} /></td>
                <td style={{ color: 'var(--text-2)' }}>{next}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Activity() {
  const { state } = useStore();
  const events: LedgerEvent[] = state.events.slice(0, 8);
  return (
    <Panel title="Activity" aside={<span className="ap-live"><Badge size="sm" tone="ok">live</Badge></span>}>
      {events.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No activity yet.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {events.map((e) => (
            <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: '1px solid var(--line-1)', fontSize: 13 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: e.kind === 'ccip' ? 'var(--warn)' : e.kind === 'quote' || e.kind === 'group' ? 'var(--info)' : 'var(--fx-indigo)', marginTop: 7, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--text-1)', lineHeight: 1.45 }}>{e.text}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>
                  {new Date(e.ts).toLocaleTimeString('en-GB')}{e.orderId && <> · <Link to={`/app/orders/${e.orderId}`}>open order</Link></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function BuyerOverview() {
  const { state, myTeam } = useStore();
  const nav = useNavigate();
  const mine = state.orders.filter((o) => o.teams.some((t) => t.teamId === myTeam?.id));
  const joinable = state.orders.filter((o) => !o.teams.some((t) => t.teamId === myTeam?.id) && orderStatus(o) !== 'expired' && o.status === 'open');
  let committed = 0n, spent = 0n, saved = 0n, done = 0, total = 0;
  for (const o of mine) {
    if (!myTeam) continue;
    const b = teamBudget(state, o, myTeam.id);
    committed += b.limit; spent += b.spent + (b.reservationPaid ? b.reservation : 0n); done += b.done; total += b.calls;
    const q = approvedQuote(o);
    const sup = q && state.suppliers.find((s) => s.id === q.supplierId);
    if (q && sup) saved += teamCostAlone(o, sup.listRate, myTeam.id) - teamCostAtQuote(o, q, myTeam.id).total;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ap-grid-4">
        <Bento variant="app" pad={20}><Stat label="Orders" value={mine.length} size="sm" sub={`${mine.filter((o) => o.status === 'active').length} active · ${mine.filter((o) => o.status === 'completed').length} completed`} /></Bento>
        <Bento variant="app" pad={20}><Stat label="Agent limits set" value={<Money value={committed} />} size="sm" mono sub={<>spent <Money value={spent} /></>} /></Bento>
        <Bento variant="app" pad={20}><Stat label="Saved vs list rates" value={<Money value={saved} />} size="sm" gradient sub="on approved quotes, at your pages" /></Bento>
        <Bento variant="app" pad={20}><Stat label="Pages settled" value={`${done} / ${total}`} size="sm" mono sub="each with a receipt" /></Bento>
      </div>
      <Bento variant="app" pad={0}>
        <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Your orders</span>
          <Button size="sm" onClick={() => nav('/app/orders/new')}>New order</Button>
        </div>
        <OrdersTable orders={mine} empty={
          <Empty title="No pooled orders yet" body="Start an order for your workload or join an open group. Suppliers quote against the combined volume.">
            <Button size="md" onClick={() => nav('/app/orders/new')}>Start an order</Button>
            <Button size="md" variant="secondary" onClick={() => nav('/app/discover')}>Browse open groups</Button>
          </Empty>
        } />
      </Bento>
      <div className="ap-yield" style={{ alignItems: 'start' }}>
        <Bento variant="app" pad={0}>
          <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Open groups you could join</span>
            <Link to="/app/discover" style={{ fontSize: 13, color: 'var(--fx-indigo)', fontWeight: 600 }}>See all</Link>
          </div>
          <OrdersTable orders={joinable.slice(0, 3)} empty={<p style={{ padding: '0 26px 22px', fontSize: 13, color: 'var(--text-3)' }}>Nothing open right now.</p>} />
        </Bento>
        <div style={{ minWidth: 300 }}><Activity /></div>
      </div>
      <Note>Simulated settlement: figures are sample data and nothing is sent on chain. Signatures are real.</Note>
    </div>
  );
}

function SupplierOverview() {
  const { state, mySupplier } = useStore();
  const open = state.orders.filter((o) => o.status === 'open' && orderStatus(o) !== 'expired');
  const quotable = open.filter((o) => !o.quotes.some((q) => q.supplierId === mySupplier?.id));
  const quoted = state.orders.filter((o) => o.quotes.some((q) => q.supplierId === mySupplier?.id));
  const won = quoted.filter((o) => approvedQuote(o)?.supplierId === mySupplier?.id);
  const earnings = mySupplier ? supplierEarnings(state, mySupplier.payoutAddress) : 0n;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ap-grid-4">
        <Bento variant="app" pad={20}><Stat label="Open orders" value={quotable.length} size="sm" sub={`${quotable.reduce((a, o) => a + totalCalls(o), 0)} pages of demand`} /></Bento>
        <Bento variant="app" pad={20}><Stat label="Your quotes" value={quoted.length} size="sm" sub={`${won.length} approved`} /></Bento>
        <Bento variant="app" pad={20}><Stat label="Received" value={<Money value={earnings} />} size="sm" gradient sub="calls and reservation fees" /></Bento>
        <Bento variant="app" pad={20}><Stat label="List rate" value={mySupplier ? <Money value={mySupplier.listRate} /> : '—'} size="sm" mono sub="per page, before group quotes" /></Bento>
      </div>
      <Bento variant="app" pad={0}>
        <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Orders to quote</span>
          <Badge size="sm" mono>{quotable.length} open</Badge>
        </div>
        <OrdersTable orders={quotable} empty={<Empty title="No orders match your capability yet" body="New group orders appear here when buyers list them on Arkiv. Switch to Buyer mode and create one to see the other side." />} />
      </Bento>
      {quoted.length > 0 && (
        <Bento variant="app" pad={0}>
          <div style={{ padding: '20px 26px 14px' }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Your quotes</span></div>
          <OrdersTable orders={quoted} empty={null} />
        </Bento>
      )}
      <Activity />
    </div>
  );
}

export function OverviewPage() {
  const { role } = useStore();
  return role === 'supplier' ? <SupplierOverview /> : <BuyerOverview />;
}
