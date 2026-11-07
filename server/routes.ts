import { Router, type Request, type Response } from 'express';
import { ethers } from 'ethers';
import { db, now } from './db.js';
import { clearSession, getAccount, issueNonce, readSession, requireAuth, setSession, signInMessage, verifySignIn, type AuthedRequest } from './auth.js';
import { apply, getState, getVersion, publicState, serialize } from './state.js';
import { subscribe } from './sse.js';
import { newId } from '../src/domain/reducer.js';
import { usdc, type Micro } from '../src/domain/money.js';
import { approvedQuote, remainingAllowance, reservationShares, teamBudget, totalCalls } from '../src/domain/selectors.js';
import { guard } from '../src/domain/guard.js';
import type { Order, Payment, Quote, Team } from '../src/domain/types.js';
import { facilitator, NETWORK, settle, transfer, verifySettlement } from './rail.js';
import { LIVE as X402_LIVE, liveRequirements, type LivePayload, type LiveRequirements } from './x402live.js';
import { quoteFor, requirementsFor, SUPPLIER_ID, supplierKey, supplierProfile } from './supplier/routes.js';
import { publicKeyOf } from '../src/lib/ecies.js';
import { discovery } from './arkiv.js';
import { ccip } from './ccip.js';
import { createAgentAccount, FUNDING_ENABLED, hashscanAccount, hashscanTx, mirrorAccount, sendUsdc, supplierBalances, USDC as USDC_TOKEN } from './hedera.js';

export const api = Router();
const json = (res: Response, v: unknown, status = 200) => { res.status(status).type('application/json').send(serialize(v)); };
const big = (v: unknown): Micro => (typeof v === 'string' && v.startsWith('__big:') ? BigInt(v.slice(6)) : typeof v === 'string' ? usdc(v) : typeof v === 'number' ? usdc(v) : 0n);
const canonical = (o: Record<string, unknown>) => JSON.stringify(o, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 0);
const guardWallet = () => new ethers.Wallet(process.env.GUARD_PRIVATE_KEY ?? (db.prepare('SELECT value FROM settings WHERE key = ?').get('GUARD_PRIVATE_KEY') as { value: string } | undefined)?.value ?? ethers.Wallet.createRandom().privateKey);

const teamId = (address: string) => `team_${address.toLowerCase().slice(2, 10)}`;
const supId = (address: string) => `sup_${address.toLowerCase().slice(2, 10)}`;

/* ---------- auth ---------- */
api.post('/auth/nonce', (req, res) => {
  const { address, agentAddress } = req.body ?? {};
  if (!ethers.isAddress(address) || !ethers.isAddress(agentAddress)) { res.status(400).json({ error: 'address and agentAddress required' }); return; }
  const nonce = issueNonce(address);
  const issuedAt = new Date().toISOString();
  res.json({ nonce, message: signInMessage(ethers.getAddress(address), nonce, ethers.getAddress(agentAddress), issuedAt) });
});

api.post('/auth/verify', async (req, res) => {
  try {
    const account = verifySignIn(req.body);
    await setSession(res, account.address);
    ensureSupplierEntity();
    res.json({ ok: true, account });
  } catch (e) { res.status(401).json({ error: (e as Error).message }); }
});

api.post('/auth/signout', (_req, res) => { clearSession(res); res.json({ ok: true }); });

api.get('/me', async (req, res) => {
  const address = await readSession(req);
  const account = address ? getAccount(address) : null;
  const s = getState();
  const team = account ? s.teams.find((t) => t.id === teamId(account.address)) : null;
  const supplier = account ? s.suppliers.find((x) => x.id === supId(account.address)) : null;
  const delegations = account?.delegation ? JSON.parse(account.delegation, (_k, v) => (typeof v === 'string' && v.startsWith('__big:') ? BigInt(v.slice(6)) : v)) : {};
  json(res, { account, team, supplier, guardAddress: guardWallet().address, facilitator, builtInSupplier: supplierProfile().id, resourceBase: supplierProfile().endpoint, network: NETWORK, delegations, arkiv: { live: discovery.live, explorer: discovery.explorer }, ccip: ccip.lane });
});

