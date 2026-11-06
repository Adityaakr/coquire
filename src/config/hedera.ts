export const HEDERA_TESTNET = {
  chainId: 296,
  chainIdHex: '0x128',
  name: 'Hedera Testnet',
  rpcUrl: import.meta.env.VITE_HEDERA_RPC_URL || 'https://testnet.hashio.io/api',
  mirrorUrl: import.meta.env.VITE_HEDERA_MIRROR_URL || 'https://testnet.mirrornode.hedera.com',
  explorerUrl: 'https://hashscan.io/testnet',
  currency: { name: 'HBAR', symbol: 'HBAR', decimals: 18 },
};
