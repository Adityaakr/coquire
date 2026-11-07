/** Writes one probe entity to Arkiv Rabdi testnet and reads it back. Needs ARKIV_ACCESS_KEY and ARKIV_PRIVATE_KEY. */
import { createPublicClient, createWalletClient, ExpirationTime } from '@arkiv-network/sdk';
import { defineSchema, str, dec } from '@arkiv-network/sdk/schema';
import { rabdi } from '@arkiv-network/sdk/chains';
import { eq } from '@arkiv-network/sdk/query';
import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const chain = rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY! });
const account = privateKeyToAccount(process.env.ARKIV_PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ chain, transport: http(), account });
const pub = createPublicClient({ chain, transport: http() });
const Probe = defineSchema('coquire_probe', { orderId: str().indexed(), pages: dec().indexed() });
const id = 'probe_' + Date.now().toString(36);
const { entityKey, txHash } = await wallet.createEntity(Probe, { orderId: id, pages: dec('200') }, { expiration: ExpirationTime.fromDays(1) });
console.log('created', entityKey, 'tx', txHash);
const { entities } = await pub.select({ $key: true, $expiresAt: true, orderId: true, pages: true }).from(Probe).where(eq('orderId', id)).fetch();
console.log('read back', JSON.stringify(entities, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
console.log('explorer https://rabdi.explorer.arkiv.network/entity/' + entityKey);