/* ---------- profile ---------- */
api.post('/profile', requireAuth, (req, res) => {
  const { account } = req as AuthedRequest;
  const { role, teamName, supplierName, listRate } = req.body ?? {};
  if (!account.agentPublicKey) { res.status(400).json({ error: 'Agent key not registered' }); return; }
  db.prepare('UPDATE accounts SET role = ?, team_name = COALESCE(?, team_name), supplier_name = COALESCE(?, supplier_name), list_rate = COALESCE(?, list_rate) WHERE address = ?')
    .run(role === 'supplier' ? 'supplier' : 'buyer', teamName ?? null, supplierName ?? null, listRate != null ? String(listRate) : null, account.address);
  const a = getAccount(account.address)!;
  const team: Team = { id: teamId(a.address), name: a.teamName ?? 'Team', address: a.address, balance: usdc(0), simulated: false, publicKey: a.agentPublicKey! };
  const supplier = { id: supId(a.address), name: a.supplierName ?? 'Supplier', payoutAddress: a.address, capability: 'invoice-ocr' as const, listRate: usdc(a.listRate ?? '0.06'), endpoint: '', simulated: false, publicKey: a.agentPublicKey! };
  apply(a.address, { type: 'UPSERT_TEAM', team }, { type: 'UPSERT_SUPPLIER', supplier });
  json(res, { account: a, team, supplier });
});

function ensureSupplierEntity() {
  const s = getState();
  const p = supplierProfile();
  const existing = s.suppliers.find((x) => x.id === p.id);
  if (!existing || existing.payoutAddress !== p.payoutAddress) apply(null, { type: 'UPSERT_SUPPLIER', supplier: p });
}

/* ---------- state + events ---------- */
api.get('/state', (_req, res) => json(res, { version: getVersion(), state: publicState() }));
api.get('/events', subscribe);

/* ---------- orders ---------- */
function myTeam(req: Request): Team {
  const { account } = req as AuthedRequest;
  const t = getState().teams.find((x) => x.id === teamId(account.address));
  if (!t) throw Object.assign(new Error('Set up your team first'), { status: 400 });
  return t;
}
function order(id: string): Order {
  const o = getState().orders.find((x) => x.id === id);
  if (!o) throw Object.assign(new Error('Order not found'), { status: 404 });
  return o;
}
const fail = (res: Response, e: unknown) => { const err = e as Error & { status?: number }; res.status(err.status ?? 500).json({ error: err.message }); };

api.post('/orders', requireAuth, async (req, res) => {
  try {
    const team = myTeam(req);
    const b = req.body ?? {};
    const pages = Math.max(1, Math.min(5000, Number(b.pages) || 1));
    const t = now();
    const o: Order = {
      id: newId('ord'), title: String(b.title ?? 'Untitled order').slice(0, 120), workload: 'invoice-ocr', description: String(b.description ?? '').slice(0, 2000), createdBy: team.id,
      teams: [{ teamId: team.id, calls: pages, limit: big(b.limit), joinedAt: t }], quotes: [],
      offerWindowEnd: t + (Number(b.offerWindowHours) || 48) * 3_600_000, neededBy: t + (Number(b.neededByDays) || 7) * 86_400_000, status: 'draft', createdAt: t,
    };
    apply(team.address, { type: 'CREATE_ORDER', order: o });
    const listing = await discovery.publish(o);
    apply(null, { type: 'LISTED', orderId: o.id, listingId: listing.listingId });
    if ((process.env.SUPPLIER_AUTOQUOTE ?? 'true') === 'true') setTimeout(() => autoQuote(o.id), 1500);
    json(res, { order: getState().orders.find((x) => x.id === o.id) });
  } catch (e) { fail(res, e); }
});

/** The built-in supplier quotes by policy whenever volume changes. It signs with its own key like any supplier. */
async function autoQuote(orderId: string) {
  const o = getState().orders.find((x) => x.id === orderId);
  if (!o || o.status !== 'open') return;
  ensureSupplierEntity();
  const q = quoteFor(totalCalls(o));
  const existing = o.quotes.find((x) => x.supplierId === SUPPLIER_ID);
  if (existing && existing.ratePerCall === q.ratePerCall && existing.reservationFee === q.reservationFee) return;
  const payload = { orderId, supplier: supplierProfile().payoutAddress, ratePerCall: q.ratePerCall, reservationFee: q.reservationFee, deliveryWindowHours: q.deliveryWindowHours };
  const signature = await supplierKey().signMessage(`Coquire quote\n${canonical(payload)}`);
  const quote: Quote = { id: newId('q'), orderId, supplierId: SUPPLIER_ID, ...q, sampleOffered: true, signature, submittedAt: now() };
  apply(SUPPLIER_ID, { type: 'SUBMIT_QUOTE', quote });
  await discovery.publishQuote(getState().orders.find((x) => x.id === orderId)!, quote).catch(() => {});
}

