import type { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { SignJWT, jwtVerify } from 'jose';
import { db, now, secret } from './db.js';
import { recoverPublicKey } from '../src/lib/ecies.js';

const COOKIE = 'coquire_session';
const key = new TextEncoder().encode(secret('SESSION_SECRET'));
const origin = () => process.env.APP_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`;
const chainId = () => Number(process.env.CHAIN_ID ?? 296);

export interface Account {
  address: string;
  agentAddress: string | null;
  agentPublicKey: string | null;
  teamName: string | null;
  supplierName: string | null;
  listRate: string | null;
  role: 'buyer' | 'supplier';
  delegation: string | null;
  createdAt: number;
}

export function getAccount(address: string): Account | null {
  const r = db.prepare('SELECT * FROM accounts WHERE address = ?').get(address.toLowerCase()) as Record<string, unknown> | undefined;
  if (!r) return null;
  return { address: r.address as string, agentAddress: r.agent_address as string | null, agentPublicKey: r.agent_public_key as string | null, teamName: r.team_name as string | null, supplierName: r.supplier_name as string | null, listRate: r.list_rate as string | null, role: (r.role as 'buyer' | 'supplier') ?? 'buyer', delegation: r.delegation as string | null, createdAt: r.created_at as number };
}

/** EIP-4361 shaped message. The agent key is bound inside the statement so one wallet signature registers it. */
export function signInMessage(address: string, nonce: string, agentAddress: string, issuedAt: string): string {
  const host = new URL(origin()).host;
  return `${host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Coquire. This registers agent key ${agentAddress} as your payment and sealing key.\n\nURI: ${origin()}\nVersion: 1\nChain ID: ${chainId()}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

export function issueNonce(address: string): string {
  const nonce = ethers.hexlify(ethers.randomBytes(16)).slice(2);
  db.prepare('DELETE FROM nonces WHERE created_at < ?').run(now() - 10 * 60_000);
  db.prepare('INSERT INTO nonces (nonce, address, created_at) VALUES (?, ?, ?)').run(nonce, address.toLowerCase(), now());
  return nonce;
}

export function consumeNonce(nonce: string, address: string): boolean {
  const row = db.prepare('SELECT address, created_at FROM nonces WHERE nonce = ?').get(nonce) as { address: string; created_at: number } | undefined;
  if (!row || row.address !== address.toLowerCase() || row.created_at < now() - 10 * 60_000) return false;
  db.prepare('DELETE FROM nonces WHERE nonce = ?').run(nonce);
  return true;
}

/**
 * Verify the wallet signature over the sign-in message and the agent key's proof that it belongs to this wallet.
 * The agent key signs the wallet address; its public key is recovered from that signature so results can be sealed to it.
 */
export function verifySignIn(input: { address: string; message: string; signature: string; agentAddress: string; agentSignature: string; nonce: string }): Account {
  const address = input.address.toLowerCase();
  const recovered = ethers.verifyMessage(input.message, input.signature).toLowerCase();
  if (recovered !== address) throw new Error('Wallet signature does not match the address');
  if (!input.message.includes(`Nonce: ${input.nonce}`) || !input.message.includes(`agent key ${input.agentAddress}`)) throw new Error('Message does not carry the expected nonce and agent key');
  if (!consumeNonce(input.nonce, address)) throw new Error('Nonce is unknown or expired');
  const agentProof = `Coquire agent key for ${address}`;
  const agentRecovered = ethers.verifyMessage(agentProof, input.agentSignature).toLowerCase();
  if (agentRecovered !== input.agentAddress.toLowerCase()) throw new Error('Agent key proof does not match');
  const agentPublicKey = recoverPublicKey(agentProof, input.agentSignature);
  const existing = getAccount(address);
  if (existing) {
    db.prepare('UPDATE accounts SET agent_address = ?, agent_public_key = ? WHERE address = ?').run(input.agentAddress.toLowerCase(), agentPublicKey, address);
  } else {
    db.prepare('INSERT INTO accounts (address, agent_address, agent_public_key, created_at) VALUES (?, ?, ?, ?)').run(address, input.agentAddress.toLowerCase(), agentPublicKey, now());
  }
  return getAccount(address)!;
}

export async function setSession(res: Response, address: string) {
  const token = await new SignJWT({ sub: address.toLowerCase() }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(key);
  const secure = origin().startsWith('https');
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${secure ? '; Secure' : ''}`);
}

export function clearSession(res: Response) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export async function readSession(req: Request): Promise<string | null> {
  const raw = req.headers.cookie?.split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, key);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request { account: Account }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  readSession(req).then((address) => {
    const account = address ? getAccount(address) : null;
    if (!account) { res.status(401).json({ error: 'Sign in first' }); return; }
    (req as AuthedRequest).account = account;
    next();
  }).catch(next);
}
