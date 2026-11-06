import type { Micro } from './money';

export type Role = 'buyer' | 'supplier';

export type WorkloadKind = 'invoice-ocr';

export interface Profile {
  address: string;
  role: Role;
  teamName: string;
  supplierName: string;
  /** Local session key the agent uses to sign per-call payments and to receive sealed results. */
  agentAddress: string;
  agentPublicKey?: string;
  /** Signature from the wallet delegating payment authority to the agent key. */
  delegation?: { orderId: string; limit: Micro; rate: Micro; supplierId: string; signature: string; signedAt: number };
  createdAt: number;
}

export interface Team {
  id: string;
  name: string;
  address: string;
  /** Funded USDC balance visible to suppliers before quoting. */
  balance: Micro;
  simulated: boolean;
  /** Compressed secp256k1 public key results are sealed to (the team's agent key). */
  publicKey?: string;
}

export interface Supplier {
  id: string;
  name: string;
  payoutAddress: string;
  capability: WorkloadKind;
  /** Public rate the supplier lists before any group quote. */
  listRate: Micro;
  endpoint: string;
  simulated: boolean;
  /** Compressed secp256k1 public key pages are sealed to. */
  publicKey?: string;
  /** True for the built-in automated supplier that quotes by policy and runs real OCR. */
  automated?: boolean;
}

export interface TeamCommit {
  teamId: string;
  calls: number;
  /** Per-order spending limit the team set for its agent. */
  limit: Micro;
  approvedQuoteId?: string;
  joinedAt: number;
}

export interface Quote {
  id: string;
  orderId: string;
  supplierId: string;
  ratePerCall: Micro;
  /** Total reservation fee for the order, split pro-rata across teams by calls. */
  reservationFee: Micro;
  deliveryWindowHours: number;
  sampleOffered: boolean;
  signature: string;
  submittedAt: number;
}

export type StoredOrderStatus = 'draft' | 'open' | 'approved' | 'active' | 'completed';
/** `expired` and `quoted` are derived on read, never written. */
export type OrderStatus = StoredOrderStatus | 'quoted' | 'expired';

export interface Order {
  id: string;
  title: string;
  workload: WorkloadKind;
  description: string;
  createdBy: string; // teamId
  teams: TeamCommit[];
  quotes: Quote[];
  offerWindowEnd: number;
  neededBy: number;
  approvedQuoteId?: string;
  startedAt?: number;
  completedAt?: number;
  status: StoredOrderStatus;
  arkivListingId?: string;
  ccip?: { messageId: string; status: 'pending' | 'delivered'; cap: Micro; sourceChain: 'ethereum-sepolia' };
  createdAt: number;
}

export type GuardVerdict =
  | { ok: true }
  | { ok: false; code: 'WRONG_SUPPLIER'; expected: string; got: string }
  | { ok: false; code: 'OVER_RATE'; approved: Micro; asked: Micro }
  | { ok: false; code: 'REPLAY'; requestId: string; firstSeenAt: number }
  | { ok: false; code: 'ALLOWANCE_EXHAUSTED'; remaining: Micro; asked: Micro }
  | { ok: false; code: 'NO_DELEGATION' };

export type PaymentStatus = 'settled' | 'declined';

export interface Payment {
  id: string;
  orderId: string;
  teamId: string;
  requestId: string;
  page: number;
  amount: Micro;
  to: string; // supplier payout address
  status: PaymentStatus;
  verdict: GuardVerdict;
  agentSignature?: string;
  guardSignature?: string;
  txRef?: string;
  /** Reference to the sealed workload sent to the supplier and the sealed result returned. */
  sealedRequestRef?: string;
  sealedResultRef?: string;
  result?: InvoiceResult;
  ts: number;
}

export interface InvoiceResult {
  vendor: string;
  invoiceNumber: string;
  date: string;
  total: string;
  currency: string;
  confidence: number;
}

export interface LedgerEvent {
  id: string;
  ts: number;
  orderId?: string;
  kind: string;
  text: string;
  ref?: string;
}

export interface CoquireState {
  version: number;
  profile: Profile | null;
  teams: Team[];
  suppliers: Supplier[];
  orders: Order[];
  payments: Payment[];
  events: LedgerEvent[];
  /** Reservation fee transfers, recorded once per team per order when the order starts. */
  reservations: { orderId: string; teamId: string; amount: Micro; txRef: string; ts: number }[];
  refunds: { orderId: string; teamId: string; amount: Micro; txRef: string; ts: number }[];
}
