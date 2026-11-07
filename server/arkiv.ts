import type { Order, Quote } from '../src/domain/types.js';
import { totalCalls } from '../src/domain/selectors.js';

/**
 * Order discovery on Arkiv (Rabdi testnet, chain id 7794095). Live when ARKIV_ACCESS_KEY and ARKIV_PRIVATE_KEY are set;
 * the wallet needs test GLM from https://hub.arkiv.network/faucet. Otherwise listings are local and labelled so.
 * SDK: @arkiv-network/sdk 1.0.x (viem peer). Loaded lazily so the server starts without it installed.
 */
export interface Listing { listingId: string; expiresAt: number; url: string; live: boolean }

const live = !!(process.env.ARKIV_ACCESS_KEY && process.env.ARKIV_PRIVATE_KEY);

type Sdk = {
  wallet: { createEntity: (schema: unknown, values: Record<string, unknown>, opts: { expiration: unknown }) => Promise<{ entityKey: string; txHash: string }> };
  Orders: unknown; Quotes: unknown;
  ExpirationTime: { fromSeconds?: (s: number) => unknown; fromDays: (d: number) => unknown };
  helpers: { str: (v: string) => unknown; dec: (v: string) => unknown; addr: (v: string) => unknown; bytes: (v: Uint8Array) => unknown };
};
let sdk: Promise<Sdk | null> | null = null;

async function load(): Promise<Sdk | null> {
  if (!live) return null;
  if (!sdk) {
    sdk = (async () => {
      try {
        const core = await import('@arkiv-network/sdk');
        const schema = await import('@arkiv-network/sdk/schema');
        const chains = await import('@arkiv-network/sdk/chains');
        const { http } = await import('viem');
        const { privateKeyToAccount } = await import('viem/accounts');
        const chain = chains.rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY! });
        const account = privateKeyToAccount(process.env.ARKIV_PRIVATE_KEY as `0x${string}`);
        const wallet = core.createWalletClient({ chain, transport: http(), account });
        const Orders = schema.defineSchema('coquire_orders', { orderId: schema.str().indexed(), title: schema.str(), status: schema.str().indexed(), pages: schema.dec().indexed(), createdBy: schema.addr().indexed(), neededBy: schema.dec(), body: schema.bytes() });
        const Quotes = schema.defineSchema('coquire_quotes', { orderId: schema.str().indexed(), supplier: schema.addr().indexed(), ratePerCall: schema.dec().indexed(), reservationFee: schema.dec(), signature: schema.str(), body: schema.bytes() });
        return { wallet, Orders, Quotes, ExpirationTime: core.ExpirationTime, helpers: { str: schema.str as never, dec: schema.dec as never, addr: schema.addr as never, bytes: schema.bytes as never } } as unknown as Sdk;
      } catch (e) {
        console.warn('[arkiv] SDK unavailable, falling back to local listings:', (e as Error).message);
        return null;
      }
    })();
  }
  return sdk;
}

export const discovery = {
  live,
  explorer: 'https://rabdi.explorer.arkiv.network',
  async publish(order: Order): Promise<Listing> {
    const s = await load();
    if (s) {
      const days = Math.max(1, Math.ceil((order.offerWindowEnd - Date.now()) / 86_400_000));
      const h = s.helpers;
      const { entityKey } = await s.wallet.createEntity(s.Orders, {
        orderId: order.id, title: order.title, status: 'open', pages: h.dec(String(totalCalls(order))), createdBy: h.addr(order.createdBy.startsWith('0x') ? order.createdBy : '0x0000000000000000000000000000000000000000'), neededBy: h.dec(String(order.neededBy)),
        body: h.bytes(new TextEncoder().encode(JSON.stringify({ description: order.description, teams: order.teams.map((t) => ({ teamId: t.teamId, calls: t.calls })), offerWindowEnd: order.offerWindowEnd }))),
      }, { expiration: s.ExpirationTime.fromDays(days) });
      return { listingId: entityKey, expiresAt: order.offerWindowEnd, url: `https://rabdi.explorer.arkiv.network/entity/${entityKey}`, live: true };
    }
    const listingId = `local_${order.id.slice(-8)}`;
    return { listingId, expiresAt: order.offerWindowEnd, url: '', live: false };
  },
  async publishQuote(order: Order, quote: Quote): Promise<string | null> {
    const s = await load();
    if (!s) return null;
    const days = Math.max(1, Math.ceil((order.offerWindowEnd - Date.now()) / 86_400_000));
    const h = s.helpers;
    const { entityKey } = await s.wallet.createEntity(s.Quotes, {
      orderId: order.id, supplier: h.addr('0x0000000000000000000000000000000000000000'), ratePerCall: h.dec(quote.ratePerCall.toString()), reservationFee: h.dec(quote.reservationFee.toString()), signature: quote.signature,
      body: h.bytes(new TextEncoder().encode(JSON.stringify({ deliveryWindowHours: quote.deliveryWindowHours, sampleOffered: quote.sampleOffered, submittedAt: quote.submittedAt }))),
    }, { expiration: s.ExpirationTime.fromDays(days) });
    return entityKey;
  },
  entityUrl(listingId: string) { return listingId.startsWith('local_') ? '' : `https://rabdi.explorer.arkiv.network/entity/${listingId}`; },
};
