/**
 * Browser-side x402 payer for Hedera testnet. Used only when the server reports a live facilitator.
 * The agent key (secp256k1) is also the Hedera account key: the account is auto-created the first time
 * HBAR is sent to the key's EVM alias. We resolve the account id from the mirror node.
 */
import { agentKey } from './keys';

export interface LiveRequirements { scheme: 'exact'; network: string; asset: string; amount: string; payTo: string; maxTimeoutSeconds: number; extra: Record<string, unknown> }

const MIRROR = import.meta.env.VITE_HEDERA_MIRROR_URL || 'https://testnet.mirrornode.hedera.com';

export async function resolveAgentAccountId(): Promise<string | null> {
  const address = agentKey().address;
  const r = await fetch(`${MIRROR}/api/v1/accounts/${address}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { account?: string };
  return j.account ?? null;
}

export async function agentUsdcAssociated(tokenId: string): Promise<boolean> {
  const id = await resolveAgentAccountId();
  if (!id) return false;
  const r = await fetch(`${MIRROR}/api/v1/accounts/${id}/tokens?token.id=${tokenId}`);
  if (!r.ok) return false;
  const j = (await r.json()) as { tokens?: unknown[] };
  return (j.tokens?.length ?? 0) > 0;
}

/** Build the exact-scheme payload: a partially signed TransferTransaction, base64. */
export async function buildHederaPayload(requirements: LiveRequirements): Promise<{ x402Version: number; accepted: LiveRequirements; payload: Record<string, unknown> }> {
  const accountId = await resolveAgentAccountId();
  if (!accountId) throw new Error('The agent key has no Hedera account yet. Send a little HBAR to its EVM alias to create it.');
  const hedera = await import('@x402/hedera');
  const { ExactHederaScheme } = await import('@x402/hedera/exact/client');
  const priv = hedera.PrivateKey.fromStringECDSA(agentKey().privateKey);
  const signer = hedera.createClientHederaSigner(accountId, priv, { network: requirements.network });
  const scheme = new ExactHederaScheme(signer);
  const result = await scheme.createPaymentPayload(2, requirements as never);
  return { x402Version: 2, accepted: requirements, payload: result.payload as Record<string, unknown> };
}
