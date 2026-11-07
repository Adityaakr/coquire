import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ethers } from 'ethers';
import { api, subscribe, type Me } from '@/api/client';
import { emptyState } from '@/domain/reducer';
import { usdc, type Micro } from '@/domain/money';
import { approvedQuote, remainingAllowance, teamBudget } from '@/domain/selectors';
import type { CoquireState, InvoiceResult, Order, Payment, Role, Supplier, Team } from '@/domain/types';
import { agentKey, demoOwnerKey, resetKeys } from '@/lib/keys';
import { openJson, sealJson } from '@/lib/ecies';
import { filesToPages, sampleInvoicePage, type PageImage } from '@/lib/pages';
import { buildHederaPayload, type LiveRequirements } from '@/lib/x402live';
import { useWallet } from '@/contexts/WalletContext';

export type ToastTone = 'ok' | 'warn' | 'danger' | 'info';
export interface ToastItem { id: number; tone: ToastTone; title: string; detail?: string }
export interface PayOptions { overcharge?: boolean; replay?: boolean; wrongSupplier?: boolean }
export interface CreateOrderInput { title: string; description: string; pages: number; limit: Micro; offerWindowHours: number; neededByDays: number }
export type Delegation = Me['delegations'][string];

interface StoreValue {
  ready: boolean;
  signedIn: boolean;
  me: Me | null;
  state: CoquireState;
  toasts: ToastItem[];
  notify: (tone: ToastTone, title: string, detail?: string) => void;
  dismiss: (id: number) => void;
  ownerAddress: string | null;
  usingWallet: boolean;
  myTeam: Team | null;
  mySupplier: Supplier | null;
  role: Role;
  setRole: (r: Role) => Promise<void>;
  agentAddress: string;
  guardAddress: string;
  network: string;
  delegations: Record<string, Delegation>;
  pages: Record<string, PageImage[]>;
  results: Record<string, InvoiceResult>;
  agentRunning: string | null;
  busy: Record<string, boolean>;
  signIn: (mode: 'wallet' | 'browser') => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (input: { role: Role; teamName: string; supplierName: string; listRate: Micro }) => Promise<void>;
  createOrder: (input: CreateOrderInput) => Promise<Order>;
  joinOrder: (orderId: string, pages: number, limit: Micro) => Promise<void>;
  setLimit: (orderId: string, limit: Micro) => Promise<void>;
  submitQuote: (orderId: string, input: { ratePerCall: Micro; reservationFee: Micro; deliveryWindowHours: number; sampleOffered: boolean }) => Promise<void>;
  approveQuote: (orderId: string, quoteId: string) => Promise<void>;
  delegate: (orderId: string) => Promise<void>;
  startOrder: (orderId: string) => Promise<void>;
  uploadPages: (orderId: string, files: File[]) => Promise<number>;
  payForPage: (orderId: string, opts?: PayOptions) => Promise<Payment | null>;
  runAgent: (orderId: string, pages: number) => Promise<void>;
  stopAgent: () => void;
  refundUnused: (orderId: string) => Promise<void>;
  runSample: () => Promise<{ result: InvoiceResult; latencyMs: number; engine: string }>;
  resetLocalKeys: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);
export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const canonical = (o: Record<string, unknown>) => JSON.stringify(o, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 0);

