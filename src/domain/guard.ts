import type { CoquireState, GuardVerdict, Order, Quote } from './types';
import type { Micro } from './money';
import { remainingAllowance } from './selectors';

export interface PaymentProposal {
  orderId: string;
  teamId: string;
  requestId: string;
  supplierId: string;
  amount: Micro;
}

/**
 * Pure guard. Checks in order: supplier → rate → replay → allowance.
 * Only settled payments feed the replay set so a declined attempt never poisons a legitimate retry.
 */
export function guard(state: CoquireState, order: Order, quote: Quote, p: PaymentProposal, hasDelegation: boolean): GuardVerdict {
  if (!hasDelegation) return { ok: false, code: 'NO_DELEGATION' };
  if (p.supplierId !== quote.supplierId) {
    return { ok: false, code: 'WRONG_SUPPLIER', expected: quote.supplierId, got: p.supplierId };
  }
  if (p.amount > quote.ratePerCall) {
    return { ok: false, code: 'OVER_RATE', approved: quote.ratePerCall, asked: p.amount };
  }
  const seen = state.payments.find(
    x => x.orderId === p.orderId && x.teamId === p.teamId && x.status === 'settled' && x.requestId === p.requestId,
  );
  if (seen) return { ok: false, code: 'REPLAY', requestId: p.requestId, firstSeenAt: seen.ts };
  const remaining = remainingAllowance(state, order, p.teamId);
  if (p.amount > remaining) {
    return { ok: false, code: 'ALLOWANCE_EXHAUSTED', remaining, asked: p.amount };
  }
  return { ok: true };
}

export const GUARD_CHECKS = ['supplier', 'rate', 'request id', 'allowance'] as const;
export type GuardCheck = (typeof GUARD_CHECKS)[number];

/** Which of the four checks passed, for the four-tick UI. */
export function guardTicks(v: GuardVerdict): Record<GuardCheck, boolean> {
  if (v.ok === true) return { supplier: true, rate: true, 'request id': true, allowance: true };
  const order: GuardCheck[] = ['supplier', 'rate', 'request id', 'allowance'];
  const failedAt: Record<string, number> = {
    NO_DELEGATION: -1,
    WRONG_SUPPLIER: 0,
    OVER_RATE: 1,
    REPLAY: 2,
    ALLOWANCE_EXHAUSTED: 3,
  };
  const idx = failedAt[v.code] ?? -1;
  const out = {} as Record<GuardCheck, boolean>;
  order.forEach((c, i) => {
    out[c] = i < idx;
  });
  return out;
}

export function describeVerdict(v: GuardVerdict, fmt: (m: Micro) => string): string {
  if (v.ok === true) return 'Co-signed';
  switch (v.code) {
    case 'WRONG_SUPPLIER':
      return `Declined: payee is not the approved supplier`;
    case 'OVER_RATE':
      return `Declined: asked ${fmt(v.asked)}, approved rate is ${fmt(v.approved)}`;
    case 'REPLAY':
      return `Declined: request ${v.requestId} was already settled`;
    case 'ALLOWANCE_EXHAUSTED':
      return `Declined: asked ${fmt(v.asked)}, only ${fmt(v.remaining)} of the limit remains`;
    case 'NO_DELEGATION':
      return 'Declined: the agent has no signed permission for this order';
  }
}
