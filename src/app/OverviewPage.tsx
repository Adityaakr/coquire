import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Download, Store, Upload } from 'lucide-react';
import { Button, TokenIcon } from '@/ui';
import { useStore } from '@/store/store';
import { agentHederaStatus, type AgentHederaStatus } from '@/lib/hedera';
import { approvedQuote, orderStatus, settledPayments, supplierEarnings, teamBudget, totalCalls } from '@/domain/selectors';
import type { Order } from '@/domain/types';
import { Countdown, Money, formatDate } from './kit';

const STATUS_LABEL: Record<string, string> = { open: 'Open', quoted: 'Quoted', approved: 'Approved', active: 'Active', completed: 'Completed', expired: 'Expired', draft: 'Draft' };

function OrderRows({ orders, empty, supplierView }: { orders: Order[]; empty: string; supplierView?: boolean }) {
  const { state, mySupplier } = useStore();
  if (orders.length === 0) return <div className="px-empty">{empty}</div>;
  return (
    <div className="px-list">
      {orders.map((o) => {
        const st = orderStatus(o);
        const q = approvedQuote(o);
        const settled = settledPayments(state, o.id).length;
        const creator = state.teams.find((t) => t.id === o.createdBy);
        const myQuote = o.quotes.find((x) => x.supplierId === mySupplier?.id);
        const right = supplierView
          ? myQuote ? (q?.id === myQuote.id ? 'Approved' : o.approvedQuoteId ? 'Not selected' : 'Quote pending') : o.quotes.length ? `${o.quotes.length} other ${o.quotes.length === 1 ? 'quote' : 'quotes'}` : 'No quotes yet'
          : STATUS_LABEL[st];
        const sub = st === 'active' || st === 'completed'
          ? <><span className="mono">{settled}/{totalCalls(o)}</span> pages settled{q ? <> at <span className="mono">{(Number(q.ratePerCall) / 1e6).toFixed(3)}</span> USDC</> : null}</>
          : st === 'open' || st === 'quoted' ? <>{creator?.name}, {o.quotes.length} {o.quotes.length === 1 ? 'quote' : 'quotes'}, <Countdown until={o.offerWindowEnd} prefix="closes in" /></>
          : <>{creator?.name}, started {formatDate(o.startedAt ?? o.createdAt)}</>;
        return (
          <Link key={o.id} to={`/app/orders/${o.id}`} className="px-row">
            <div><div className="px-row-t">{o.title}</div><div className="px-row-s">{sub}</div></div>
            <div className="px-row-r">{right}</div>
          </Link>
        );
      })}
    </div>
  );
}

function Balance() {
  const { me, agentAddress } = useStore();
  const [st, setSt] = useState<AgentHederaStatus | null>(null);
  useEffect(() => { agentHederaStatus().then(setSt).catch(() => setSt(null)); }, [agentAddress]);
  const live = !!me?.facilitator.live;
  const usdc = st?.usdc ?? 0;
  return (
    <>
      <div className="px-label">Balance<Link to="/app/wallet">Wallet <ArrowRight size={14} /></Link></div>
      <div className="px-balance">
        <div className="px-amount">{usdc.toFixed(2)}<small><TokenIcon token="USDC" size={18} />USDC</small></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button size="lg" variant="secondary" to="/app/wallet"><Upload size={15} strokeWidth={1.8} />Release</Button>
          <Button size="lg" className="px-btn-primary" to="/app/wallet"><Download size={15} strokeWidth={1.8} />Fund agent</Button>
        </div>
      </div>
      <div className="px-note">
        <span className="px-pill"><span className="ap-dot" data-on={live ? 'true' : 'sim'} />Hedera testnet</span>
        <span>{st?.accountId ? `Agent account ${st.accountId}. ` : 'No agent account yet. '}{live ? 'An ordinary Hedera account: any x402 client can pay the supplier from it, fees sponsored by the facilitator.' : 'Settlement is simulated on this server.'}</span>
      </div>
    </>
  );
}

