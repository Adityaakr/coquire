import { describe, expect, it } from 'vitest';
import { formatUSDC, splitProRata, usdc } from '@/domain/money';
import { guard } from '@/domain/guard';
import { emptyState, reducer } from '@/domain/reducer';
import { orderStatus, reservationShares, teamBudget, teamCostAtQuote } from '@/domain/selectors';
import type { CoquireState, Order, Payment, Quote } from '@/domain/types';

const now = 1_800_000_000_000;

function fixture(): { state: CoquireState; order: Order; quote: Quote } {
  const quote: Quote = { id: 'q1', orderId: 'o1', supplierId: 'sup_a', ratePerCall: usdc(0.045), reservationFee: usdc(2), deliveryWindowHours: 48, sampleOffered: true, signature: '0x', submittedAt: now };
  const order: Order = {
    id: 'o1', title: 't', workload: 'invoice-ocr', description: '', createdBy: 'team_a',
    teams: [
      { teamId: 'team_a', calls: 150, limit: usdc(6.75), joinedAt: now, approvedQuoteId: 'q1' },
      { teamId: 'team_b', calls: 50, limit: usdc(2.25), joinedAt: now, approvedQuoteId: 'q1' },
    ],
    quotes: [quote], offerWindowEnd: now + 1000, neededBy: now + 5000, approvedQuoteId: 'q1', status: 'active', createdAt: now,
  };
  const state: CoquireState = {
    ...emptyState,
    profile: { address: '0xA', role: 'buyer', teamName: 'A', supplierName: 'A', agentAddress: '0xAgent', createdAt: now, delegation: { orderId: 'o1', limit: usdc(6.75), rate: usdc(0.045), supplierId: 'sup_a', signature: '0x', signedAt: now } },
    teams: [{ id: 'team_a', name: 'A', address: '0xA', balance: usdc(25), simulated: false }, { id: 'team_b', name: 'B', address: '0xB', balance: usdc(25), simulated: true }],
    suppliers: [{ id: 'sup_a', name: 'S', payoutAddress: '0xS', capability: 'invoice-ocr', listRate: usdc(0.06), endpoint: '', simulated: true }],
    orders: [order],
  };
  return { state, order, quote };
}

describe('money', () => {
  it('parses and formats without float drift', () => {
    expect(usdc(0.045)).toBe(45_000n);
    expect(usdc('0.1') + usdc('0.2')).toBe(usdc('0.3'));
    expect(formatUSDC(usdc(6.75))).toBe('6.75 USDC');
    expect(formatUSDC(1n, { compact: false })).toBe('0.000001 USDC');
  });
  it('splits pro-rata and sums exactly', () => {
    const shares = splitProRata(usdc(2), [150, 50]);
    expect(shares).toEqual([usdc(1.5), usdc(0.5)]);
    const odd = splitProRata(1_000_001n, [1, 1, 1]);
    expect(odd.reduce((a, b) => a + b, 0n)).toBe(1_000_001n);
  });
});

describe('pricing example reconciles', () => {
  it('matches the landing page table', () => {
    const { order, quote } = fixture();
    const a = teamCostAtQuote(order, quote, 'team_a');
    const b = teamCostAtQuote(order, quote, 'team_b');
    expect(a).toEqual({ calls: usdc(6.75), reservation: usdc(1.5), total: usdc(8.25) });
    expect(b).toEqual({ calls: usdc(2.25), reservation: usdc(0.5), total: usdc(2.75) });
    const shares = reservationShares(order, quote);
    expect(shares.team_a + shares.team_b).toBe(quote.reservationFee);
    expect(a.total + b.total).toBe(usdc(11));
  });
});

