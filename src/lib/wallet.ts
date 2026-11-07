import { ethers } from 'ethers';
import { HEDERA_TESTNET } from '@/config/hedera';

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (e: string, h: (...a: never[]) => void) => void; removeListener?: (e: string, h: (...a: never[]) => void) => void; isMetaMask?: boolean; isPhantom?: boolean };
type Announce = CustomEvent<{ info: { uuid: string; name: string; rdns: string }; provider: Eip1193 }>;

let discovered: { rdns: string; name: string; provider: Eip1193 }[] = [];
let listening = false;
function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('eip6963:announceProvider', (e) => {
    const d = (e as Announce).detail;
    if (!discovered.some((x) => x.rdns === d.info.rdns)) discovered.push({ rdns: d.info.rdns, name: d.info.name, provider: d.provider });
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/** The real MetaMask provider, even when Phantom or another wallet has claimed window.ethereum. */
export async function getMetaMaskProvider(): Promise<Eip1193 | null> {
  listen();
  await new Promise((r) => setTimeout(r, 120));
  const mm = discovered.find((d) => d.rdns === 'io.metamask');
  if (mm) return mm.provider;
  const eth = (window as unknown as { ethereum?: Eip1193 & { providers?: Eip1193[] } }).ethereum;
  if (!eth) return null;
  const fromList = eth.providers?.find((p) => p.isMetaMask && !p.isPhantom);
  if (fromList) return fromList;
  return eth.isMetaMask && !eth.isPhantom ? eth : null;
}

export function hasMetaMask(): boolean {
  listen();
  const eth = (window as unknown as { ethereum?: Eip1193 & { providers?: Eip1193[] } }).ethereum;
  return discovered.some((d) => d.rdns === 'io.metamask') || !!eth?.providers?.some((p) => p.isMetaMask && !p.isPhantom) || !!(eth?.isMetaMask && !eth.isPhantom);
}

export async function connectMetaMask(): Promise<{ provider: ethers.BrowserProvider; signer: ethers.JsonRpcSigner; address: string; chainId: number; raw: Eip1193 }> {
  const raw = await getMetaMaskProvider();
  if (!raw) throw new Error('MetaMask is not installed. Install it or use a browser key.');
  const provider = new ethers.BrowserProvider(raw as never);
  await provider.send('eth_requestAccounts', []);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== HEDERA_TESTNET.chainId) await switchToHederaTestnet(raw);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const updated = await provider.getNetwork();
  return { provider, signer, address, chainId: Number(updated.chainId), raw };
}

async function switchToHederaTestnet(raw: Eip1193) {
  try {
    await raw.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: HEDERA_TESTNET.chainIdHex }] });
  } catch (err) {
    if ((err as { code?: number }).code === 4902) {
      await raw.request({ method: 'wallet_addEthereumChain', params: [{ chainId: HEDERA_TESTNET.chainIdHex, chainName: HEDERA_TESTNET.name, rpcUrls: [HEDERA_TESTNET.rpcUrl], nativeCurrency: HEDERA_TESTNET.currency, blockExplorerUrls: [HEDERA_TESTNET.explorerUrl] }] });
    } else {
      throw err;
    }
  }
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
