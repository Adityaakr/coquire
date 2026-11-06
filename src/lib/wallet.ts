import { ethers } from 'ethers';
import { HEDERA_TESTNET } from '@/config/hedera';

export async function connectMetaMask(): Promise<{
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  address: string;
  chainId: number;
}> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== HEDERA_TESTNET.chainId) {
    await switchToHederaTestnet();
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const updatedNetwork = await provider.getNetwork();

  return { provider, signer, address, chainId: Number(updatedNetwork.chainId) };
}

async function switchToHederaTestnet() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: HEDERA_TESTNET.chainIdHex }],
    });
  } catch (err) {
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: HEDERA_TESTNET.chainIdHex,
          chainName: HEDERA_TESTNET.name,
          rpcUrls: [HEDERA_TESTNET.rpcUrl],
          nativeCurrency: HEDERA_TESTNET.currency,
          blockExplorerUrls: [HEDERA_TESTNET.explorerUrl],
        }],
      });
    } else {
      throw err;
    }
  }
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
