/**
 * A standalone agent that pays the Coquire supplier with the standard x402 client, proving the endpoint
 * works for any 402-aware client, not just the Coquire app.
 *
 *   X402_NETWORK=hedera:testnet HEDERA_ACCOUNT_ID=0.0.x HEDERA_PRIVATE_KEY=0x... \
 *   npx tsx scripts/agent.ts https://<host>/supplier/v1/pages/<requestId> '{"sealedRequestRef":"sealed_...","orderId":"ord_...","teamId":"team_..."}'
 *
 * Requires a live facilitator on the server (X402_FACILITATOR_URL) and a funded, USDC-associated payer account.
 */
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactHederaScheme } from '@x402/hedera/exact/client';
import { createClientHederaSigner, PrivateKey } from '@x402/hedera';

const [url, body] = process.argv.slice(2);
if (!url) { console.error('usage: agent.ts <supplier-url> [json-body]'); process.exit(1); }
const network = process.env.X402_NETWORK ?? 'hedera:testnet';
const accountId = process.env.HEDERA_ACCOUNT_ID!;
const key = process.env.HEDERA_PRIVATE_KEY!;
const priv = key.startsWith('0x') || key.length === 64 ? PrivateKey.fromStringECDSA(key) : PrivateKey.fromStringED25519(key);

const client = new x402Client().register(network, new ExactHederaScheme(createClientHederaSigner(accountId, priv, { network })));
const fetchWithPay = wrapFetchWithPayment(fetch, client);
const res = await fetchWithPay(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ?? '{}' });
console.log(res.status, await res.text());
