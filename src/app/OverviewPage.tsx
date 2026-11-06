import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Boxes, CheckCircle2, Coins, FileCheck, KeyRound, Link2, Receipt, ShieldCheck, Sparkles, TrendingDown, Users, Wallet } from 'lucide-react';
import { Badge, Bento, Button } from '@/ui';
import { useStore } from '@/store/store';
import { approvedQuote, orderStatus, settledPayments, supplierEarnings, teamBudget, teamCostAlone, teamCostAtQuote, totalCalls } from '@/domain/selectors';
import type { LedgerEvent, Order } from '@/domain/types';
import { Countdown, Empty, Kpi, Money, Note, Panel, Progress, StatusBadge, TeamAvatar, Th, formatDate } from './kit';

const FX = '/fx/';

function OrdersTable({ orders, empty }: { orders: Order[]; empty: React.ReactNode }) {
  const { state, myTeam, mySupplier, role } = useStore();
  if (orders.length === 0) return <>{empty}</>;
  return (
    <div className="ap-table-wrap">
      <table className="ap-table">
        <thead><tr><Th>Order</Th><Th>Teams</Th><Th>Rate</Th><Th>Progress</Th><Th>Status</Th><Th>Next</Th></tr></thead>
        <tbody>
          {orders.map((o) => {
            const st = orderStatus(o);
            const q = approvedQuote(o);
            const best = o.quotes.length ? o.quotes.reduce((a, x) => (x.ratePerCall < a.ratePerCall ? x : a), o.quotes[0]) : null;
            const settled = settledPayments(state, o.id).length;
            const myQuote = o.quotes.find((x) => x.supplierId === mySupplier?.id);
            const mine = o.teams.some((t) => t.teamId === myTeam?.id);
            const next = role === 'supplier' && myQuote
              ? (q?.id === myQuote.id ? 'Your quote approved' : o.approvedQuoteId ? 'Not selected' : 'Quote pending')
              : st === 'open' || st === 'quoted' ? (o.quotes.length && mine ? 'Approve a quote' : <Countdown until={o.offerWindowEnd} prefix="closes in" />) : st === 'approved' ? 'Sign permission, start' : st === 'completed' ? `done ${formatDate(o.completedAt ?? o.createdAt)}` : 'Agents paying';
            return (
              <tr key={o.id} className="ap-row">
                <td>
                  <Link to={`/app/orders/${o.id}`} style={{ fontWeight: 600 }}>{o.title}</Link>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{totalCalls(o)} pages · {o.quotes.length} {o.quotes.length === 1 ? 'quote' : 'quotes'}</div>
                </td>
                <td>
                  <span className="ap-team-stack">{o.teams.map((t) => { const team = state.teams.find((x) => x.id === t.teamId); return <TeamAvatar key={t.teamId} name={team?.name ?? '?'} seed={team?.address} />; })}</span>
                  <span style={{ marginLeft: 12, fontSize: 12.5, color: 'var(--text-2)' }}>{o.teams.length}</span>
                </td>
                <td style={{ color: 'var(--fx-indigo)', fontFamily: 'var(--font-mono)' }}>{q ? <Money value={q.ratePerCall} /> : best ? <><Money value={best.ratePerCall} /> <span style={{ color: 'var(--text-3)' }}>best</span></> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                <td>{st === 'active' || st === 'completed' ? <Progress done={settled} total={totalCalls(o)} /> : <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{o.teams.filter((t) => t.approvedQuoteId).length}/{o.teams.length} approvals</span>}</td>
                <td><StatusBadge status={st} /></td>
                <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{next}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const FEED_ICON: Record<string, React.ReactNode> = {
  quote: <Receipt size={14} strokeWidth={1.7} />, group: <Users size={14} strokeWidth={1.7} />, approval: <CheckCircle2 size={14} strokeWidth={1.7} />,
  delegation: <KeyRound size={14} strokeWidth={1.7} />, ccip: <Link2 size={14} strokeWidth={1.7} />, order: <Boxes size={14} strokeWidth={1.7} />,
  arkiv: <Sparkles size={14} strokeWidth={1.7} />, refund: <Coins size={14} strokeWidth={1.7} />, supplier: <ShieldCheck size={14} strokeWidth={1.7} />,
};

function Activity({ limit = 8 }: { limit?: number }) {
  const { state } = useStore();
  const events: LedgerEvent[] = state.events.slice(0, limit);
  return (
    <Panel title="Activity" aside={<span className="ap-live"><Badge size="sm" tone="ok">live</Badge></span>}>
      {events.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No activity yet.</p> : (
        <div className="ap-feed">
          {events.map((e) => (
            <div key={e.id} className="ap-feed-item">
              <span className="ap-feed-ic" data-k={e.kind}>{FEED_ICON[e.kind] ?? <Sparkles size={14} strokeWidth={1.7} />}</span>
              <div style={{ minWidth: 0 }}>
                <div className="ap-feed-t">{e.text}</div>
                <div className="ap-feed-m">{new Date(e.ts).toLocaleTimeString('en-GB')}{e.orderId && <> · <Link to={`/app/orders/${e.orderId}`}>open order</Link></>}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Pipeline({ orders }: { orders: Order[] }) {
  const count = (f: (o: Order) => boolean) => orders.filter(f).length;
  const steps = [
    { t: 'Open for quotes', s: 'suppliers quoting', n: count((o) => ['open', 'quoted'].includes(orderStatus(o))) },
    { t: 'Approved', s: 'permission and start', n: count((o) => orderStatus(o) === 'approved') },
    { t: 'Active', s: 'agents paying per call', n: count((o) => orderStatus(o) === 'active') },
    { t: 'Completed', s: 'all pages settled', n: count((o) => orderStatus(o) === 'completed') },
  ];
  return (
    <div className="ap-pipe">
      {steps.map((s, i) => (
        <div key={s.t} className="ap-pipe-step" data-hot={s.n > 0 && i < 3}>
          <span className="ap-pipe-n">{s.n}</span>
          <div><div className="ap-pipe-t">{s.t}</div><div className="ap-pipe-s">{s.s}</div></div>
        </div>
      ))}
    </div>
  );
}

function NextSteps({ order }: { order: Order | null }) {
  const { state, myTeam, delegations } = useStore();
  const nav = useNavigate();
  if (!order || !myTeam) return null;
  const st = orderStatus(order);
  const b = teamBudget(state, order, myTeam.id);
  const items = [
    { t: 'Order listed', s: `${totalCalls(order)} pages across ${order.teams.length} ${order.teams.length === 1 ? 'team' : 'teams'}`, done: true },
    { t: 'Approve a quote', s: order.quotes.length ? `${order.quotes.length} signed ${order.quotes.length === 1 ? 'quote' : 'quotes'} in` : 'waiting for suppliers', done: !!order.approvedQuoteId },
    { t: 'Sign agent permission', s: 'one wallet signature per order', done: !!delegations[order.id] },
    { t: 'Start and run the agent', s: st === 'active' || st === 'completed' ? `${b.done} of ${b.calls} pages settled` : 'reservation fee released at start', done: st === 'completed' || b.done >= b.calls },
  ];
  const hot = items.findIndex((i) => !i.done);
  return (
    <Panel title="Up next" aside={<Button size="sm" onClick={() => nav(`/app/orders/${order.id}`)}>Open order <ArrowRight size={13} /></Button>}>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>{order.title}</div>
      <div className="ap-next">
        {items.map((i, k) => (
          <div key={i.t} className="ap-next-item" data-done={i.done} data-hot={k === hot}>
            <span className="ap-next-ic">{i.done ? <CheckCircle2 size={14} /> : k + 1}</span>
            <div><div className="ap-next-t">{i.t}</div><div className="ap-next-s">{i.s}</div></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BuyerOverview() {
  const { state, myTeam } = useStore();
  const nav = useNavigate();
  const mine = state.orders.filter((o) => o.teams.some((t) => t.teamId === myTeam?.id)).sort((a, b) => b.createdAt - a.createdAt);
  const joinable = state.orders.filter((o) => !o.teams.some((t) => t.teamId === myTeam?.id) && orderStatus(o) !== 'expired' && o.status === 'open');
  let committed = 0n, spent = 0n, saved = 0n, done = 0, total = 0;
  for (const o of mine) {
    if (!myTeam) continue;
    const b = teamBudget(state, o, myTeam.id);
    committed += b.limit; spent += b.spent + (b.reservationPaid ? b.reservation : 0n); done += b.done; total += b.calls;
    const q = approvedQuote(o); const sup = q && state.suppliers.find((s) => s.id === q.supplierId);
    if (q && sup) saved += teamCostAlone(o, sup.listRate, myTeam.id) - teamCostAtQuote(o, q, myTeam.id).total;
  }
  const focus = mine.find((o) => ['active', 'approved', 'quoted', 'open'].includes(orderStatus(o))) ?? null;
  const spentPct = committed > 0n ? Number((spent * 100n) / committed) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ap-kpis">
        <Kpi tone="primary" label="Spent of agent limits" value={<Money value={spent} />} sub={<>of <Money value={committed} /> across {mine.length} {mine.length === 1 ? 'order' : 'orders'}</>} icon={<Wallet size={16} strokeWidth={1.7} />} bar={spentPct} mono />
        <Kpi label="Saved vs list rates" value={<Money value={saved} />} sub="on approved quotes, at your pages" icon={<TrendingDown size={16} strokeWidth={1.7} />} mono />
        <Kpi label="Pages settled" value={`${done} / ${total}`} sub="each with a guard verdict and a receipt" icon={<FileCheck size={16} strokeWidth={1.7} />} bar={total ? (done / total) * 100 : 0} />
        <Kpi tone="dark" label="Active orders" value={mine.filter((o) => orderStatus(o) === 'active').length} sub={`${mine.filter((o) => orderStatus(o) === 'completed').length} completed · ${joinable.length} open to join`} icon={<Boxes size={16} strokeWidth={1.7} />} />
      </div>
      <Pipeline orders={mine} />
      <div className="ap-yield" style={{ alignItems: 'start', gridTemplateColumns: '1fr 360px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <Bento variant="app" pad={0}>
            <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Your orders</span>
              <Button size="sm" onClick={() => nav('/app/orders/new')}>New order</Button>
            </div>
            <OrdersTable orders={mine} empty={
              <Empty title="No pooled orders yet" body="Start an order for your workload or join an open group. Suppliers quote against the combined volume, and you pay per call from your own budget.">
                <img src={`${FX}ykcQXfkRR4KTqMLXTbg0T9PB8zk.png`} alt="" className="ap-empty-ill" />
                <Button size="md" onClick={() => nav('/app/orders/new')}>Start an order</Button>
                <Button size="md" variant="secondary" onClick={() => nav('/app/discover')}>Browse open groups</Button>
              </Empty>
            } />
          </Bento>
          {joinable.length > 0 && (
            <Bento variant="app" pad={0}>
              <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Open groups you could join</span>
                <Link to="/app/discover" style={{ fontSize: 13, color: 'var(--fx-indigo)', fontWeight: 600 }}>See all</Link>
              </div>
              <OrdersTable orders={joinable.slice(0, 3)} empty={null} />
            </Bento>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <NextSteps order={focus} />
          <Activity />
        </div>
      </div>
      <Note>Signatures, guard checks, sealing and OCR are real. Settlement is simulated on this server until an x402 facilitator and funded agent accounts are configured.</Note>
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
      <div className="ap-kpis">
        <Kpi tone="primary" label="Received" value={<Money value={earnings} />} sub="per-call payments and reservation fees" icon={<Coins size={16} strokeWidth={1.7} />} mono />
        <Kpi label="Open orders to quote" value={quotable.length} sub={`${quotable.reduce((a, o) => a + totalCalls(o), 0)} pages of demand`} icon={<Boxes size={16} strokeWidth={1.7} />} />
        <Kpi label="Your quotes" value={quoted.length} sub={`${won.length} approved by a group`} icon={<Receipt size={16} strokeWidth={1.7} />} />
        <Kpi tone="dark" label="List rate" value={mySupplier ? <Money value={mySupplier.listRate} /> : '—'} sub="per page, before group quotes" icon={<TrendingDown size={16} strokeWidth={1.7} />} mono />
      </div>
      <div className="ap-yield" style={{ alignItems: 'start', gridTemplateColumns: '1fr 360px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <Bento variant="app" pad={0}>
            <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Orders to quote</span>
              <Badge size="sm" mono>{quotable.length} open</Badge>
            </div>
            <OrdersTable orders={quotable} empty={<Empty title="No orders match your capability yet" body="New group orders appear here when buyers list them. Switch to Buyer mode and create one to see the other side." />} />
          </Bento>
          {quoted.length > 0 && (
            <Bento variant="app" pad={0}>
              <div style={{ padding: '20px 26px 14px' }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Your quotes</span></div>
              <OrdersTable orders={quoted} empty={null} />
            </Bento>
          )}
        </div>
        <Activity limit={10} />
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { role } = useStore();
  return role === 'supplier' ? <SupplierOverview /> : <BuyerOverview />;
}
