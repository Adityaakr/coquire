/**
 * Live x402 on Hedera testnet. Active only when X402_FACILITATOR_URL is set.
 * Requirements follow the "exact" scheme: USDC 0.0.429274 (6 decimals), payTo = supplier Hedera account,
 * extra.feePayer = the facilitator's fee-payer account from /supported.
 */
import type { Micro } from '../src/domain/money.js';

export const LIVE = !!process.env.X402_FACILITATOR_URL;
export const NETWORK = process.env.X402_NETWORK ?? 'hedera:testnet';
export const USDC_TOKEN = process.env.HEDERA_USDC_TOKEN_ID ?? '0.0.429274';

export interface LiveRequirements { scheme: 'exact'; network: string; asset: string; amount: string; payTo: string; maxTimeoutSeconds: number; extra: Record<string, unknown> }
export interface LivePayload { x402Version: number; accepted: LiveRequirements; payload: Record<string, unknown>; resource?: unknown }

type Facilitator = {
  getSupported(): Promise<{ kinds: { scheme: string; network: string; extra?: Record<string, unknown> }[] }>;
  verify(p: LivePayload, r: LiveRequirements): Promise<{ isValid: boolean; invalidReason?: string; invalidMessage?: string; payer?: string }>;
  settle(p: LivePayload, r: LiveRequirements): Promise<{ success: boolean; transaction: string; errorReason?: string; errorMessage?: string; payer?: string }>;
};

let client: Promise<Facilitator> | null = null;
let feePayer: string | null = null;

async function facilitator(): Promise<Facilitator> {
  if (!client) {
    client = (async () => {
      const mod = await import('@x402/core/server');
      const HTTPFacilitatorClient = (mod as unknown as { HTTPFacilitatorClient: new (c: { url: string }) => Facilitator }).HTTPFacilitatorClient;
      return new HTTPFacilitatorClient({ url: process.env.X402_FACILITATOR_URL! });
    })();
  }
  return client;
}

export async function liveFeePayer(): Promise<string> {
  if (feePayer) return feePayer;
  const f = await facilitator();
  const s = await f.getSupported();
  const kind = s.kinds.find((k) => k.scheme === 'exact' && k.network === NETWORK);
  if (!kind?.extra?.feePayer) throw new Error(`Facilitator ${process.env.X402_FACILITATOR_URL} does not support exact on ${NETWORK}`);
  feePayer = String(kind.extra.feePayer);
  return feePayer;
}

export async function liveRequirements(amount: Micro, payToAccountId: string, resource: string): Promise<LiveRequirements & { resourceUrl: string }> {
  return { scheme: 'exact', network: NETWORK, asset: USDC_TOKEN, amount: amount.toString(), payTo: payToAccountId, maxTimeoutSeconds: 300, extra: { feePayer: await liveFeePayer() }, resourceUrl: resource };
}

/** Verify then settle through the facilitator. Resolves with the Hedera transaction id; throws with the facilitator's reason otherwise. */
export async function verifyAndSettle(payload: LivePayload, requirements: LiveRequirements): Promise<{ transactionId: string; payer?: string }> {
  const f = await facilitator();
  const v = await f.verify(payload, requirements);
  if (!v.isValid) throw new Error(`Facilitator rejected the payment: ${v.invalidReason ?? ''} ${v.invalidMessage ?? ''}`.trim());
  const s = await f.settle(payload, requirements);
  if (!s.success) throw new Error(`Settlement failed: ${s.errorReason ?? ''} ${s.errorMessage ?? ''}`.trim());
  return { transactionId: s.transaction, payer: s.payer };
}

export const hashscan = (transactionId: string) => `https://hashscan.io/testnet/transaction/${encodeURIComponent(transactionId)}`;
