import { db, now } from './db.js';
import { emptyState, reducer, type Action } from '../src/domain/reducer.js';
import type { CoquireState } from '../src/domain/types.js';
import { broadcast } from './sse.js';

export const serialize = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? `__big:${x.toString()}` : x));
export const deserialize = <T>(raw: string): T => JSON.parse(raw, (_k, x) => (typeof x === 'string' && x.startsWith('__big:') ? BigInt(x.slice(6)) : x));

let state: CoquireState = (() => {
  const row = db.prepare('SELECT json FROM state WHERE id = 1').get() as { json: string } | undefined;
  if (!row) return { ...emptyState, profile: null };
  const s = deserialize<CoquireState>(row.json);
  return { ...emptyState, ...s, profile: null };
})();
let version = (db.prepare('SELECT version FROM state WHERE id = 1').get() as { version: number } | undefined)?.version ?? 0;

export const getState = () => state;
export const getVersion = () => version;

const persist = db.transaction((actor: string | null, actions: Action[]) => {
  for (const a of actions) {
    state = reducer(state, a);
    db.prepare('INSERT INTO actions (actor, type, json, created_at) VALUES (?, ?, ?, ?)').run(actor, a.type, serialize(a), now());
  }
  version += 1;
  db.prepare('INSERT INTO state (id, json, version, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, version = excluded.version, updated_at = excluded.updated_at').run(serialize(state), version, now());
});

/** Apply actions atomically, persist the snapshot and the action log, then tell every connected client. */
export function apply(actor: string | null, ...actions: Action[]): CoquireState {
  persist(actor, actions);
  broadcast('state', { version });
  return state;
}

/** Public view: everything except per-session profile. Balances are included because suppliers see funded balances by design. */
export function publicState(): Omit<CoquireState, 'profile'> {
  const { profile: _p, ...rest } = state;
  return rest;
}
