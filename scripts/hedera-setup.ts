/**
 * Prepare a Hedera testnet account for x402 USDC payments.
 *   npx tsx --env-file=.env scripts/hedera-setup.ts supplier   # uses SUPPLIER_PRIVATE_KEY
 *   npx tsx --env-file=.env scripts/hedera-setup.ts 0x<privateKey>   # any ECDSA key (e.g. a team's agent key)
 * Steps: resolve the account id behind the key's EVM alias (the account is auto-created when HBAR is sent to it),
 * associate USDC 0.0.429274 if needed, print the account id and balances.
 */
import { AccountId, Client, PrivateKey, TokenAssociateTransaction, TokenId } from '@hiero-ledger/sdk';
import { ethers } from 'ethers';

const USDC = process.env.HEDERA_USDC_TOKEN_ID ?? '0.0.429274';
const MIRROR = process.env.VITE_HEDERA_MIRROR_URL ?? 'https://testnet.mirrornode.hedera.com';
const arg = process.argv[2] ?? 'supplier';
const keyHex = arg === 'supplier' ? process.env.SUPPLIER_PRIVATE_KEY! : arg;
if (!keyHex) { console.error('No key. Set SUPPLIER_PRIVATE_KEY in .env or pass a 0x private key.'); process.exit(1); }

const evm = new ethers.Wallet(keyHex).address;
const r = await fetch(`${MIRROR}/api/v1/accounts/${evm}`);
if (!r.ok) { console.error(`No Hedera account for ${evm} yet. Send HBAR to that address from https://portal.hedera.com/faucet, wait ~10 s, and rerun.`); process.exit(2); }
const info = (await r.json()) as { account: string; balance: { balance: number; tokens: { token_id: string; balance: number }[] } };
console.log('account', info.account, 'for', evm, '· HBAR', info.balance.balance / 1e8);

const priv = PrivateKey.fromStringECDSA(keyHex);
const client = Client.forTestnet().setOperator(AccountId.fromString(info.account), priv);
const already = info.balance.tokens.some((t) => t.token_id === USDC);
if (already) {
  console.log('USDC already associated');
} else {
  const tx = await new TokenAssociateTransaction().setAccountId(AccountId.fromString(info.account)).setTokenIds([TokenId.fromString(USDC)]).freezeWith(client).sign(priv);
  const res = await tx.execute(client);
  const rc = await res.getReceipt(client);
  console.log('associated USDC', USDC, 'status', rc.status.toString(), 'tx', res.transactionId.toString());
}
await new Promise((r) => setTimeout(r, 3000));
const after = (await (await fetch(`${MIRROR}/api/v1/accounts/${info.account}/tokens?token.id=${USDC}`)).json()) as { tokens?: { balance: number }[] };
console.log('USDC', after.tokens?.length ? `associated · balance ${(after.tokens[0].balance / 1e6).toFixed(2)} USDC` : 'not associated yet (mirror node may lag a few seconds)');
if (arg === 'supplier') console.log(`\nSet in .env and Railway:\nSUPPLIER_HEDERA_ACCOUNT_ID=${info.account}`);
client.close();
