// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ethers } from 'ethers';
import { addressOfPublicKey, open, openJson, publicKeyOf, recoverPublicKey, seal, sealJson } from '@/lib/ecies';

describe('ecies', () => {
  it('round-trips a payload sealed to a public key', () => {
    const w = ethers.Wallet.createRandom();
    const pub = publicKeyOf(w.privateKey);
    const env = seal(new TextEncoder().encode('invoice page 7'), pub);
    expect(new TextDecoder().decode(open(env, w.privateKey))).toBe('invoice page 7');
    expect(openJson<{ page: number }>(sealJson({ page: 7 }, pub), w.privateKey)).toEqual({ page: 7 });
  });
  it('refuses the wrong key and tampered bytes', () => {
    const a = ethers.Wallet.createRandom();
    const b = ethers.Wallet.createRandom();
    const env = seal(new TextEncoder().encode('secret'), publicKeyOf(a.privateKey));
    expect(() => open(env, b.privateKey)).toThrow();
    const tampered = new Uint8Array(env); tampered[tampered.length - 1] ^= 1;
    expect(() => open(tampered, a.privateKey)).toThrow();
  });
  it('recovers the signer public key from a personal_sign signature', async () => {
    const w = ethers.Wallet.createRandom();
    const sig = await w.signMessage('Coquire key registration');
    const pub = recoverPublicKey('Coquire key registration', sig);
    expect(pub).toBe(publicKeyOf(w.privateKey));
    expect(addressOfPublicKey(pub).toLowerCase()).toBe(w.address.toLowerCase());
  });
});
