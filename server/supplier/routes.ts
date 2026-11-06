import { Router } from 'express';
import { ethers } from 'ethers';
import { db, now, secret } from '../db.js';
import { facilitator, NETWORK, recordExternal, verifySettlement } from '../rail.js';
import { LIVE as X402_LIVE, liveRequirements, verifyAndSettle, type LivePayload } from '../x402live.js';
import { openJson, publicKeyOf, sealJson } from '../../src/lib/ecies.js';
import { ocrInvoice, toPageImages } from './ocr.js';
import { usdc, type Micro } from '../../src/domain/money.js';
import { getState } from '../state.js';
import { approvedQuote } from '../../src/domain/selectors.js';

/**
 * The built-in supplier: a real x402 resource server. Any client can call it.
 *  POST /supplier/v1/pages/:requestId  { sealedRequestRef, orderId, teamId }
 *    → 402 { x402Version, accepts:[PaymentRequirements] } until an X-PAYMENT header carries a settled payment
 *    → 200 { sealedResultRef } once paid: opens the sealed page, runs OCR, seals the result to the team's agent key
 *  GET  /supplier/v1/sample → runs OCR on a bundled sample so buyers can test before buying
 */
export const supplierKey = () => new ethers.Wallet(secret('SUPPLIER_PRIVATE_KEY'));
export const SUPPLIER_ID = 'sup_coquire_ocr';
export const supplierProfile = () => ({
  id: SUPPLIER_ID,
  name: process.env.SUPPLIER_NAME ?? 'Coquire OCR',
  payoutAddress: supplierKey().address,
  capability: 'invoice-ocr' as const,
  listRate: usdc(process.env.SUPPLIER_LIST_RATE ?? '0.06'),
  endpoint: `${process.env.APP_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`}/supplier/v1/pages`,
  simulated: false,
  automated: true,
  publicKey: publicKeyOf(supplierKey().privateKey),
});

/** Quote policy: rate steps down with combined volume. The automated supplier signs each quote with its own key. */
export function quoteFor(totalCalls: number): { ratePerCall: Micro; reservationFee: Micro; deliveryWindowHours: number } {
  const tiers = [
    { min: 0, rate: '0.06', fee: '0' },
    { min: 150, rate: '0.05', fee: '1.5' },
    { min: 200, rate: '0.045', fee: '2' },
    { min: 500, rate: '0.04', fee: '3' },
  ];
  const t = [...tiers].reverse().find((x) => totalCalls >= x.min) ?? tiers[0];
  return { ratePerCall: usdc(t.rate), reservationFee: usdc(t.fee), deliveryWindowHours: 48 };
}

export function requirementsFor(requestId: string, amount: Micro) {
  return { requestId, resource: `${supplierProfile().endpoint}/${requestId}`, payTo: supplierProfile().payoutAddress, amount, asset: 'USDC' as const, network: NETWORK };
}

export const supplierRouter = Router();

supplierRouter.get('/v1/sample', async (_req, res) => {
  const started = Date.now();
  const { sampleInvoicePng } = await import('./sample.js');
  const result = await ocrInvoice(sampleInvoicePng());
  res.json({ result, latencyMs: Date.now() - started, engine: 'tesseract.js', facilitator: facilitator.name });
});

supplierRouter.post('/v1/pages/:requestId', async (req, res) => {
  const requestId = String(req.params.requestId);
  const body = (req.body ?? {}) as { sealedRequestRef?: string; orderId?: string; teamId?: string };
  const order = body.orderId ? getState().orders.find((o) => o.id === body.orderId) : undefined;
  const quote = order && approvedQuote(order);
  if (!order || !quote || quote.supplierId !== SUPPLIER_ID) { res.status(400).json({ error: 'No approved quote from this supplier for that order' }); return; }
  const requirements = requirementsFor(requestId, quote.ratePerCall);
  const header = req.header('X-PAYMENT');
  const standard = req.header('PAYMENT-SIGNATURE') ?? req.header('X-PAYMENT-SIGNATURE');

  // Standard x402 v2 client (any agent): PAYMENT-SIGNATURE header → verify + settle through the facilitator.
  if (X402_LIVE && standard) {
    try {
      const { decodePaymentSignatureHeader } = await import('@x402/core/http');
      const payload = decodePaymentSignatureHeader(standard) as unknown as LivePayload;
      const lr = await liveRequirements(quote.ratePerCall, process.env.SUPPLIER_HEDERA_ACCOUNT_ID!, requirements.resource);
      const { transactionId, payer } = await verifyAndSettle(payload, { scheme: lr.scheme, network: lr.network, asset: lr.asset, amount: lr.amount, payTo: lr.payTo, maxTimeoutSeconds: lr.maxTimeoutSeconds, extra: lr.extra });
      recordExternal(transactionId, requestId, quote.ratePerCall, payer ?? 'unknown', requirements.payTo);
      res.setHeader('PAYMENT-RESPONSE', Buffer.from(JSON.stringify({ success: true, transaction: transactionId, network: NETWORK })).toString('base64'));
    } catch (e) { res.status(402).json({ x402Version: 2, error: (e as Error).message }); return; }
  } else if (!header) {
    if (X402_LIVE) {
      const lr = await liveRequirements(quote.ratePerCall, process.env.SUPPLIER_HEDERA_ACCOUNT_ID!, requirements.resource);
      const required = { x402Version: 2, resource: { url: requirements.resource, description: 'Coquire OCR, one page', mimeType: 'application/json' }, accepts: [{ scheme: lr.scheme, network: lr.network, asset: lr.asset, amount: lr.amount, payTo: lr.payTo, maxTimeoutSeconds: lr.maxTimeoutSeconds, extra: lr.extra }] };
      res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(required)).toString('base64'));
      res.status(402).json(required);
      return;
    }
    res.status(402).json({ x402Version: 1, accepts: [{ ...requirements, amount: requirements.amount.toString() }], error: 'Payment required' });
    return;
  } else {
    let payment: { txRef: string; amount: string; payer: string; guardSignature?: string };
    try { payment = JSON.parse(Buffer.from(header, 'base64').toString('utf8')); } catch { res.status(400).json({ error: 'Bad X-PAYMENT header' }); return; }
    if (!verifySettlement(payment.txRef, requestId, requirements.payTo, requirements.amount)) { res.status(402).json({ x402Version: 1, accepts: [{ ...requirements, amount: requirements.amount.toString() }], error: 'Payment not found or insufficient' }); return; }
  }

  const blob = body.sealedRequestRef ? (db.prepare('SELECT bytes FROM blobs WHERE ref = ?').get(body.sealedRequestRef) as { bytes: Buffer } | undefined) : undefined;
  if (!blob) { res.status(400).json({ error: 'Sealed page not found' }); return; }
  const page = openJson<{ mime: string; bytesHex: string; page: number }>(blob.bytes.toString('utf8'), supplierKey().privateKey);
  const bytes = Uint8Array.from(Buffer.from(page.bytesHex, 'hex'));
  const images = await toPageImages(bytes, page.mime);
  const result = await ocrInvoice(images[0]);

  const team = getState().teams.find((t) => t.id === body.teamId);
  if (!team?.publicKey) { res.status(400).json({ error: 'Team has no sealing key' }); return; }
  const sealed = sealJson(result, team.publicKey);
  const ref = `sealed_${ethers.keccak256(ethers.toUtf8Bytes(sealed)).slice(2, 18)}`;
  db.prepare('INSERT OR REPLACE INTO blobs (ref, for_address, owner, bytes, mime, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(ref, team.address.toLowerCase(), SUPPLIER_ID, Buffer.from(sealed, 'utf8'), 'application/x-ecies+json', now());
  res.json({ sealedResultRef: ref, requestId, engine: 'tesseract.js' });
});
