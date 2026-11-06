import type { CoquireState } from '@/domain/types';

export const serialize = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? `__big:${x.toString()}` : x));
export const revive = (_k: string, x: unknown) => (typeof x === 'string' && x.startsWith('__big:') ? BigInt(x.slice(6)) : x);

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, { method, headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? serialize(body) : undefined, credentials: 'same-origin' });
  const text = await r.text();
  const data = text ? JSON.parse(text, revive) : null;
  if (!r.ok) throw new ApiError((data && data.error) || r.statusText, r.status);
  return data as T;
}

export const api = {
  get: <T>(path: string) => call<T>('GET', path),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body ?? {}),
};

export interface Me {
  account: { address: string; agentAddress: string | null; agentPublicKey: string | null; teamName: string | null; supplierName: string | null; listRate: string | null; role: 'buyer' | 'supplier'; createdAt: number } | null;
  team: CoquireState['teams'][number] | null;
  supplier: CoquireState['suppliers'][number] | null;
  guardAddress: string;
  facilitator: { name: string; url: string; sponsorsFees: boolean; live: boolean };
  builtInSupplier: string;
  resourceBase: string;
  network: string;
  arkiv: { live: boolean; explorer: string };
  ccip: { source: string; destination: string; simulated: boolean };
  delegations: Record<string, { orderId: string; limit: bigint; rate: bigint; supplierId: string; signature: string; signedAt: number }>;
}

/** Subscribe to server state changes. Calls `onChange` on every broadcast; reconnects automatically. */
export function subscribe(onChange: () => void): () => void {
  let es: EventSource | null = null;
  let stopped = false;
  const open = () => {
    if (stopped) return;
    es = new EventSource('/api/events');
    es.addEventListener('state', onChange);
    es.onerror = () => { es?.close(); if (!stopped) setTimeout(open, 2000); };
  };
  open();
  return () => { stopped = true; es?.close(); };
}
