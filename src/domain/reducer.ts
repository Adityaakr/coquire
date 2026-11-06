import type { CoquireState, GuardVerdict, InvoiceResult, Order, Payment, Profile, Quote, Role, Supplier, Team, TeamCommit } from './types';
import type { Micro } from './money';
import { allCallsDone } from './selectors';

export const STATE_VERSION = 3;

export const emptyState: CoquireState = {
  version: STATE_VERSION,
  profile: null,
  teams: [],
  suppliers: [],
  orders: [],
  payments: [],
  events: [],
  reservations: [],
  refunds: [],
};

export type Action =
  | { type: 'SET_PROFILE'; profile: Profile }
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'SET_DELEGATION'; delegation: Profile['delegation'] }
  | { type: 'UPSERT_TEAM'; team: Team }
  | { type: 'UPSERT_SUPPLIER'; supplier: Supplier }
  | { type: 'SEED'; teams: Team[]; suppliers: Supplier[]; orders: Order[] }
  | { type: 'CREATE_ORDER'; order: Order }
  | { type: 'LISTED'; orderId: string; listingId: string }
  | { type: 'JOIN_ORDER'; orderId: string; commit: TeamCommit }
  | { type: 'SET_LIMIT'; orderId: string; teamId: string; limit: Micro }
  | { type: 'SUBMIT_QUOTE'; quote: Quote }
  | { type: 'APPROVE_QUOTE'; orderId: string; teamId: string; quoteId: string }
  | { type: 'CCIP_REQUESTED'; orderId: string; messageId: string; cap: Micro }
  | { type: 'CCIP_DELIVERED'; orderId: string; messageId: string }
  | { type: 'START_ORDER'; orderId: string; reservations: { teamId: string; amount: Micro; txRef: string }[]; ts: number }
  | { type: 'RECORD_PAYMENT'; payment: Payment }
  | { type: 'ATTACH_RESULT'; paymentId: string; sealedResultRef: string; result: InvoiceResult }
  | { type: 'REFUND'; orderId: string; teamId: string; amount: Micro; txRef: string; ts: number }
  | { type: 'LOG'; kind: string; text: string; orderId?: string; ref?: string }
  | { type: 'RESET' };

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function log(state: CoquireState, kind: string, text: string, orderId?: string, ref?: string): CoquireState {
  return {
    ...state,
    events: [{ id: newId('ev'), ts: Date.now(), kind, text, orderId, ref }, ...state.events].slice(0, 500),
  };
}

function updateOrder(state: CoquireState, orderId: string, fn: (o: Order) => Order): CoquireState {
  return { ...state, orders: state.orders.map(o => (o.id === orderId ? fn(o) : o)) };
}