api.post('/orders/:id/join', requireAuth, (req, res) => {
  try {
    const team = myTeam(req); const o = order(String(req.params.id));
    if (o.status !== 'open' || now() > o.offerWindowEnd) throw Object.assign(new Error('Order is not open'), { status: 400 });
    const calls = Math.max(1, Math.min(5000, Number(req.body?.pages) || 1));
    apply(team.address, { type: 'JOIN_ORDER', orderId: o.id, commit: { teamId: team.id, calls, limit: big(req.body?.limit), joinedAt: now() } });
    if ((process.env.SUPPLIER_AUTOQUOTE ?? 'true') === 'true') setTimeout(() => autoQuote(o.id), 1200);
    json(res, { ok: true });
  } catch (e) { fail(res, e); }
});

api.post('/orders/:id/limit', requireAuth, (req, res) => {
  try { const team = myTeam(req); const o = order(String(req.params.id)); apply(team.address, { type: 'SET_LIMIT', orderId: o.id, teamId: team.id, limit: big(req.body?.limit) }); json(res, { ok: true }); } catch (e) { fail(res, e); }
});

api.post('/orders/:id/quote', requireAuth, async (req, res) => {
  try {
    const { account } = req as AuthedRequest; const o = order(String(req.params.id));
    const sup = getState().suppliers.find((x) => x.id === supId(account.address));
    if (!sup) throw Object.assign(new Error('Set up your supplier profile first'), { status: 400 });
    if (o.status !== 'open' || now() > o.offerWindowEnd) throw Object.assign(new Error('Offer window is closed'), { status: 400 });
    const b = req.body ?? {};
    const input = { ratePerCall: big(b.ratePerCall), reservationFee: big(b.reservationFee), deliveryWindowHours: Number(b.deliveryWindowHours) || 24 };
    const payload = { orderId: o.id, supplier: sup.payoutAddress, ...input };
    const signer = ethers.verifyMessage(`Coquire quote\n${canonical(payload)}`, String(b.signature ?? '')).toLowerCase();
    if (signer !== account.address) throw Object.assign(new Error('Quote signature does not match your account'), { status: 400 });
    const quote: Quote = { id: newId('q'), orderId: o.id, supplierId: sup.id, ...input, sampleOffered: !!b.sampleOffered, signature: String(b.signature), submittedAt: now() };
    apply(account.address, { type: 'SUBMIT_QUOTE', quote });
    await discovery.publishQuote(getState().orders.find((x) => x.id === o.id)!, quote).catch(() => {});
    json(res, { ok: true });
  } catch (e) { fail(res, e); }
});

api.post('/orders/:id/approve', requireAuth, (req, res) => {
  try {
    const team = myTeam(req); const o = order(String(req.params.id));
    if (!o.teams.some((t) => t.teamId === team.id)) throw Object.assign(new Error('Join the group first'), { status: 400 });
    if (!o.quotes.some((q) => q.id === req.body?.quoteId)) throw Object.assign(new Error('Unknown quote'), { status: 400 });
    apply(team.address, { type: 'APPROVE_QUOTE', orderId: o.id, teamId: team.id, quoteId: String(req.body.quoteId) });
    json(res, { ok: true });
  } catch (e) { fail(res, e); }
});

api.post('/orders/:id/delegate', requireAuth, (req, res) => {
  try {
    const { account } = req as AuthedRequest; const team = myTeam(req); const o = order(String(req.params.id));
    const q = approvedQuote(o); const commit = o.teams.find((t) => t.teamId === team.id);
    if (!q || !commit) throw Object.assign(new Error('Order is not approved for your team'), { status: 400 });
    const sup = getState().suppliers.find((s) => s.id === q.supplierId)!;
    const payload = { statement: 'I authorise my Coquire agent to pay this supplier at or below this rate, up to this limit, for this order.', orderId: o.id, agent: account.agentAddress, supplier: sup.payoutAddress, ratePerCall: q.ratePerCall, limit: commit.limit, network: 'hedera:testnet' };
    const signer = ethers.verifyMessage(`Coquire delegation\n${canonical(payload)}`, String(req.body?.signature ?? '')).toLowerCase();
    if (signer !== account.address) throw Object.assign(new Error('Permission signature does not match your wallet'), { status: 400 });
    const delegation = { orderId: o.id, limit: commit.limit, rate: q.ratePerCall, supplierId: sup.id, signature: String(req.body.signature), signedAt: now() };
    const prior = account.delegation ? JSON.parse(account.delegation) as Record<string, unknown> : {};
    db.prepare('UPDATE accounts SET delegation = ? WHERE address = ?').run(serialize({ ...prior, [o.id]: delegation }), account.address);
    apply(account.address, { type: 'LOG', kind: 'delegation', text: `${team.name} signed agent permission: pay ${sup.name} at or below the approved rate, up to the order limit.`, orderId: o.id });
    json(res, { delegation });
  } catch (e) { fail(res, e); }
});

