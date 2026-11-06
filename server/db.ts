import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ethers } from 'ethers';

const path = process.env.DATABASE_PATH ?? (process.env.RAILWAY_VOLUME_MOUNT_PATH ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/coquire.sqlite` : './data/coquire.sqlite');
mkdirSync(dirname(path), { recursive: true });

export const db = new Database(path);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS accounts (
  address TEXT PRIMARY KEY,
  agent_address TEXT,
  agent_public_key TEXT,
  team_name TEXT,
  supplier_name TEXT,
  list_rate TEXT,
  role TEXT NOT NULL DEFAULT 'buyer',
  delegation TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, address TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL, version INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS actions (seq INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT, type TEXT NOT NULL, json TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS blobs (ref TEXT PRIMARY KEY, for_address TEXT NOT NULL, owner TEXT, bytes BLOB NOT NULL, mime TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settlements (tx_ref TEXT PRIMARY KEY, request_id TEXT NOT NULL, amount TEXT NOT NULL, payer TEXT NOT NULL, payee TEXT NOT NULL, network TEXT NOT NULL, simulated INTEGER NOT NULL, created_at INTEGER NOT NULL);
`);

/** Secrets the server needs. Supplied through env in production; generated once and persisted in dev so the app runs with no config. */
export function secret(name: 'GUARD_PRIVATE_KEY' | 'SUPPLIER_PRIVATE_KEY' | 'SESSION_SECRET'): string {
  const fromEnv = process.env[name];
  if (fromEnv) return fromEnv;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(name) as { value: string } | undefined;
  if (row) return row.value;
  const value = name === 'SESSION_SECRET' ? ethers.hexlify(ethers.randomBytes(32)) : ethers.Wallet.createRandom().privateKey;
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(name, value);
  console.warn(`[coquire] ${name} was not set; generated one and stored it in the database. Set it in the environment for production.`);
  return value;
}

export const now = () => Date.now();
