import { secp256k1 } from '@noble/curves/secp256k1.js';
import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { ethers } from 'ethers';

/**
 * ECIES over secp256k1 for payloads addressed to an EVM key:
 * ephemeral key → ECDH shared secret → HKDF-SHA256 → AES-256-GCM.
 * Envelope: 0x01 | ephemeral pubkey (33) | nonce (12) | ciphertext+tag.
 * The recipient public key is the same key the account signs with, so a MetaMask
 * user's key can be recovered from any signature they produce (see recoverPublicKey).
 */
const VERSION = 0x01;
const INFO = new TextEncoder().encode('coquire-ecies-v1');

const hex = (b: Uint8Array) => '0x' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => Uint8Array.from((s.startsWith('0x') ? s.slice(2) : s).match(/.{2}/g)!.map((h) => parseInt(h, 16)));

function deriveKey(shared: Uint8Array, ephemeralPub: Uint8Array, recipientPub: Uint8Array): Uint8Array {
  const salt = new Uint8Array(ephemeralPub.length + recipientPub.length);
  salt.set(ephemeralPub, 0);
  salt.set(recipientPub, ephemeralPub.length);
  return hkdf(sha256, shared, salt, INFO, 32);
}

/** recipientPublicKey: 33- or 65-byte secp256k1 public key, hex. */
export function seal(plaintext: Uint8Array, recipientPublicKey: string): Uint8Array {
  const recipient = secp256k1.Point.fromHex(recipientPublicKey.replace(/^0x/, '')).toBytes(true);
  const ephPriv = secp256k1.utils.randomSecretKey();
  const ephPub = secp256k1.getPublicKey(ephPriv, true);
  const shared = secp256k1.getSharedSecret(ephPriv, recipient, true).slice(1);
  const key = deriveKey(shared, ephPub, recipient);
  const nonce = randomBytes(12);
  const ct = gcm(key, nonce).encrypt(plaintext);
  const out = new Uint8Array(1 + 33 + 12 + ct.length);
  out[0] = VERSION;
  out.set(ephPub, 1);
  out.set(nonce, 34);
  out.set(ct, 46);
  return out;
}

export function open(envelope: Uint8Array, recipientPrivateKey: string): Uint8Array {
  if (envelope[0] !== VERSION) throw new Error('Unknown envelope version');
  const ephPub = envelope.slice(1, 34);
  const nonce = envelope.slice(34, 46);
  const ct = envelope.slice(46);
  const priv = unhex(recipientPrivateKey);
  const recipient = secp256k1.getPublicKey(priv, true);
  const shared = secp256k1.getSharedSecret(priv, ephPub, true).slice(1);
  const key = deriveKey(shared, ephPub, recipient);
  return gcm(key, nonce).decrypt(ct);
}

export const sealJson = (value: unknown, recipientPublicKey: string) => hex(seal(new TextEncoder().encode(JSON.stringify(value)), recipientPublicKey));
export const openJson = <T>(envelopeHex: string, recipientPrivateKey: string): T => JSON.parse(new TextDecoder().decode(open(unhex(envelopeHex), recipientPrivateKey))) as T;

/** Public key (compressed hex) of whoever signed `message` to produce `signature`. Works for MetaMask personal_sign. */
export function recoverPublicKey(message: string, signature: string): string {
  const digest = ethers.hashMessage(message);
  const uncompressed = ethers.SigningKey.recoverPublicKey(digest, signature);
  return ethers.SigningKey.computePublicKey(uncompressed, true);
}

export const publicKeyOf = (privateKey: string) => ethers.SigningKey.computePublicKey(privateKey, true);
export const addressOfPublicKey = (publicKey: string) => ethers.computeAddress(publicKey);