function GetStarted({ mine }: { mine: Order[] }) {
  const { me, agentAddress, delegations } = useStore();
  const [st, setSt] = useState<AgentHederaStatus | null>(null);
  useEffect(() => { agentHederaStatus().then(setSt).catch(() => setSt(null)); }, [agentAddress]);
  const live = !!me?.facilitator.live;
  const steps = [
    { t: 'Set up your account', s: `${me?.account?.teamName ?? 'Team'} is ready`, done: true },
    { t: live ? 'Fund your agent with testnet USDC' : 'Agent key registered', s: live ? (st?.associated ? `${(st.usdc ?? 0).toFixed(2)} USDC on ${st.accountId}` : 'HBAR to create the account, then USDC') : 'Signs every call and decrypts results', done: live ? !!st?.associated && (st.usdc ?? 0) > 0 : true },
    { t: 'Create or join an order', s: mine.length ? `${mine.length} ${mine.length === 1 ? 'order' : 'orders'}` : 'Pool pages with another team', done: mine.length > 0 },
    { t: 'Approve a quote and sign the permission', s: 'One wallet signature per order', done: mine.some((o) => !!o.approvedQuoteId) && Object.keys(delegations).length > 0 },
    { t: 'Run the agent', s: 'Pays per page, guard co-signs each call', done: mine.some((o) => ['active', 'completed'].includes(orderStatus(o)) && settledPayments(useStoreState(), o.id).length > 0) },
  ];
  return (
    <div className="px-steps">
      {steps.map((s) => (
        <div key={s.t} className="px-step" data-done={s.done}>
          <span className="px-step-ic">{s.done && <Check size={14} strokeWidth={3} />}</span>
          <div><div className="px-step-t">{s.t}</div><div className="px-step-s">{s.s}</div></div>
        </div>
      ))}
    </div>
  );
}
// tiny accessor so the checklist can read payments without re-threading props
let _state: ReturnType<typeof useStore>['state'] | null = null;
function useStoreState() { return _state!; }

function BuyerHome() {
  const store = useStore();
  _state = store.state;
  const { state, myTeam, me, setRole } = store;
  const nav = useNavigate();
  const mine = state.orders.filter((o) => o.teams.some((t) => t.teamId === myTeam?.id)).sort((a, b) => b.createdAt - a.createdAt);
  const active = mine.filter((o) => ['open', 'quoted', 'approved'].includes(orderStatus(o)));
  const funded = mine.filter((o) => ['active', 'completed'].includes(orderStatus(o)));
  return (
    <>
      <h1 className="px-h1">Welcome{me?.account?.teamName ? `, ${me.account.teamName}` : ''}</h1>
      <p className="px-lead">Buy API capacity with other teams on one quote, or supply your own. One account, one agent, one balance.</p>
      <div className="px-cols">
        <div>
          <Balance />
          <div className="px-hr" />
          <div className="px-label">Orders in progress<Link to="/app/discover">All <ArrowRight size={14} /></Link></div>
          <OrderRows orders={active} empty="No open orders. Start one or join a group in the Market." />
          <div style={{ marginTop: 14 }}><Button size="md" variant="secondary" onClick={() => nav('/app/orders/new')}>New order</Button></div>
          <div className="px-hr" />
          <div className="px-label">Funded orders<Link to="/app/discover">All <ArrowRight size={14} /></Link></div>
          <OrderRows orders={funded} empty="Nothing funded yet. Approve a quote and sign the permission to start." />
          {funded.length > 0 && myTeam && (
            <div className="px-note" style={{ marginTop: 6 }}>
              {funded.slice(0, 1).map((o) => { const b = teamBudget(state, o, myTeam.id); return <span key={o.id}><span className="mono"><Money value={b.remaining} /></span> remaining of <span className="mono"><Money value={b.limit} /></span> on {o.title}</span>; })}
            </div>
          )}
        </div>
        <div>
          <div className="px-label">Get started</div>
          <GetStarted mine={mine} />
          <div className="px-promo">
            <div className="px-label">Supply on Coquire</div>
            <div className="px-promo-t">Let your API quote for you</div>
            <p className="px-promo-d">List a per-page rate. Buyers pool demand, your quote is signed once for the combined volume, and payouts land in this same account per call.</p>
            <div style={{ marginTop: 16 }}><Button size="lg" variant="secondary" onClick={() => void setRole('supplier')}><Store size={15} strokeWidth={1.8} />Start supplying</Button></div>
          </div>
        </div>
      </div>
    </>
  );
}