function delegationFor(address: string, orderId: string) {
  const a = getAccount(address);
  if (!a?.delegation) return null;
  const all = JSON.parse(a.delegation, (_k, v) => (typeof v === 'string' && v.startsWith('__big:') ? BigInt(v.slice(6)) : v)) as Record<string, { orderId: string }>;
  return all[orderId] ?? null;
}

api.get('/orders/:id/delegation', requireAuth, (req, res) => { const { account } = req as AuthedRequest; json(res, { delegation: delegationFor(account.address, String(req.params.id)) }); });

api.post('/orders/:id/start', requireAuth, async (req, res) => {
  try {
    const team = myTeam(req); const o = order(String(req.params.id));
    if (o.status !== 'approved') throw Object.assign(new Error('Order is not approved'), { status: 400 });
    if (!o.teams.some((t) => t.teamId === team.id)) throw Object.assign(new Error('Only a member can start the order'), { status: 403 });
    const q = approvedQuote(o)!; const sup = getState().suppliers.find((s) => s.id === q.supplierId)!;
    if (!o.ccip) {
      const cap = o.teams.reduce((a, t) => a + t.limit, 0n);
      const { messageId } = await ccip.request({ orderId: o.id, cap, supplier: sup.payoutAddress });
      apply(team.address, { type: 'CCIP_REQUESTED', orderId: o.id, messageId, cap });
      await ccip.waitDelivered(messageId);
      apply(null, { type: 'CCIP_DELIVERED', orderId: o.id, messageId });
    }
    const shares = reservationShares(o, q);
    const reservations: { teamId: string; amount: Micro; txRef: string }[] = [];
    for (const t of o.teams) {
      const tm = getState().teams.find((x) => x.id === t.teamId)!;
      const amount = shares[t.teamId];
      if (amount === 0n) { reservations.push({ teamId: t.teamId, amount, txRef: '' }); continue; }
      const r = await transfer(tm.address, sup.payoutAddress, amount, `reservation:${o.id}:${t.teamId}`);
      reservations.push({ teamId: t.teamId, amount, txRef: r.txRef });
    }
    apply(team.address, { type: 'START_ORDER', orderId: o.id, reservations, ts: now() });
    json(res, { ok: true });
  } catch (e) { fail(res, e); }
});

/* ---------- sealed blobs ---------- */
api.post('/blobs', requireAuth, (req, res) => {
  const { account } = req as AuthedRequest;
  const { envelopeHex, forAddress, mime } = req.body ?? {};
  if (typeof envelopeHex !== 'string' || envelopeHex.length < 100) { res.status(400).json({ error: 'envelopeHex required' }); return; }
  const ref = `sealed_${ethers.keccak256(ethers.toUtf8Bytes(envelopeHex)).slice(2, 18)}`;
  db.prepare('INSERT OR REPLACE INTO blobs (ref, for_address, owner, bytes, mime, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(ref, String(forAddress ?? '').toLowerCase(), account.address, Buffer.from(envelopeHex, 'utf8'), String(mime ?? 'application/x-ecies+json'), now());
  res.json({ ref, bytes: envelopeHex.length / 2 });
});
api.get('/blobs/:ref', requireAuth, (req, res) => {
  const row = db.prepare('SELECT bytes, for_address, mime FROM blobs WHERE ref = ?').get(String(req.params.ref)) as { bytes: Buffer; for_address: string; mime: string } | undefined;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ envelopeHex: row.bytes.toString('utf8'), forAddress: row.for_address, mime: row.mime });
});

