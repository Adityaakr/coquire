import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Bento, Button, Input, Stat, Switch, Tabs } from '@/ui';
import { useStore } from '@/store/store';
import { approvedQuote, orderStatus, reservationShare, settledPayments, teamBudget, teamCostAlone, teamCostAtQuote, totalCalls } from '@/domain/selectors';
import { describeVerdict, GUARD_CHECKS, guardTicks } from '@/domain/guard';
import { formatUSDC, usdc } from '@/domain/money';
import type { InvoiceResult, Order, Payment, Quote } from '@/domain/types';
import { Row, useNow } from './bits';
import { Chip, Countdown, Money, Note, Panel, SimTag, StatusBadge, Th, formatDate, shortAddr } from './kit';

type Tab = 'group' | 'quotes' | 'execution' | 'earnings';
const fmt = (m: bigint) => formatUSDC(m);

export function OrderPage() {
  const { id } = useParams();
  const { state, role, myTeam, me } = useStore();
  useNow(30_000);
  const order = state.orders.find((o) => o.id === id);
  const arkivUrl = order?.arkivListingId && me?.arkiv.live && !order.arkivListingId.startsWith('local_') ? `${me.arkiv.explorer}/entity/${order.arkivListingId}` : '';
  const status = order ? orderStatus(order) : 'draft';
  const defaultTab: Tab = !order ? 'group' : status === 'approved' || status === 'active' || status === 'completed' ? (role === 'supplier' ? 'earnings' : 'execution') : order.quotes.length > 0 || role === 'supplier' ? 'quotes' : 'group';
  const [tab, setTab] = useState<Tab>(defaultTab);
  useEffect(() => { setTab(defaultTab); }, [defaultTab, id]);
  if (!order) {
    return (
      <Panel><p style={{ fontSize: 14, color: 'var(--text-2)' }}>This order does not exist in your local demo state. <Link to="/app">Back to overview</Link></p></Panel>
    );
  }
  const quote = approvedQuote(order);
  const supplier = quote && state.suppliers.find((s) => s.id === quote.supplierId);
  const isMember = !!myTeam && order.teams.some((t) => t.teamId === myTeam.id);
  const best = order.quotes.length ? order.quotes.reduce((a, q) => (q.ratePerCall < a ? q.ratePerCall : a), order.quotes[0].ratePerCall) : null;
  const items: { id: Tab; label: string }[] = [{ id: 'group', label: 'Group' }, { id: 'quotes', label: 'Quotes' }, role === 'supplier' ? { id: 'earnings', label: 'Earnings' } : { id: 'execution', label: 'Execution' }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Bento variant="app" pad={26}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 26 }}>{order.title}</h1>
              <StatusBadge status={status} />
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6, maxWidth: 640, lineHeight: 1.5 }}>{order.description}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {order.arkivListingId && <Chip>{arkivUrl ? <a href={arkivUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', color: 'inherit' }}>Arkiv {order.arkivListingId.slice(0, 14)}…</a> : <span style={{ fontFamily: 'var(--font-mono)' }}>listing {order.arkivListingId}</span>}</Chip>}
              <Chip>{status === 'open' || status === 'quoted' ? <Countdown until={order.offerWindowEnd} prefix="offers close in" /> : `offers closed ${formatDate(order.offerWindowEnd)}`}</Chip>
              <Chip>needed by {formatDate(order.neededBy)}</Chip>
            </div>
          </div>
          <Link to="/app" style={{ fontSize: 13, color: 'var(--text-2)' }}>← Overview</Link>
        </div>
        <div className="ap-grid-4" style={{ margin: '22px 0 4px' }}>
          <Stat label="Combined volume" value={`${totalCalls(order)} pages`} size="sm" sub={`${order.teams.length} ${order.teams.length === 1 ? 'team' : 'teams'} · 1 call = 1 page`} />
          <Stat label="Quotes" value={order.quotes.length} size="sm" sub={best !== null ? <>best <Money value={best} /> per page</> : 'suppliers are reviewing'} />
          <Stat label="Approved rate" value={quote ? <Money value={quote.ratePerCall} /> : '—'} size="sm" gradient={!!quote} sub={supplier ? supplier.name : 'group has not approved a quote'} />
          <Stat label="Settled calls" value={`${settledPayments(state, order.id).length} / ${totalCalls(order)}`} size="sm" mono sub={quote ? <>reservation <Money value={quote.reservationFee} /></> : ' '} />
        </div>
      </Bento>

      <Tabs<Tab> items={items} active={tab} onChange={setTab} />
      {tab === 'group' && <GroupTab order={order} isMember={isMember} />}
      {tab === 'quotes' && <QuotesTab order={order} isMember={isMember} />}
      {tab === 'execution' && <ExecutionTab order={order} isMember={isMember} />}
      {tab === 'earnings' && <EarningsTab order={order} />}
    </div>
  );
}

/* ---------------- Group ---------------- */
function GroupTab({ order, isMember }: { order: Order; isMember: boolean }) {
  const { state, role, myTeam, joinOrder, busy, notify } = useStore();
  const status = orderStatus(order);
  const [pages, setPages] = useState('50');
  const [limit, setLimit] = useState('2.25');
  const canJoin = role === 'buyer' && !isMember && status !== 'expired' && order.status === 'open';
  return (
    <div className="ap-stake">
      <Bento variant="app" pad={0}>
        <div style={{ padding: '20px 26px 14px' }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Teams in this order</span></div>
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead><tr><Th>Team</Th><Th>Pages</Th><Th>Agent limit</Th><Th>Funded</Th><Th>Approval</Th></tr></thead>
            <tbody>
              {order.teams.map((t) => {
                const team = state.teams.find((x) => x.id === t.teamId);
                const q = t.approvedQuoteId && order.quotes.find((x) => x.id === t.approvedQuoteId);
                const sup = q && state.suppliers.find((s) => s.id === q.supplierId);
                return (
                  <tr key={t.teamId} className="ap-row">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{team?.name}</span>
                        {team?.id === myTeam?.id && <Badge size="sm" tone="accent">you</Badge>}
                        {team?.simulated && <SimTag />}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{team && shortAddr(team.address)}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{t.calls}</td>
                    <td><Money value={t.limit} /></td>
                    <td>{team && <Money value={team.balance} />}</td>
                    <td style={{ color: 'var(--text-2)' }}>{sup ? `Approved ${sup.name}` : 'Pending'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ padding: '14px 26px 20px', fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6 }}>Suppliers see the terms above and each team's funded balance. A balance is visible, not escrowed: funds can move until the order starts, which is why the reservation fee exists.</p>
      </Bento>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {canJoin && (
          <Panel title="Join this order">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input label="Pages you need" value={pages} onChange={(e) => setPages(e.target.value)} inputMode="numeric" />
              <Input label="Your agent's limit (USDC)" value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="decimal" />
              <Button size="lg" block loading={!!busy['join:' + order.id]} onClick={async () => { const n = Math.max(1, Number(pages) || 1); await joinOrder(order.id, n, usdc(Number(limit) || 0)); notify('ok', `Joined with ${n} pages`); }}>Join group</Button>
            </div>
          </Panel>
        )}
        {isMember && order.status === 'open' && (
          <Panel title="Invite another team">
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>Share the order link. Teams join with their own volume and their own limit; nobody funds anybody else.</p>
            <Button variant="secondary" block style={{ marginTop: 12 }} onClick={() => { navigator.clipboard?.writeText(window.location.href); notify('ok', 'Link copied'); }}>Copy order link</Button>
          </Panel>
        )}
        <Panel title="What stays private">
          <Row k="Public" v="terms, volume, addresses, payments" />
          <Row k="Supplier only" v="each invoice page" />
          <Row k="Your team only" v="each result" />
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Quotes ---------------- */
function QuotesTab({ order, isMember }: { order: Order; isMember: boolean }) {
  const { state, role, myTeam, mySupplier, approveQuote, submitQuote, busy, notify } = useStore();
  const status = orderStatus(order);
  const open = order.status === 'open' && status !== 'expired';
  const myCommit = order.teams.find((t) => t.teamId === myTeam?.id);
  const myQuote = order.quotes.find((q) => q.supplierId === mySupplier?.id);
  return (
    <div className="ap-stake">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {order.quotes.length === 0 && (
          <Panel><p style={{ fontSize: 14, color: 'var(--text-2)' }}>{role === 'supplier' ? 'No quotes yet. Yours would be first.' : 'No quotes yet. Suppliers quote against the combined volume while the offer window is open.'}</p></Panel>
        )}
        {[...order.quotes].sort((a, b) => (a.ratePerCall < b.ratePerCall ? -1 : 1)).map((q) => (
          <QuoteCard key={q.id} order={order} quote={q} isMember={isMember} open={open} myTeamId={myTeam?.id} mine={q.supplierId === mySupplier?.id} approving={!!busy['approve:' + order.id]} onApprove={() => approveQuote(order.id, q.id).then(() => notify('ok', 'You approved this quote', 'The order moves on when every team approves the same quote.'))} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {role === 'supplier' && open && !myQuote && mySupplier && <QuoteForm order={order} listRate={mySupplier.listRate} busy={!!busy['quote:' + order.id]} onSubmit={(i) => submitQuote(order.id, i)} />}
        {role === 'supplier' && myQuote && (
          <Panel title="Your quote">
            <Row k="Rate per page" v={fmt(myQuote.ratePerCall)} accent />
            <Row k="Reservation fee" v={fmt(myQuote.reservationFee)} />
            <Row k="Status" v={order.approvedQuoteId === myQuote.id ? 'approved by the group' : order.approvedQuoteId ? 'another supplier chosen' : `waiting on ${order.teams.length} approvals`} />
          </Panel>
        )}
        {role === 'buyer' && myCommit && (
          <Panel title="Your usage">
            <Row k="Pages committed" v={String(myCommit.calls)} />
            <Row k="Agent limit" v={fmt(myCommit.limit)} />
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 10 }}>Costs below are at your committed pages. You only pay for calls your agent actually makes, plus your share of any reservation fee.</p>
          </Panel>
        )}
        <SamplePanel />
      </div>
    </div>
  );
}

function QuoteCard({ order, quote, isMember, open, myTeamId, mine, approving, onApprove }: { order: Order; quote: Quote; isMember: boolean; open: boolean; myTeamId?: string; mine: boolean; approving: boolean; onApprove: () => void }) {
  const { state, role } = useStore();
  const sup = state.suppliers.find((s) => s.id === quote.supplierId);
  const approvals = order.teams.filter((t) => t.approvedQuoteId === quote.id).length;
  const iApproved = order.teams.find((t) => t.teamId === myTeamId)?.approvedQuoteId === quote.id;
  const isApproved = order.approvedQuoteId === quote.id;
  const cost = myTeamId ? teamCostAtQuote(order, quote, myTeamId) : null;
  const alone = myTeamId && sup ? teamCostAlone(order, sup.listRate, myTeamId) : null;
  const saving = cost && alone !== null ? alone - cost.total : null;
  return (
    <Bento variant="app" pad={26} style={isApproved ? { boxShadow: '0 0 0 1px var(--accent-line)' } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 38, height: 38, borderRadius: 99, background: '#fff', border: '1px solid var(--fx-mist)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{sup?.name[0]}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>{sup?.name}{sup?.simulated && <SimTag />}{mine && <Badge size="sm" tone="accent">you</Badge>}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>signed {formatDate(quote.submittedAt)} · <span style={{ fontFamily: 'var(--font-mono)' }}>{quote.signature.slice(0, 14)}…</span> · list rate {fmt(sup?.listRate ?? 0n)}</span>
          </div>
        </div>
        {isApproved ? <Badge tone="ok" size="sm">approved</Badge> : <Badge tone="info" size="sm">{approvals} of {order.teams.length} approvals</Badge>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, margin: '22px 0 16px' }}>
        <Stat label="Rate per page" value={<Money value={quote.ratePerCall} />} size="sm" gradient />
        <Stat label="Reservation fee" value={<Money value={quote.reservationFee} />} size="sm" mono sub="split by pages, paid at start" />
        <Stat label="Delivery" value={`${quote.deliveryWindowHours}h`} size="sm" mono sub={quote.sampleOffered ? 'sample offered' : 'no sample'} />
      </div>
      {cost && alone !== null && saving !== null && role === 'buyer' && (
        <div style={{ margin: '4px 0 14px' }}>
          <Row k={`Your ${order.teams.find((t) => t.teamId === myTeamId)?.calls} pages alone at list rate`} v={fmt(alone)} />
          <Row k="Your pages at the group rate" v={fmt(cost.calls)} />
          <Row k="Your share of the reservation fee" v={fmt(cost.reservation)} />
          <Row k="Total with this quote" v={fmt(cost.total)} />
          <Row k="You save" v={fmt(saving)} accent />
        </div>
      )}
      {role === 'buyer' && isMember && open && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="lg" disabled={iApproved} loading={approving} onClick={onApprove}>{iApproved ? 'You approved' : 'Approve this quote'}</Button>
        </div>
      )}
    </Bento>
  );
}

function QuoteForm({ order, listRate, busy, onSubmit }: { order: Order; listRate: bigint; busy: boolean; onSubmit: (i: { ratePerCall: bigint; reservationFee: bigint; deliveryWindowHours: number; sampleOffered: boolean }) => Promise<void> }) {
  const { notify } = useStore();
  const [rate, setRate] = useState(formatUSDC(listRate - usdc(0.01), { compact: true, symbol: false }).replace(/,/g, ''));
  const [fee, setFee] = useState('2');
  const [hours, setHours] = useState('48');
  const [sample, setSample] = useState(true);
  const calls = totalCalls(order);
  const gross = BigInt(calls) * usdc(Number(rate) || 0) + usdc(Number(fee) || 0);
  return (
    <Panel title="Quote this order">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Rate per page (USDC)" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" hint={`Your list rate is ${fmt(listRate)}. ${calls} pages combined.`} />
        <Input label="Reservation fee (USDC, whole order)" value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" hint="Paid to you when the order starts, split across teams by pages." />
        <Input label="Delivery window (hours)" value={hours} onChange={(e) => setHours(e.target.value)} inputMode="numeric" />
        <Switch checked={sample} onChange={setSample} label="Offer a free sample page" />
        <Row k="At full usage you receive" v={fmt(gross)} accent />
        <Button size="lg" block loading={busy} onClick={async () => { try { await onSubmit({ ratePerCall: usdc(Number(rate) || 0), reservationFee: usdc(Number(fee) || 0), deliveryWindowHours: Number(hours) || 24, sampleOffered: sample }); notify('ok', 'Quote signed and submitted'); } catch (e) { notify('danger', (e as Error).message); } }}>
          {busy ? 'Waiting for signature…' : 'Sign and submit quote'}
        </Button>
      </div>
    </Panel>
  );
}

function SamplePanel() {
  const { runSample } = useStore();
  const [out, setOut] = useState<{ result: InvoiceResult; latencyMs: number; engine: string } | null>(null);
  const [running, setRunning] = useState(false);
  return (
    <Panel title="Test the API before you buy" aside={<Badge size="sm" tone="ok">tesseract.js</Badge>}>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>Run one sample page through the supplier endpoint and see the exact shape it returns.</p>
      <Button variant="secondary" block style={{ marginTop: 12 }} loading={running} onClick={async () => { setRunning(true); try { setOut(await runSample()); } finally { setRunning(false); } }}>Run sample page</Button>
      {out && (
        <pre style={{ marginTop: 12, background: '#fff', border: '1px solid var(--fx-mist)', borderRadius: 14, padding: 12, fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {`// ${out.engine} · ${out.latencyMs} ms\n` + JSON.stringify({ ...out.result, text: undefined }, null, 2)}
        </pre>
      )}
    </Panel>
  );
}

/* ---------------- Execution ---------------- */
function ExecutionTab({ order, isMember }: { order: Order; isMember: boolean }) {
  const { state, myTeam, me, delegate, startOrder, payForPage, runAgent, stopAgent, agentRunning, refundUnused, busy, agentAddress, guardAddress, notify, delegations, results, pages, uploadPages } = useStore();
  const status = orderStatus(order);
  const quote = approvedQuote(order);
  const supplier = quote && state.suppliers.find((s) => s.id === quote.supplierId);
  const commit = order.teams.find((t) => t.teamId === myTeam?.id);
  if (!isMember || !myTeam || !commit) return <Panel><p style={{ fontSize: 14, color: 'var(--text-2)' }}>Join the group to run your own workload against the approved quote.</p></Panel>;
  if (!quote || !supplier) {
    return (
      <Panel title="Payments start when the group approves a quote">
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>Your agent will pay from your limit of <Money value={commit.limit} /> for {commit.calls} pages. Nothing moves before then.</p>
      </Panel>
    );
  }
  const budget = teamBudget(state, order, myTeam.id);
  const delegated = !!delegations[order.id];
  const myPayments = state.payments.filter((p) => p.orderId === order.id && p.teamId === myTeam.id).sort((a, b) => b.ts - a.ts);
  const resultRows = myPayments.filter((p) => results[p.id]).map((p) => ({ p, r: results[p.id] })).sort((a, b) => a.p.page - b.p.page);
  const uploaded = pages[order.id]?.length ?? 0;
  const remaining = Math.max(0, budget.calls - budget.done);
  const running = agentRunning === order.id;
  const pct = budget.limit > 0n ? Number((budget.spent * 1000n) / budget.limit) / 10 : 0;
  const prove = (opts: Parameters<typeof payForPage>[1]) => payForPage(order.id, opts).then((p) => p && notify('warn', describeVerdict(p.verdict, fmt)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(status === 'approved' || (status === 'active' && !delegated)) && (
        <Panel title={status === 'approved' ? 'Before payments start' : 'Your agent needs permission'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, background: '#fff', border: '1px solid var(--fx-mist)', borderRadius: 16, padding: '14px 16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{status === 'approved' ? '1. ' : ''}Give your agent permission</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.6 }}>Sign once: pay {supplier.name} at or below <Money value={quote.ratePerCall} /> per page, up to <Money value={commit.limit} />, for this order. The guard refuses anything outside these terms.</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}><Chip>agent {shortAddr(agentAddress)}</Chip><Chip>guard {shortAddr(guardAddress)}</Chip></div>
              </div>
              <Button size="md" disabled={delegated} loading={!!busy['delegate:' + order.id]} onClick={() => delegate(order.id).then(() => notify('ok', 'Permission signed')).catch((e) => notify('danger', (e as Error).message))}>{delegated ? 'Signed' : 'Sign permission'}</Button>
            </div>
            {status === 'approved' && <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, background: '#fff', border: '1px solid var(--fx-mist)', borderRadius: 16, padding: '14px 16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>2. Start the order</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.6 }}>Brings the treasury approval across ({me?.ccip.simulated ? 'simulated CCIP' : 'Chainlink CCIP'}, {me?.ccip.source ?? 'Ethereum Sepolia'} → {me?.ccip.destination ?? 'Hedera testnet'}) and releases each team's reservation share. Yours is <Money value={reservationShare(order, quote, myTeam.id)} />.</div>
                {order.ccip && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, marginTop: 6 }}>CCIP {order.ccip.messageId.slice(0, 14)}… · <span style={{ color: order.ccip.status === 'delivered' ? 'var(--ok)' : 'var(--warn)' }}>{order.ccip.status}</span></div>}
              </div>
              <Button size="md" disabled={!delegated} loading={!!busy['start:' + order.id]} onClick={() => startOrder(order.id).then(() => notify('ok', 'Order started')).catch((e) => notify('danger', (e as Error).message))}>Start order</Button>
            </div>}
          </div>
        </Panel>
      )}

      {(status === 'active' || status === 'completed') && (
        <div className="ap-stake" style={{ gridTemplateColumns: '344px 1fr' }}>
          <Panel title="Your budget on this order">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-2)' }}>Spent on calls</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(budget.spent)} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>/ {fmt(budget.limit)}</span></span>
            </div>
            <div className="ap-bar" data-active={running} style={{ margin: '10px 0 6px' }}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
            <Row k="Pages settled" v={`${budget.done} of ${budget.calls}`} />
            <Row k="Remaining allowance" v={fmt(budget.remaining)} accent />
            <Row k="Reservation share" v={`${fmt(budget.reservation)}${budget.reservationPaid ? ' · paid' : ''}`} />
            <Row k="Expected at full usage" v={fmt(budget.expected)} />
            {(status === 'completed' || budget.done >= budget.calls) && (
              <div style={{ marginTop: 14, background: '#fff', border: '1px solid var(--fx-mist)', borderRadius: 14, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.6 }}>
                {status !== 'completed' && <div style={{ fontWeight: 600 }}>Your pages are done. Waiting on the other teams' agents.</div>}
                <div>Unused: <b style={{ fontFamily: 'var(--font-mono)' }}>{fmt(budget.unused)}</b>. It never left your account; this release just clears the agent's allowance.</div>
                {budget.unused <= 0n ? <div style={{ color: 'var(--text-3)', marginTop: 4 }}>Your agent used the full limit, so there is nothing to release.</div> : (
                  <Button size="sm" variant="secondary" block style={{ marginTop: 10 }} disabled={budget.unused - budget.refunded <= 0n} loading={!!busy['refund:' + order.id]} onClick={() => refundUnused(order.id).then(() => notify('ok', 'Allowance released'))}>{budget.refunded > 0n ? 'Released' : 'Release unused allowance'}</Button>
                )}
              </div>
            )}
          </Panel>
          <Panel title="Agent" aside={running ? <span className="ap-live"><Badge size="sm" tone="ok">paying</Badge></span> : <Badge size="sm" mono>idle</Badge>}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>Each call: this browser seals the page for {supplier.name}, the agent key signs the 402 payment, the guard checks four things and co-signs, the rail settles USDC, and the supplier runs OCR and seals the result back to your agent key.</p>
            <div style={{ marginTop: 12, background: '#fff', border: '1px solid var(--fx-mist)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220, fontSize: 12.5, color: 'var(--text-2)' }}>
                <b style={{ color: 'var(--text-1)' }}>Your pages:</b> {uploaded > 0 ? `${uploaded} uploaded, sealed in this browser before sending` : 'none uploaded yet; the agent sends rendered sample invoices'}
              </div>
              <label className="t-btn t-btn-secondary" style={{ height: 32, fontSize: 13, padding: '0 14px', cursor: 'pointer' }}>
                Upload PDF or images
                <input type="file" accept="application/pdf,image/*" multiple style={{ display: 'none' }} onChange={async (e) => { const files = Array.from(e.target.files ?? []); if (!files.length) return; const n = await uploadPages(order.id, files); notify('ok', `${n} page${n === 1 ? '' : 's'} ready`, 'Rasterised and held in memory; each page is sealed for the supplier when the agent pays for it.'); e.target.value = ''; }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <Button size="md" disabled={status !== 'active' || running || remaining === 0} onClick={() => runAgent(order.id, Math.min(25, remaining))}>Run agent for {Math.min(25, remaining)} pages</Button>
              {remaining > 25 && <Button size="md" variant="secondary" disabled={status !== 'active' || running} onClick={() => runAgent(order.id, remaining)}>Run all {remaining}</Button>}
              <Button size="md" variant="secondary" disabled={status !== 'active' || running || remaining === 0} onClick={() => payForPage(order.id)}>Process one page</Button>
              {running && <Button size="md" variant="ghost" onClick={stopAgent}>Stop</Button>}
            </div>
            <div style={{ marginTop: 16, border: '1px dashed var(--accent-line)', background: 'var(--accent-soft)', borderRadius: 14, padding: '12px 14px' }}>
              <div className="eyebrow" style={{ color: 'var(--fx-indigo)' }}>Prove the guard</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.6 }}>Make the supplier misbehave and watch the co-signature get refused. Declined calls cost nothing.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" disabled={status !== 'active' || running} onClick={() => prove({ overcharge: true })}>Supplier asks more</Button>
                <Button size="sm" variant="secondary" disabled={status !== 'active' || running || budget.done === 0} onClick={() => prove({ replay: true })}>Replay a request</Button>
                <Button size="sm" variant="secondary" disabled={status !== 'active' || running} onClick={() => prove({ wrongSupplier: true })}>Wrong payee</Button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {(status === 'active' || status === 'completed') && (
        <Bento variant="app" pad={0}>
          <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Payments</span>
            <Badge size="sm" mono>{myPayments.length} attempts · {budget.done} settled</Badge>
          </div>
          {myPayments.length === 0 ? <p style={{ padding: '0 26px 22px', fontSize: 13, color: 'var(--text-3)' }}>No calls yet. Run the agent to see each payment land here with its guard checks and receipt.</p> : (
            <div className="ap-table-wrap">
              <table className="ap-table" style={{ minWidth: 960 }}>
                <thead><tr><Th>Page</Th><Th>Request ID</Th><Th>Amount</Th><Th>Guard</Th><Th>Outcome</Th><Th>Receipt</Th><Th>Time</Th></tr></thead>
                <tbody>{myPayments.map((p) => <LedgerRow key={p.id} p={p} live={!!me?.facilitator.live} />)}</tbody>
              </table>
            </div>
          )}
        </Bento>
      )}

      {resultRows.length > 0 && (
        <Bento variant="app" pad={0}>
          <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Results</span>
            <Badge size="sm" mono>decrypted in this browser with your agent key</Badge>
          </div>
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead><tr><Th>Page</Th><Th>Vendor</Th><Th>Invoice</Th><Th>Date</Th><Th>Total</Th><Th>Confidence</Th></tr></thead>
              <tbody>
                {resultRows.map(({ p, r }) => (
                  <tr key={p.id} className="ap-row">
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.page}</td>
                    <td>{r.vendor}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.invoiceNumber || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.date || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.total ? `${r.currency} ${r.total}` : '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--fx-indigo)' }}>{Math.round(r.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bento>
      )}
      <Note>{me?.facilitator.live ? 'Settled through the configured x402 facilitator on Hedera testnet.' : 'Settlement is simulated on this server until an x402 facilitator and a funded agent account are configured. Signatures, guard checks, sealing and OCR are real.'}</Note>
    </div>
  );
}

function LedgerRow({ p, live }: { p: Payment; live: boolean }) {
  const ticks = guardTicks(p.verdict);
  const code = p.verdict.ok === true ? null : p.verdict.code;
  return (
    <tr className="ap-row" style={p.status === 'declined' ? { background: 'var(--danger-soft)' } : undefined}>
      <td style={{ fontFamily: 'var(--font-mono)' }}>{p.page}</td>
      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{p.requestId}</td>
      <td style={{ whiteSpace: 'nowrap' }}><Money value={p.amount} /></td>
      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          {GUARD_CHECKS.map((c, i) => {
            const passed = ticks[c];
            const failedHere = !p.verdict.ok && !passed && (i === 0 || ticks[GUARD_CHECKS[i - 1]]) && code !== 'NO_DELEGATION';
            return <Badge key={c} size="sm" tone={passed ? 'ok' : failedHere ? 'danger' : 'neutral'} mono title={`${c}: ${passed ? 'ok' : failedHere ? 'failed' : 'not reached'}`}>{c === 'request id' ? 'id' : c}</Badge>;
          })}
        </div>
      </td>
      <td style={{ color: p.status === 'declined' ? 'var(--danger)' : 'var(--text-1)', minWidth: 300 }}>{describeVerdict(p.verdict, fmt)}</td>
      <td>{p.txRef ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{p.txRef.slice(0, 10)}…</span>{live ? <a href={`https://hashscan.io/testnet/transaction/${p.txRef}`} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>HashScan</a> : <SimTag />}</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{new Date(p.ts).toLocaleTimeString('en-GB')}</td>
    </tr>
  );
}

/* ---------------- Earnings (supplier) ---------------- */
function EarningsTab({ order }: { order: Order }) {
  const { state, mySupplier } = useStore();
  const quote = approvedQuote(order);
  const mine = !!quote && !!mySupplier && quote.supplierId === mySupplier.id;
  const payments = state.payments.filter((p) => p.orderId === order.id && p.status === 'settled' && p.to === mySupplier?.payoutAddress).sort((a, b) => b.ts - a.ts);
  const fees = mine ? state.reservations.filter((r) => r.orderId === order.id).reduce((a, r) => a + r.amount, 0n) : 0n;
  const calls = payments.reduce((a, p) => a + p.amount, 0n);
  if (!mine) return <Panel><p style={{ fontSize: 14, color: 'var(--text-2)' }}>{quote ? 'The group approved another supplier.' : 'Earnings appear once the group approves your quote and the order starts.'}</p></Panel>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ap-grid-4">
        <Bento variant="app" pad={20}><Stat label="Received for calls" value={<Money value={calls} />} size="sm" gradient sub={`${payments.length} settled`} /></Bento>
        <Bento variant="app" pad={20}><Stat label="Reservation fee" value={<Money value={fees} />} size="sm" mono sub="released at start" /></Bento>
        <Bento variant="app" pad={20}><Stat label="Total" value={<Money value={calls + fees} />} size="sm" mono /></Bento>
        <Bento variant="app" pad={20}><Stat label="Rate per page" value={<Money value={quote!.ratePerCall} />} size="sm" mono sub="approved by the group" /></Bento>
      </div>
      <Bento variant="app" pad={0}>
        <div style={{ padding: '20px 26px 14px' }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Settled calls</span></div>
        {payments.length === 0 ? <p style={{ padding: '0 26px 22px', fontSize: 13, color: 'var(--text-3)' }}>No calls settled yet.</p> : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead><tr><Th>Team</Th><Th>Request ID</Th><Th>Amount</Th><Th>Receipt</Th><Th>Time</Th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="ap-row">
                    <td>{state.teams.find((t) => t.id === p.teamId)?.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{p.requestId}</td>
                    <td><Money value={p.amount} /></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{p.txRef?.slice(0, 10)}…</span> <SimTag /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{new Date(p.ts).toLocaleTimeString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bento>
    </div>
  );
}