describe('guard', () => {
  const settled = (requestId: string, amount = usdc(0.045)): Payment => ({ id: requestId, orderId: 'o1', teamId: 'team_a', requestId, page: 1, amount, to: '0xS', status: 'settled', verdict: { ok: true }, ts: now });

  it('co-signs a clean call', () => {
    const { state, order, quote } = fixture();
    expect(guard(state, order, quote, { orderId: 'o1', teamId: 'team_a', requestId: 'r1', supplierId: 'sup_a', amount: usdc(0.045) }, true)).toEqual({ ok: true });
  });
  it('declines in order: supplier, rate, replay, allowance', () => {
    const { state, order, quote } = fixture();
    const base = { orderId: 'o1', teamId: 'team_a', requestId: 'r1', supplierId: 'sup_a', amount: usdc(0.045) };
    expect(guard(state, order, quote, { ...base, supplierId: 'other', amount: usdc(9) }, true)).toMatchObject({ ok: false, code: 'WRONG_SUPPLIER' });
    expect(guard(state, order, quote, { ...base, amount: usdc(0.065) }, true)).toMatchObject({ ok: false, code: 'OVER_RATE', approved: usdc(0.045), asked: usdc(0.065) });
    const replayed = { ...state, payments: [settled('r1')] };
    expect(guard(replayed, order, quote, base, true)).toMatchObject({ ok: false, code: 'REPLAY', requestId: 'r1' });
    const exhausted = { ...state, payments: Array.from({ length: 150 }, (_, i) => settled(`p${i}`)) };
    expect(guard(exhausted, order, quote, { ...base, requestId: 'fresh' }, true)).toMatchObject({ ok: false, code: 'ALLOWANCE_EXHAUSTED', remaining: 0n });
  });
  it('a declined attempt does not poison a retry with the same request id', () => {
    const { state, order, quote } = fixture();
    const declined: Payment = { ...settled('r1', usdc(0.065)), status: 'declined', verdict: { ok: false, code: 'OVER_RATE', approved: usdc(0.045), asked: usdc(0.065) } };
    expect(guard({ ...state, payments: [declined] }, order, quote, { orderId: 'o1', teamId: 'team_a', requestId: 'r1', supplierId: 'sup_a', amount: usdc(0.045) }, true)).toEqual({ ok: true });
  });
  it('requires a signed delegation', () => {
    const { state, order, quote } = fixture();
    expect(guard(state, order, quote, { orderId: 'o1', teamId: 'team_a', requestId: 'r1', supplierId: 'sup_a', amount: usdc(0.045) }, false)).toMatchObject({ ok: false, code: 'NO_DELEGATION' });
  });
});

describe('budget and lifecycle', () => {
  it('derives allowance from settled payments only and never from the reservation fee', () => {
    const { state, order } = fixture();
    const withPayments: CoquireState = {
      ...state,
      payments: [
        { id: 'a', orderId: 'o1', teamId: 'team_a', requestId: 'r1', page: 1, amount: usdc(0.045), to: '0xS', status: 'settled', verdict: { ok: true }, ts: now },
        { id: 'b', orderId: 'o1', teamId: 'team_a', requestId: 'r2', page: 2, amount: usdc(0.065), to: '0xS', status: 'declined', verdict: { ok: false, code: 'OVER_RATE', approved: usdc(0.045), asked: usdc(0.065) }, ts: now },
      ],
      reservations: [{ orderId: 'o1', teamId: 'team_a', amount: usdc(1.5), txRef: '0x', ts: now }],
    };
    const b = teamBudget(withPayments, order, 'team_a');
    expect(b.spent).toBe(usdc(0.045));
    expect(b.remaining).toBe(usdc(6.75) - usdc(0.045));
    expect(b.done).toBe(1);
    expect(b.reservationPaid).toBe(true);
    expect(b.unused).toBe(usdc(6.705));
  });
  it('derives expired and quoted on read', () => {
    const { order } = fixture();
    const open: Order = { ...order, status: 'open', approvedQuoteId: undefined };
    expect(orderStatus(open, now)).toBe('quoted');
    expect(orderStatus({ ...open, quotes: [] }, now)).toBe('open');
    expect(orderStatus(open, now + 5000)).toBe('expired');
  });
  it('approves only when every team picks the same quote, then completes when all calls settle', () => {
    const { state, order } = fixture();
    let s: CoquireState = { ...state, orders: [{ ...order, status: 'open', approvedQuoteId: undefined, teams: order.teams.map(t => ({ ...t, approvedQuoteId: undefined, calls: 1 })) }] };
    s = reducer(s, { type: 'APPROVE_QUOTE', orderId: 'o1', teamId: 'team_a', quoteId: 'q1' });
    expect(s.orders[0].status).toBe('open');
    s = reducer(s, { type: 'APPROVE_QUOTE', orderId: 'o1', teamId: 'team_b', quoteId: 'q1' });
    expect(s.orders[0].status).toBe('approved');
    s = reducer(s, { type: 'START_ORDER', orderId: 'o1', reservations: [], ts: now });
    expect(s.orders[0].status).toBe('active');
    const pay = (team: string, id: string): Payment => ({ id, orderId: 'o1', teamId: team, requestId: id, page: 1, amount: usdc(0.045), to: '0xS', status: 'settled', verdict: { ok: true }, ts: now });
    s = reducer(s, { type: 'RECORD_PAYMENT', payment: pay('team_a', 'x') });
    expect(s.orders[0].status).toBe('active');
    s = reducer(s, { type: 'RECORD_PAYMENT', payment: pay('team_b', 'y') });
    expect(s.orders[0].status).toBe('completed');
  });
});