/* ---------- payment: agent signs, guard co-signs, rail settles, supplier processes ---------- */
api.post('/orders/:id/pay', requireAuth, async (req, res) => {
  try {
    const { account } = req as AuthedRequest; const team = myTeam(req); const o = order(String(req.params.id));
    const q = approvedQuote(o);
    if (!q || o.status !== 'active') throw Object.assign(new Error('Order is not active'), { status: 400 });
    const sup = getState().suppliers.find((s) => s.id === q.supplierId)!;
    const b = req.body ?? {};
    const page = teamBudget(getState(), o, team.id).done + 1;
    const requestId = String(b.requestId ?? `req_${o.id.slice(-4)}_${team.id.slice(-2)}_${page.toString().padStart(4, '0')}`);
    const payTo = String(b.payTo ?? sup.payoutAddress);
    const amount = b.amount != null ? big(b.amount) : q.ratePerCall;
    const payeeSupplierId = getState().suppliers.find((s) => s.payoutAddress.toLowerCase() === payTo.toLowerCase())?.id ?? 'unknown';
    const requirements = { ...requirementsFor(requestId, amount), payTo };

    // 1. the agent's signature must come from the registered agent key
    const msg = canonical(requirements as unknown as Record<string, unknown>);
    const agentSigner = ethers.verifyMessage(msg, String(b.agentSignature ?? '')).toLowerCase();
    if (agentSigner !== account.agentAddress) throw Object.assign(new Error('Payment is not signed by your registered agent key'), { status: 400 });

    // 2. the guard decides against the canonical server state
    const verdict = guard(getState(), o, q, { orderId: o.id, teamId: team.id, requestId, supplierId: payeeSupplierId, amount }, !!delegationFor(account.address, o.id));
    const base: Omit<Payment, 'status' | 'verdict'> = { id: newId('pay'), orderId: o.id, teamId: team.id, requestId, page, amount, to: payTo, sealedRequestRef: b.sealedRequestRef ? String(b.sealedRequestRef) : undefined, agentSignature: String(b.agentSignature), ts: now() };
    if (!verdict.ok) {
      const payment: Payment = { ...base, status: 'declined', verdict };
      apply(account.address, { type: 'RECORD_PAYMENT', payment });
      json(res, { payment });
      return;
    }
    // 3. co-sign and settle (live: the agent's partially signed Hedera transaction goes to the facilitator)
    const guardSignature = await guardWallet().signMessage(msg);
    let live: { payload: LivePayload; requirements: LiveRequirements } | undefined;
    if (X402_LIVE) {
      if (!b.x402Payload) throw Object.assign(new Error('Live settlement needs x402Payload from the agent'), { status: 400 });
      const payToAccount = payeeSupplierId === SUPPLIER_ID ? process.env.SUPPLIER_HEDERA_ACCOUNT_ID! : String(b.payToAccountId ?? '');
      const lr = await liveRequirements(amount, payToAccount, requirements.resource);
      live = { payload: b.x402Payload as LivePayload, requirements: { scheme: lr.scheme, network: lr.network, asset: lr.asset, amount: lr.amount, payTo: lr.payTo, maxTimeoutSeconds: lr.maxTimeoutSeconds, extra: lr.extra } };
    }
    const receipt = await settle(requirements, account.agentAddress!, String(b.agentSignature), guardSignature, live);
    const payment: Payment = { ...base, status: 'settled', verdict, guardSignature, txRef: receipt.txRef, ts: receipt.settledAt };
    apply(account.address, { type: 'RECORD_PAYMENT', payment });
    json(res, { payment, remaining: remainingAllowance(getState(), getState().orders.find((x) => x.id === o.id)!, team.id) });

    // 4. hand the settled payment to the supplier over HTTP, like any x402 client would
    if (sup.id === SUPPLIER_ID && base.sealedRequestRef) {
      try {
        const origin = process.env.APP_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`;
        const header = Buffer.from(JSON.stringify({ txRef: receipt.txRef, amount: amount.toString(), payer: account.agentAddress, guardSignature })).toString('base64');
        const r = await fetch(`${origin}/supplier/v1/pages/${requestId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PAYMENT': header }, body: JSON.stringify({ sealedRequestRef: base.sealedRequestRef, orderId: o.id, teamId: team.id }) });
        const out = await r.json() as { sealedResultRef?: string; error?: string };
        if (out.sealedResultRef) apply(SUPPLIER_ID, { type: 'ATTACH_RESULT', paymentId: payment.id, sealedResultRef: out.sealedResultRef, result: undefined as never });
        else apply(SUPPLIER_ID, { type: 'LOG', kind: 'supplier', text: `Supplier rejected ${requestId}: ${out.error ?? r.status}`, orderId: o.id });
      } catch (e) { apply(SUPPLIER_ID, { type: 'LOG', kind: 'supplier', text: `Supplier call failed for ${requestId}: ${(e as Error).message}`, orderId: o.id }); }
    }
  } catch (e) { fail(res, e); }
});

/** Live requirements the browser agent signs a Hedera transaction against. */
api.get('/orders/:id/requirements', requireAuth, async (req, res) => {
  try {
    const o = order(String(req.params.id)); const q = approvedQuote(o);
    if (!q) throw Object.assign(new Error('No approved quote'), { status: 400 });
    if (!X402_LIVE) { json(res, { live: false }); return; }
    const requestId = String(req.query.requestId ?? ''); const amount = req.query.amount ? big(String(req.query.amount)) : q.ratePerCall;
    const lr = await liveRequirements(amount, process.env.SUPPLIER_HEDERA_ACCOUNT_ID!, `${supplierProfile().endpoint}/${requestId}`);
    json(res, { live: true, requirements: lr });
  } catch (e) { fail(res, e); }
});

api.post('/orders/:id/release', requireAuth, async (req, res) => {
  try {
    const team = myTeam(req); const o = order(String(req.params.id));
    const bud = teamBudget(getState(), o, team.id);
    const amount = bud.unused - bud.refunded;
    if (amount <= 0n) throw Object.assign(new Error('Nothing to release'), { status: 400 });
    const r = await transfer(team.address, team.address, amount, `release:${o.id}`);
    apply(team.address, { type: 'REFUND', orderId: o.id, teamId: team.id, amount, txRef: r.txRef, ts: now() });
    json(res, { ok: true });
  } catch (e) { fail(res, e); }
});

/* ---------- agent wallet on Hedera testnet ---------- */
api.get('/wallet', requireAuth, async (req, res) => {
  try {
    const { account } = req as AuthedRequest;
    const agent = account.agentAddress ? await mirrorAccount(account.agentAddress) : null;
    const supplier = FUNDING_ENABLED ? await supplierBalances() : null;
    json(res, { agent, fundingEnabled: FUNDING_ENABLED, supplierUsdc: supplier?.usdc ?? 0, usdcToken: USDC_TOKEN, hashscan: agent ? hashscanAccount(agent.account) : null });
  } catch (e) { fail(res, e); }
});

/** Testnet convenience: the supplier account creates the agent's Hedera account and sends it USDC. Real transactions, real ids. */
api.post('/wallet/fund', requireAuth, async (req, res) => {
  try {
    const { account } = req as AuthedRequest;
    if (!FUNDING_ENABLED) throw Object.assign(new Error('Funding from the supplier account is disabled on this server'), { status: 400 });
    if (!account.agentPublicKey) throw Object.assign(new Error('Agent key not registered'), { status: 400 });
    const txs: { label: string; id: string; url: string }[] = [];
    const created = await createAgentAccount(account.agentPublicKey, Number(process.env.AGENT_INITIAL_HBAR ?? '1'));
    if (created.txId) txs.push({ label: `Account ${created.accountId} created with 1 HBAR`, id: created.txId, url: hashscanTx(created.txId) });
    const want = usdc(process.env.AGENT_FUND_USDC ?? '5');
    const before = await mirrorAccount(created.accountId);
    const sup = await supplierBalances();
    const have = BigInt(Math.round(((before?.usdc ?? 0) * 1e6)));
    if (have < want && (sup?.usdc ?? 0) * 1e6 >= Number(want - have)) {
      const sent = await sendUsdc(created.accountId, want - have);
      txs.push({ label: `${(Number(want - have) / 1e6).toFixed(2)} USDC sent from the supplier`, id: sent.txId, url: hashscanTx(sent.txId) });
    }
    apply(account.address, { type: 'LOG', kind: 'wallet', text: `Agent account ${created.accountId} funded on Hedera testnet (${txs.length} transaction${txs.length === 1 ? '' : 's'})` });
    await new Promise((r) => setTimeout(r, 2500));
    const after = await mirrorAccount(created.accountId);
    json(res, { accountId: created.accountId, txs, agent: after, supplierUsdc: (await supplierBalances())?.usdc ?? 0, hashscan: hashscanAccount(created.accountId) });
  } catch (e) { fail(res, e); }
});

api.get('/health', (_req, res) => res.json({ ok: true, version: getVersion(), facilitator: facilitator.name, settlements: (db.prepare('SELECT COUNT(*) c FROM settlements').get() as { c: number }).c, verify: verifySettlement.name }));
api.post('/supplier/sample', (_req, res) => res.redirect(307, '/supplier/v1/sample'));
