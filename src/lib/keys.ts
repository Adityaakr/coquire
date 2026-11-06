import { ethers } from 'ethers';

/**
 * Local keys for the demo.
 * - agent: the session key the buyer's agent uses to sign each per-call payment.
 * - guard: Coquire's policy co-signer. In the product this is the second key of a 2-of-2
 *   KeyList on the team's payment account; here it is a local key and clearly labelled simulated.
 * - demoOwner: a browser-held owner key for users without a wallet extension. Real signatures, browser custody.
 * Private keys live in localStorage. Testnet demo only.
 */
const KEYS = { agent: 'coquire.key.agent', guard: 'coquire.key.guard', demoOwner: 'coquire.key.owner' } as const;

function load(name: keyof typeof KEYS): ethers.Wallet {
  const existing = localStorage.getItem(KEYS[name]);
  if (existing) return new ethers.Wallet(existing);
  const w = ethers.Wallet.createRandom();
  localStorage.setItem(KEYS[name], w.privateKey);
  return new ethers.Wallet(w.privateKey);
}

export const agentKey = () => load('agent');
export const guardKey = () => load('guard');
export const demoOwnerKey = () => load('demoOwner');

export function resetKeys() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

export function canonical(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 0);
}
