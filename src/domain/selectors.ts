import type { CoquireState, Order, OrderStatus, Quote, TeamCommit } from './types';
import { splitProRata, type Micro } from './money';

export function orderStatus(order: Order, now = Date.now()): OrderStatus {
  if (order.status === 'open') {
    if (now > order.offerWindowEnd) return 'expired';
    return order.quotes.length > 0 ? 'quoted' : 'open';
  }
  if (order.status === 'approved' && now > order.neededBy) return 'expired';
  return order.status;
}

export function totalCalls(order: Order): number {
  return order.teams.reduce((a, t) => a + t.calls, 0);
}

export function approvedQuote(order: Order): Quote | undefined {
  return order.quotes.find(q => q.id === order.approvedQuoteId);
}

export function teamCommit(order: Order, teamId: string): TeamCommit | undefined {
  return order.teams.find(t => t.teamId === teamId);
}

/** Each team's share of a quote's reservation fee, pro-rata by calls. Sums exactly to the fee. */
export function reservationShares(order: Order, quote: Quote): Record<string, Micro> {
  const shares = splitProRata(quote.reservationFee, order.teams.map(t => t.calls));
  return Object.fromEntries(order.teams.map((t, i) => [t.teamId, shares[i]]));
}

export function reservationShare(order: Order, quote: Quote, teamId: string): Micro {
  return reservationShares(order, quote)[teamId] ?? 0n;
}

/** What a team would pay at full expected usage under a quote. */
export function teamCostAtQuote(order: Order, quote: Quote, teamId: string): { calls: Micro; reservation: Micro; total: Micro } {
  const commit = teamCommit(order, teamId);
  const calls = BigInt(commit?.calls ?? 0) * quote.ratePerCall;
  const reservation = reservationShare(order, quote, teamId);
  return { calls, reservation, total: calls + reservation };
}

/** Cost if the team bought alone at the supplier's list rate, for the side-by-side. */
export function teamCostAlone(order: Order, listRate: Micro, teamId: string): Micro {
  const commit = teamCommit(order, teamId);
  return BigInt(commit?.calls ?? 0) * listRate;
}

export function settledPayments(state: CoquireState, orderId: string, teamId?: string) {
  return state.payments.filter(p => p.orderId === orderId && p.status === 'settled' && (!teamId || p.teamId === teamId));
}

export function spentOnCalls(state: CoquireState, orderId: string, teamId: string): Micro {
  return settledPayments(state, orderId, teamId).reduce((a, p) => a + p.amount, 0n);
}

/** Per-call allowance = team limit − settled call spend. The reservation fee is paid separately and never reduces the per-call cap. */
export function remainingAllowance(state: CoquireState, order: Order, teamId: string): Micro {
  const commit = teamCommit(order, teamId);
  if (!commit) return 0n;
  const remaining = commit.limit - spentOnCalls(state, order.id, teamId);
  return remaining < 0n ? 0n : remaining;
}

export function callsDone(state: CoquireState, orderId: string, teamId: string): number {
  return settledPayments(state, orderId, teamId).length;
}

export function allCallsDone(state: CoquireState, order: Order): boolean {
  return order.teams.every(t => callsDone(state, order.id, t.teamId) >= t.calls);
}

export function supplierEarnings(state: CoquireState, supplierPayout: string): Micro {
  const calls = state.payments.filter(p => p.status === 'settled' && p.to === supplierPayout).reduce((a, p) => a + p.amount, 0n);
  const fees = state.reservations
    .filter(r => {
      const o = state.orders.find(x => x.id === r.orderId);
      const q = o && approvedQuote(o);
      const s = q && state.suppliers.find(x => x.id === q.supplierId);
      return s?.payoutAddress === supplierPayout;
    })
    .reduce((a, r) => a + r.amount, 0n);
  return calls + fees;
}

/** Budget view for one team on one order. Everything derived; nothing stored. */
export function teamBudget(state: CoquireState, order: Order, teamId: string) {
  const commit = teamCommit(order, teamId);
  const quote = approvedQuote(order);
  const limit = commit?.limit ?? 0n;
  const spent = spentOnCalls(state, order.id, teamId);
  const reservation = quote ? reservationShare(order, quote, teamId) : 0n;
  const reservationPaid = state.reservations.some(r => r.orderId === order.id && r.teamId === teamId);
  const expected = quote ? BigInt(commit?.calls ?? 0) * quote.ratePerCall : 0n;
  const refunded = state.refunds.filter(r => r.orderId === order.id && r.teamId === teamId).reduce((a, r) => a + r.amount, 0n);
  return {
    limit,
    spent,
    remaining: remainingAllowance(state, order, teamId),
    reservation,
    reservationPaid,
    expected,
    unused: limit - spent,
    refunded,
    done: callsDone(state, order.id, teamId),
    calls: commit?.calls ?? 0,
  };
}

export function activeTeamId(state: CoquireState): string | null {
  const p = state.profile;
  if (!p) return null;
  return state.teams.find(t => t.address.toLowerCase() === p.address.toLowerCase())?.id ?? null;
}

export function activeSupplierId(state: CoquireState): string | null {
  const p = state.profile;
  if (!p) return null;
  return state.suppliers.find(s => s.payoutAddress.toLowerCase() === p.address.toLowerCase())?.id ?? null;
}