export function StoreProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<CoquireState>({ ...emptyState });
  const stateRef = useRef(state); stateRef.current = state;
  const meRef = useRef(me); meRef.current = me;

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback((tone: ToastTone, title: string, detail?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, title, detail }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6500);
  }, []);

  const refreshState = useCallback(async () => {
    const r = await api.get<{ version: number; state: Omit<CoquireState, 'profile'> }>('/api/state');
    setState({ ...emptyState, ...r.state, profile: null });
  }, []);
  const refreshMe = useCallback(async () => {
    const m = await api.get<Me>('/api/me');
    setMe(m);
    return m;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await Promise.all([refreshMe(), refreshState()]); } catch (e) { console.error(e); } finally { if (alive) setReady(true); }
    })();
    const stop = subscribe(() => { void refreshState(); });
    return () => { alive = false; stop(); };
  }, [refreshMe, refreshState]);

  const signedIn = !!me?.account;
  const ownerAddress = me?.account?.address ?? null;
  const usingWallet = !!wallet.address && !!ownerAddress && wallet.address.toLowerCase() === ownerAddress.toLowerCase();
  const myTeam = useMemo(() => (me?.account ? state.teams.find((t) => t.address.toLowerCase() === me.account!.address) ?? null : null), [state.teams, me]);
  const mySupplier = useMemo(() => (me?.account ? state.suppliers.find((s) => s.payoutAddress.toLowerCase() === me.account!.address && !s.automated) ?? null : null), [state.suppliers, me]);
  const role: Role = me?.account?.role ?? 'buyer';

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const withBusy = useCallback(async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
    setBusy((b) => ({ ...b, [key]: true }));
    try { return await fn(); } finally { setBusy((b) => ({ ...b, [key]: false })); }
  }, []);

  /* ---------- auth ---------- */
  const signIn = useCallback<StoreValue['signIn']>(async (mode) =>
    withBusy('signIn', async () => {
      let address: string;
      let signMessage: (m: string) => Promise<string>;
      if (mode === 'wallet') {
        await wallet.connect();
        const w = await wallet.getSigner();
        if (!w) throw new Error('Wallet did not connect');
        address = await w.getAddress();
        signMessage = (m) => w.signMessage(m);
      } else {
        const k = demoOwnerKey();
        address = k.address;
        signMessage = (m) => k.signMessage(m);
      }
      const agent = agentKey();
      const { nonce, message } = await api.post<{ nonce: string; message: string }>('/api/auth/nonce', { address, agentAddress: agent.address });
      const signature = await signMessage(message);
      const agentSignature = await agent.signMessage(`Coquire agent key for ${address.toLowerCase()}`);
      await api.post('/api/auth/verify', { address, message, signature, agentAddress: agent.address, agentSignature, nonce });
      localStorage.setItem('coquire.signin', mode);
      await Promise.all([refreshMe(), refreshState()]);
    }), [refreshMe, refreshState, wallet, withBusy]);

  const signOut = useCallback(async () => { await api.post('/api/auth/signout'); setMe(await api.get<Me>('/api/me')); }, []);

  const setRole = useCallback<StoreValue['setRole']>(async (r) => { await api.post('/api/profile', { role: r }); await refreshMe(); }, [refreshMe]);

  const completeOnboarding = useCallback<StoreValue['completeOnboarding']>(async ({ role, teamName, supplierName, listRate }) => {
    await api.post('/api/profile', { role, teamName, supplierName, listRate: listRate.toString() === '0' ? '0.06' : (Number(listRate) / 1e6).toString() });
    await Promise.all([refreshMe(), refreshState()]);
  }, [refreshMe, refreshState]);

  /* ---------- orders ---------- */
  const createOrder = useCallback<StoreValue['createOrder']>(async (input) =>
    withBusy('createOrder', async () => {
      const r = await api.post<{ order: Order }>('/api/orders', { ...input, limit: `__big:${input.limit}` });
      await refreshState();
      return r.order;
    }), [refreshState, withBusy]);

  const joinOrder = useCallback<StoreValue['joinOrder']>(async (orderId, pages, limit) =>
    withBusy('join:' + orderId, async () => { await api.post(`/api/orders/${orderId}/join`, { pages, limit: `__big:${limit}` }); await refreshState(); }), [refreshState, withBusy]);

  const setLimit = useCallback<StoreValue['setLimit']>(async (orderId, limit) => { await api.post(`/api/orders/${orderId}/limit`, { limit: `__big:${limit}` }); await refreshState(); }, [refreshState]);

  const submitQuote = useCallback<StoreValue['submitQuote']>(async (orderId, input) =>
    withBusy('quote:' + orderId, async () => {
      const m = meRef.current; if (!m?.account) throw new Error('Sign in first');
      const payload = { orderId, supplier: m.account.address, ratePerCall: input.ratePerCall, reservationFee: input.reservationFee, deliveryWindowHours: input.deliveryWindowHours };
      const msg = `Coquire quote\n${canonical(payload)}`;
      const signature = usingWallet ? await (await wallet.getSigner())!.signMessage(msg) : await demoOwnerKey().signMessage(msg);
      await api.post(`/api/orders/${orderId}/quote`, { ratePerCall: `__big:${input.ratePerCall}`, reservationFee: `__big:${input.reservationFee}`, deliveryWindowHours: input.deliveryWindowHours, sampleOffered: input.sampleOffered, signature });
      await refreshState();
    }), [refreshState, usingWallet, wallet, withBusy]);

  const approveQuote = useCallback<StoreValue['approveQuote']>(async (orderId, quoteId) =>
    withBusy('approve:' + orderId, async () => { await api.post(`/api/orders/${orderId}/approve`, { quoteId }); await refreshState(); }), [refreshState, withBusy]);

  const delegate = useCallback<StoreValue['delegate']>(async (orderId) =>
    withBusy('delegate:' + orderId, async () => {
      const m = meRef.current; const s = stateRef.current;
      const order = s.orders.find((o) => o.id === orderId); const quote = order && approvedQuote(order);
      const team = s.teams.find((t) => t.address.toLowerCase() === m?.account?.address);
      const commit = order?.teams.find((t) => t.teamId === team?.id);
      if (!m?.account || !order || !quote || !commit) throw new Error('Order is not approved for your team');
      const sup = s.suppliers.find((x) => x.id === quote.supplierId)!;
      const payload = { statement: 'I authorise my Coquire agent to pay this supplier at or below this rate, up to this limit, for this order.', orderId, agent: m.account.agentAddress, supplier: sup.payoutAddress, ratePerCall: quote.ratePerCall, limit: commit.limit, network: 'hedera:testnet' };
      const msg = `Coquire delegation\n${canonical(payload)}`;
      const signature = usingWallet ? await (await wallet.getSigner())!.signMessage(msg) : await demoOwnerKey().signMessage(msg);
      await api.post(`/api/orders/${orderId}/delegate`, { signature });
      await Promise.all([refreshMe(), refreshState()]);
    }), [refreshMe, refreshState, usingWallet, wallet, withBusy]);

  const startOrder = useCallback<StoreValue['startOrder']>(async (orderId) =>
    withBusy('start:' + orderId, async () => { await api.post(`/api/orders/${orderId}/start`); await refreshState(); }), [refreshState, withBusy]);

  /* ---------- pages, payments, results ---------- */
  const [pages, setPages] = useState<Record<string, PageImage[]>>({});
  const pagesRef = useRef(pages); pagesRef.current = pages;
  const uploadPages = useCallback<StoreValue['uploadPages']>(async (orderId, files) => {
    const imgs = await filesToPages(files);
    setPages((p) => ({ ...p, [orderId]: [...(p[orderId] ?? []), ...imgs].map((x, i) => ({ ...x, page: i + 1 })) }));
    return imgs.length;
  }, []);

  const [results, setResults] = useState<Record<string, InvoiceResult>>({});
  const fetching = useRef<Set<string>>(new Set());
  useEffect(() => {
    const team = myTeam; if (!team) return;
    for (const p of state.payments) {
      if (p.teamId !== team.id || p.status !== 'settled' || !p.sealedResultRef || results[p.id] || fetching.current.has(p.id)) continue;
      fetching.current.add(p.id);
      api.get<{ envelopeHex: string }>(`/api/blobs/${p.sealedResultRef}`).then((b) => {
        const r = openJson<InvoiceResult>(b.envelopeHex, agentKey().privateKey);
        setResults((x) => ({ ...x, [p.id]: r }));
      }).catch(() => fetching.current.delete(p.id));
    }
  }, [state.payments, myTeam, results]);

  const payForPage = useCallback<StoreValue['payForPage']>(async (orderId, opts = {}) => {
    const s = stateRef.current; const m = meRef.current;
    const order = s.orders.find((o) => o.id === orderId); const quote = order && approvedQuote(order);
    const team = s.teams.find((t) => t.address.toLowerCase() === m?.account?.address);
    if (!m?.account || !order || !quote || !team || order.status !== 'active') return null;
    const supplier = s.suppliers.find((x) => x.id === quote.supplierId)!;
    const budget = teamBudget(s, order, team.id);
    const page = budget.done + 1;
    const settled = s.payments.filter((p) => p.orderId === orderId && p.teamId === team.id && p.status === 'settled');
    const requestId = opts.replay && settled.length ? settled[settled.length - 1].requestId : `req_${orderId.slice(-4)}_${team.id.slice(-2)}_${page.toString().padStart(4, '0')}`;
    const amount = opts.overcharge ? quote.ratePerCall + usdc(0.02) : quote.ratePerCall;
    const payTo = opts.wrongSupplier ? ethers.Wallet.createRandom().address : supplier.payoutAddress;

    let sealedRequestRef: string | undefined;
    if (supplier.publicKey) {
      const img = pagesRef.current[orderId]?.[page - 1] ?? sampleInvoicePage(page);
      const envelopeHex = sealJson({ mime: img.mime, bytesHex: hex(img.bytes), page, name: img.name }, supplier.publicKey);
      const b = await api.post<{ ref: string }>('/api/blobs', { envelopeHex, forAddress: supplier.payoutAddress, mime: 'application/x-ecies+json' });
      sealedRequestRef = b.ref;
    }
    const requirements = { requestId, resource: `${m.resourceBase}/${requestId}`, payTo, amount: amount.toString(), asset: 'USDC', network: m.network };
    const agentSignature = await agentKey().signMessage(JSON.stringify(requirements));
    let x402Payload: unknown;
    if (m.facilitator.live && !opts.wrongSupplier) {
      const lr = await api.get<{ live: boolean; requirements?: LiveRequirements }>(`/api/orders/${orderId}/requirements?requestId=${encodeURIComponent(requestId)}&amount=__big:${amount}`);
      if (lr.live && lr.requirements) x402Payload = await buildHederaPayload(lr.requirements);
    }
    const r = await api.post<{ payment: Payment }>(`/api/orders/${orderId}/pay`, { requestId, amount: `__big:${amount}`, payTo, sealedRequestRef, agentSignature, x402Payload });
    await refreshState();
    return r.payment;
  }, [refreshState]);

  const [agentRunning, setAgentRunning] = useState<string | null>(null);
  const stopFlag = useRef(false);
  const runAgent = useCallback<StoreValue['runAgent']>(async (orderId, n) => {
    stopFlag.current = false; setAgentRunning(orderId);
    try {
      for (let i = 0; i < n; i++) {
        if (stopFlag.current) break;
        const s = stateRef.current; const m = meRef.current;
        const order = s.orders.find((o) => o.id === orderId);
        const team = s.teams.find((t) => t.address.toLowerCase() === m?.account?.address);
        if (!order || !team || order.status !== 'active') break;
        if (remainingAllowance(s, order, team.id) < (approvedQuote(order)?.ratePerCall ?? 0n)) break;
        const b = teamBudget(s, order, team.id);
        if (b.done >= b.calls) break;
        try { await payForPage(orderId); } catch (e) { notify('danger', 'Agent stopped', (e as Error).message); break; }
        await sleep(80);
      }
    } finally { setAgentRunning(null); }
  }, [notify, payForPage]);
  const stopAgent = useCallback(() => { stopFlag.current = true; }, []);

  const refundUnused = useCallback<StoreValue['refundUnused']>(async (orderId) =>
    withBusy('refund:' + orderId, async () => { await api.post(`/api/orders/${orderId}/release`); await refreshState(); }), [refreshState, withBusy]);

  const runSample = useCallback(() => api.get<{ result: InvoiceResult; latencyMs: number; engine: string }>('/supplier/v1/sample'), []);

  const resetLocalKeys = useCallback(async () => { resetKeys(); await signOut(); }, [signOut]);

  const value: StoreValue = {
    ready, signedIn, me, state, toasts, notify, dismiss, ownerAddress, usingWallet, myTeam, mySupplier, role, setRole,
    agentAddress: agentKey().address, guardAddress: me?.guardAddress ?? '', network: me?.network ?? 'hedera:testnet',
    delegations: me?.delegations ?? {}, pages, results, agentRunning, busy,
    signIn, signOut, completeOnboarding, createOrder, joinOrder, setLimit, submitQuote, approveQuote, delegate, startOrder, uploadPages, payForPage, runAgent, stopAgent, refundUnused, runSample, resetLocalKeys,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
