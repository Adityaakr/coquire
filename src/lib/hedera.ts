/**
 * The agent key's Hedera account, from the browser.
 * Sending HBAR to the key's EVM alias auto-creates the account; USDC must then be associated once, signed by the agent key.
 */
import { agentKey } from './keys';

const MIRROR = import.meta.env.VITE_HEDERA_MIRROR_URL || 'https://testnet.mirrornode.hedera.com';
export const USDC_TOKEN_ID = '0.0.429274';

export interface AgentHederaStatus { address: string; accountId: string | null; hbar: number; usdc: number | null; associated: boolean }

export async function agentHederaStatus(): Promise<AgentHederaStatus> {
  const address = agentKey().address;
  const r = await fetch(`${MIRROR}/api/v1/accounts/${address}`);
  if (!r.ok) return { address, accountId: null, hbar: 0, usdc: null, associated: false };
  const j = (await r.json()) as { account: string; balance: { balance: number; tokens: { token_id: string; balance: number }[] } };
  const tok = j.balance.tokens.find((t) => t.token_id === USDC_TOKEN_ID);
  return { address, accountId: j.account, hbar: j.balance.balance / 1e8, usdc: tok ? tok.balance / 1e6 : null, associated: !!tok };
}

/** One TokenAssociateTransaction signed by the agent key. Needs a little HBAR on the account for the fee. */
export async function associateUsdc(accountId: string): Promise<string> {
  const sdk = await import('@hiero-ledger/sdk');
  const priv = sdk.PrivateKey.fromStringECDSA(agentKey().privateKey);
  const client = sdk.Client.forTestnet().setOperator(sdk.AccountId.fromString(accountId), priv);
  try {
    const tx = await new sdk.TokenAssociateTransaction().setAccountId(sdk.AccountId.fromString(accountId)).setTokenIds([sdk.TokenId.fromString(USDC_TOKEN_ID)]).freezeWith(client).sign(priv);
    const res = await tx.execute(client);
    const rc = await res.getReceipt(client);
    if (rc.status.toString() !== 'SUCCESS') throw new Error(`Association failed: ${rc.status.toString()}`);
    return res.transactionId.toString();
  } finally {
    client.close();
  }
}