function SupplierHome() {
  const store = useStore();
  _state = store.state;
  const { state, mySupplier, me, setRole } = store;
  const open = state.orders.filter((o) => o.status === 'open' && orderStatus(o) !== 'expired');
  const quotable = open.filter((o) => !o.quotes.some((q) => q.supplierId === mySupplier?.id));
  const quoted = state.orders.filter((o) => o.quotes.some((q) => q.supplierId === mySupplier?.id));
  const earnings = mySupplier ? supplierEarnings(state, mySupplier.payoutAddress) : 0n;
  return (
    <>
      <h1 className="px-h1">Welcome{me?.account?.supplierName ? `, ${me.account.supplierName}` : ''}</h1>
      <p className="px-lead">Quote funded group orders once, at the combined volume, and get paid per call.</p>
      <div className="px-cols">
        <div>
          <div className="px-label">Received<Link to="/app/wallet">Wallet <ArrowRight size={14} /></Link></div>
          <div className="px-balance"><div className="px-amount">{(Number(earnings) / 1e6).toFixed(2)}<small><TokenIcon token="USDC" size={18} />USDC</small></div></div>
          <div className="px-note"><span className="px-pill"><span className="ap-dot" data-on={me?.facilitator.live ? 'true' : 'sim'} />Hedera testnet</span><span>Per-call payments and reservation fees, settled over x402.</span></div>
          <div className="px-hr" />
          <div className="px-label">Orders to quote<Link to="/app/discover">All <ArrowRight size={14} /></Link></div>
          <OrderRows orders={quotable} empty="No open orders match your capability right now." supplierView />
          <div className="px-hr" />
          <div className="px-label">Your quotes</div>
          <OrderRows orders={quoted} empty="You have not quoted yet." supplierView />
        </div>
        <div>
          <div className="px-label">Get started</div>
          <div className="px-steps">
            {[
              { t: 'Supplier profile', s: `${mySupplier?.name ?? 'Supplier'}, list rate ${mySupplier ? (Number(mySupplier.listRate) / 1e6).toFixed(3) : '—'} USDC per page`, done: !!mySupplier },
              { t: 'Quote a funded order', s: 'See combined volume and funded balances first', done: quoted.length > 0 },
              { t: 'Get approved by the group', s: 'Every team must approve the same quote', done: quoted.some((o) => approvedQuote(o)?.supplierId === mySupplier?.id) },
              { t: 'Receive per-call payments', s: 'Each settled call lands as USDC', done: earnings > 0n },
            ].map((s) => (
              <div key={s.t} className="px-step" data-done={s.done}><span className="px-step-ic">{s.done && <Check size={14} strokeWidth={3} />}</span><div><div className="px-step-t">{s.t}</div><div className="px-step-s">{s.s}</div></div></div>
            ))}
          </div>
          <div className="px-promo">
            <div className="px-label">Buy on Coquire</div>
            <div className="px-promo-t">Pool your own workload</div>
            <p className="px-promo-d">Commit pages with another team, approve one quote, and let your agent pay per page from this account.</p>
            <div style={{ marginTop: 16 }}><Button size="lg" variant="secondary" onClick={() => void setRole('buyer')}>Switch to buying</Button></div>
          </div>
        </div>
      </div>
    </>
  );
}

export function OverviewPage() {
  const { role } = useStore();
  return role === 'supplier' ? <SupplierHome /> : <BuyerHome />;
}
