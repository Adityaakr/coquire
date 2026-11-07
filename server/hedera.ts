/**
 * Hedera testnet operations the server performs with the supplier account as operator:
 *  - create a team's agent account from its registered public key (unlimited auto token associations, small HBAR float)
 *  - send USDC from the supplier's balance to an agent account (testnet convenience; gated by TESTNET_FUND_FROM_SUPPLIER)
 * Every call returns Hedera transaction ids that resolve on HashScan.
 */
import { AccountCreateTransaction, AccountId, Client, Hbar, PrivateKey, PublicKey, TransferTransaction, TokenId } from '@hiero-ledger/sdk';
import { ethers } from 'ethers';
import { secret } from './db.js';

export const USDC = process.env.HEDERA_USDC_TOKEN_ID ?? '0.0.429274';
const MIRROR = process.env.VITE_HEDERA_MIRROR_URL ?? 'https://testnet.mirrornode.hedera.com';
export const FUNDING_ENABLED = (process.env.TESTNET_FUND_FROM_SUPPLIER ?? 'true') === 'true' && !!process.env.SUPPLIER_HEDERA_ACCOUNT_ID;
export const hashscanTx = (id: string) => `https://hashscan.io/testnet/transaction/${encodeURIComponent(id)}`;
export const hashscanAccount = (id: string) => `https://hashscan.io/testnet/account/${id}`;

function operator(): Client {
  const priv = PrivateKey.fromStringECDSA(secret('SUPPLIER_PRIVATE_KEY'));
  return Client.forTestnet().setOperator(AccountId.fromString(process.env.SUPPLIER_HEDERA_ACCOUNT_ID!), priv);
}

export interface MirrorAccount { account: string; evmAddress: string; hbar: number; usdc: number | null; associated: boolean; maxAuto: number }

export async function mirrorAccount(evmOrId: string): Promise<MirrorAccount | null> {
  const r = await fetch(`${MIRROR}/api/v1/accounts/${evmOrId}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { account: string; evm_address: string; max_automatic_token_associations: number; balance: { balance: number; tokens: { token_id: string; balance: number }[] } };
  const tok = j.balance.tokens.find((t) => t.token_id === USDC);
  return { account: j.account, evmAddress: j.evm_address, hbar: j.balance.balance / 1e8, usdc: tok ? tok.balance / 1e6 : null, associated: !!tok, maxAuto: j.max_automatic_token_associations };
}

/** Create the agent's account from its compressed secp256k1 public key. Returns the new account id and the creation transaction. */
export async function createAgentAccount(agentPublicKeyHex: string, initialHbar = 1): Promise<{ accountId: string; txId: string }> {
  const evm = ethers.computeAddress(agentPublicKeyHex);
  const existing = await mirrorAccount(evm);
  if (existing) return { accountId: existing.account, txId: '' };
  const client = operator();
  try {
    const pub = PublicKey.fromStringECDSA(agentPublicKeyHex.replace(/^0x/, ''));
    const tx = await new AccountCreateTransaction()
      .setECDSAKeyWithAlias(pub)
      .setInitialBalance(new Hbar(initialHbar))
      .setMaxAutomaticTokenAssociations(-1)
      .setAccountMemo('coquire agent')
      .execute(client);
    const rc = await tx.getReceipt(client);
    return { accountId: rc.accountId!.toString(), txId: tx.transactionId.toString() };
  } finally {
    client.close();
  }
}

/** Move USDC from the supplier to an agent account. Auto-association covers accounts created above. */
export async function sendUsdc(toAccountId: string, amountMicro: bigint): Promise<{ txId: string }> {
  const client = operator();
  try {
    const from = AccountId.fromString(process.env.SUPPLIER_HEDERA_ACCOUNT_ID!);
    const tx = await new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(USDC), from, -Number(amountMicro))
      .addTokenTransfer(TokenId.fromString(USDC), AccountId.fromString(toAccountId), Number(amountMicro))
      .setTransactionMemo('coquire testnet funding')
      .execute(client);
    await tx.getReceipt(client);
    return { txId: tx.transactionId.toString() };
  } finally {
    client.close();
  }
}

export async function supplierBalances() {
  return mirrorAccount(process.env.SUPPLIER_HEDERA_ACCOUNT_ID!);
}