export function reducer(state: CoquireState, action: Action): CoquireState {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: action.profile };
    case 'SET_ROLE':
      return state.profile ? { ...state, profile: { ...state.profile, role: action.role } } : state;
    case 'SET_DELEGATION':
      return state.profile ? { ...state, profile: { ...state.profile, delegation: action.delegation } } : state;
    case 'UPSERT_TEAM': {
      const exists = state.teams.some(t => t.id === action.team.id);
      return { ...state, teams: exists ? state.teams.map(t => (t.id === action.team.id ? action.team : t)) : [...state.teams, action.team] };
    }
    case 'UPSERT_SUPPLIER': {
      const exists = state.suppliers.some(s => s.id === action.supplier.id);
      return {
        ...state,
        suppliers: exists ? state.suppliers.map(s => (s.id === action.supplier.id ? action.supplier : s)) : [...state.suppliers, action.supplier],
      };
    }
    case 'SEED': {
      const teamIds = new Set(state.teams.map(t => t.id));
      const supIds = new Set(state.suppliers.map(s => s.id));
      const orderIds = new Set(state.orders.map(o => o.id));
      return log(
        {
          ...state,
          teams: [...state.teams, ...action.teams.filter(t => !teamIds.has(t.id))],
          suppliers: [...state.suppliers, ...action.suppliers.filter(s => !supIds.has(s.id))],
          orders: [...state.orders, ...action.orders.filter(o => !orderIds.has(o.id))],
        },
        'seed',
        'Sample suppliers and an open order from another group were loaded',
      );
    }
    case 'CREATE_ORDER':
      return log({ ...state, orders: [action.order, ...state.orders] }, 'order', `Order created: ${action.order.title}`, action.order.id);
    case 'LISTED':
      return log(
        updateOrder(state, action.orderId, o => ({ ...o, status: o.status === 'draft' ? 'open' : o.status, arkivListingId: action.listingId })),
        'arkiv',
        `Order listed on Arkiv as ${action.listingId}`,
        action.orderId,
        action.listingId,
      );
    case 'JOIN_ORDER': {
      const order = state.orders.find(o => o.id === action.orderId);
      if (!order || order.teams.some(t => t.teamId === action.commit.teamId)) return state;
      const team = state.teams.find(t => t.id === action.commit.teamId);
      return log(
        updateOrder(state, action.orderId, o => ({ ...o, teams: [...o.teams, action.commit] })),
        'group',
        `${team?.name ?? 'A team'} joined with ${action.commit.calls} pages`,
        action.orderId,
      );
    }
    case 'SET_LIMIT':
      return updateOrder(state, action.orderId, o => ({
        ...o,
        teams: o.teams.map(t => (t.teamId === action.teamId ? { ...t, limit: action.limit } : t)),
      }));
    case 'SUBMIT_QUOTE': {
      const sup = state.suppliers.find(s => s.id === action.quote.supplierId);
      return log(
        updateOrder(state, action.quote.orderId, o => ({ ...o, quotes: [...o.quotes.filter(q => q.supplierId !== action.quote.supplierId), action.quote] })),
        'quote',
        `${sup?.name ?? 'A supplier'} submitted a signed quote`,
        action.quote.orderId,
        action.quote.id,
      );
    }
    case 'APPROVE_QUOTE': {
      const order = state.orders.find(o => o.id === action.orderId);
      if (!order || order.status !== 'open') return state;
      const teams = order.teams.map(t => (t.teamId === action.teamId ? { ...t, approvedQuoteId: action.quoteId } : t));
      const unanimous = teams.length > 0 && teams.every(t => t.approvedQuoteId === action.quoteId);
      const team = state.teams.find(t => t.id === action.teamId);
      let next = updateOrder(state, action.orderId, o => ({
        ...o,
        teams,
        ...(unanimous ? { status: 'approved' as const, approvedQuoteId: action.quoteId } : {}),
      }));
      next = log(next, 'approval', `${team?.name ?? 'A team'} approved a quote`, action.orderId, action.quoteId);
      if (unanimous) next = log(next, 'approval', 'Group approved the quote. Price per call and deadline are now fixed.', action.orderId, action.quoteId);
      return next;
    }
    case 'CCIP_REQUESTED':
      return log(
        updateOrder(state, action.orderId, o => ({ ...o, ccip: { messageId: action.messageId, status: 'pending', cap: action.cap, sourceChain: 'ethereum-sepolia' } })),
        'ccip',
        'Treasury approval message sent (simulated CCIP, Ethereum Sepolia to Hedera testnet)',
        action.orderId,
        action.messageId,
      );
    case 'CCIP_DELIVERED':
      return log(
        updateOrder(state, action.orderId, o => (o.ccip && o.ccip.messageId === action.messageId ? { ...o, ccip: { ...o.ccip, status: 'delivered' } } : o)),
        'ccip',
        'Treasury approval delivered on Hedera testnet (simulated)',
        action.orderId,
        action.messageId,
      );
    case 'START_ORDER': {
      const order = state.orders.find(o => o.id === action.orderId);
      if (!order || order.status !== 'approved') return state;
      const reservations = action.reservations.map(r => ({ orderId: action.orderId, teamId: r.teamId, amount: r.amount, txRef: r.txRef, ts: action.ts }));
      return log(
        {
          ...updateOrder(state, action.orderId, o => ({ ...o, status: 'active', startedAt: action.ts })),
          reservations: [...state.reservations, ...reservations],
        },
        'order',
        'Order started. Reservation fee released to the supplier. Agents may now pay per call.',
        action.orderId,
      );
    }
    case 'RECORD_PAYMENT': {
      const p = action.payment;
      let next: CoquireState = { ...state, payments: [...state.payments, p] };
      const order = next.orders.find(o => o.id === p.orderId);
      if (order && order.status === 'active' && p.status === 'settled' && allCallsDone(next, order)) {
        next = updateOrder(next, order.id, o => ({ ...o, status: 'completed', completedAt: p.ts }));
        next = log(next, 'order', 'All committed pages processed. Order completed.', order.id);
      }
      return next;
    }
    case 'ATTACH_RESULT':
      return {
        ...state,
        payments: state.payments.map(p => (p.id === action.paymentId ? { ...p, sealedResultRef: action.sealedResultRef, result: action.result } : p)),
      };
    case 'REFUND':
      return log(
        { ...state, refunds: [...state.refunds, { orderId: action.orderId, teamId: action.teamId, amount: action.amount, txRef: action.txRef, ts: action.ts }] },
        'refund',
        'Unused balance moved back to the team account',
        action.orderId,
        action.txRef,
      );
    case 'LOG':
      return log(state, action.kind, action.text, action.orderId, action.ref);
    case 'RESET':
      return { ...emptyState };
    default:
      return state;
  }
}

export type { GuardVerdict };
