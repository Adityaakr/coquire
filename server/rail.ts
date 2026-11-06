import { ethers } from 'ethers';
import { db, now } from './db.js';
import type { Micro } from '../src/domain/money.js';
import { LIVE, NETWORK as LIVE_NETWORK, hashscan, verifyAndSettle, type LivePayload, type LiveRequirements } from './x402live.js';

/**
 * Payment rail on the server.
 *  - simulated: settlements are recorded in SQLite with keccak refs and labelled simulated.
 *  - live: the payer's partially signed Hedera transaction goes to the configured facilitator for verify + settle.
 */
export interface Requirements { requestId: string; resource: string; payTo: string; amount: Micro; asset: 'USDC'; network: string }
export interface Receipt { txRef: string; explorerUrl: string; settledAt: number; simulated: boolean }

export const NETWORK = LIVE_NETWORK;
export const facilitator = {
  name: LIVE ? 'x402 facilitator' : 'Simulated facilitator',
  url: process.env.X402_FACILITATOR_URL ?? 'https://docs.hedera.com/solutions/ai/x402/facilitators',
  sponsorsFees: true,
  live: LIVE,
};

function record(txRef: string, requestId: string, amount: Micro, payer: string, payee: string, simulated: boolean) {
  db.prepare('INSERT OR IGNORE INTO settlements (tx_ref, request_id, amount, payer, payee, network, simulated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(txRef, requestId, amount.toString(), payer, payee, NETWORK, simulated ? 1 : 0, now());
}

export async function settle(req: Requirements, from: string, _agentSig: string, _guardSig: string, live?: { payload: LivePayload; requirements: LiveRequirements }): Promise<Receipt> {
  if (facilitator.live) {
    if (!live) throw new Error('Live settlement needs the agent\'s signed Hedera transaction (x402Payload)');
    const { transactionId } = await verifyAndSettle(live.payload, live.requirements);
    record(transactionId, req.requestId, req.amount, from, req.payTo, false);
    return { txRef: transactionId, explorerUrl: hashscan(transactionId), settledAt: now(), simulated: false };
  }
  const txRef = ethers.keccak256(ethers.toUtf8Bytes(`${req.requestId}|${from}|${req.payTo}|${req.amount}|${now()}`));
  record(txRef, req.requestId, req.amount, from, req.payTo, true);
  return { txRef, explorerUrl: `https://hashscan.io/testnet/transaction/${txRef}`, settledAt: now(), simulated: true };
}

/** Reservation fees and releases. On the live rail these are ordinary x402 payments initiated by the team's agent; until then they are recorded like simulated settlements. */
export async function transfer(from: string, to: string, amount: Micro, memo: string): Promise<Receipt> {
  const txRef = ethers.keccak256(ethers.toUtf8Bytes(`${memo}|${from}|${to}|${amount}|${now()}`));
  record(txRef, memo, amount, from, to, true);
  return { txRef, explorerUrl: `https://hashscan.io/testnet/transaction/${txRef}`, settledAt: now(), simulated: true };
}

/** Record a settlement that arrived through the standard x402 header on the supplier endpoint. */
export function recordExternal(transactionId: string, requestId: string, amount: Micro, payer: string, payee: string) {
  record(transactionId, requestId, amount, payer, payee, false);
}

/** The supplier's side: is this settlement known and does it pay me the stated amount for this request? */
export function verifySettlement(txRef: string, requestId: string, payee: string, amount: Micro): boolean {
  const row = db.prepare('SELECT request_id, payee, amount FROM settlements WHERE tx_ref = ?').get(txRef) as { request_id: string; payee: string; amount: string } | undefined;
  return !!row && row.request_id === requestId && row.payee.toLowerCase() === payee.toLowerCase() && BigInt(row.amount) >= amount;
}
