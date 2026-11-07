import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { ethers } from 'ethers';
import { connectMetaMask } from '@/lib/wallet';
import { HEDERA_TESTNET } from '@/config/hedera';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getSigner: () => Promise<ethers.JsonRpcSigner | null>;
}

const WalletContext = createContext<WalletState>({
  address: null,
  isConnected: false,
  chainId: null,
  provider: null,
  signer: null,
  isCorrectNetwork: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  getSigner: async () => null,
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const rawRef = useRef<{ on?: (e: string, h: (...a: never[]) => void) => void; removeListener?: (e: string, h: (...a: never[]) => void) => void } | null>(null);

  const isConnected = !!address;
  const isCorrectNetwork = chainId === HEDERA_TESTNET.chainId;

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result = await connectMetaMask();
      rawRef.current = result.raw;
      setProvider(result.provider);
      setSigner(result.signer);
      setAddress(result.address);
      setChainId(result.chainId);
    } catch (err) {
      console.error('Wallet connection failed:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const signerRef = useRef<ethers.JsonRpcSigner | null>(null);
  useEffect(() => { signerRef.current = signer; }, [signer]);
  const getSigner = useCallback(async () => {
    if (signerRef.current) return signerRef.current;
    const result = await connectMetaMask();
    rawRef.current = result.raw;
    setProvider(result.provider); setSigner(result.signer); setAddress(result.address); setChainId(result.chainId);
    return result.signer;
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
  }, []);

  useEffect(() => {
    const raw = rawRef.current;
    if (!raw?.on) return;

    const handleAccountsChanged = (...args: never[]) => {
      const accounts = args[0] as unknown as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
      }
    };

    const handleChainChanged = (...args: never[]) => {
      const newChainId = args[0] as unknown as string;
      setChainId(parseInt(newChainId, 16));
      if (address) {
        connect();
      }
    };

    raw.on('accountsChanged', handleAccountsChanged as never);
    raw.on('chainChanged', handleChainChanged as never);

    return () => {
      raw.removeListener?.('accountsChanged', handleAccountsChanged as never);
      raw.removeListener?.('chainChanged', handleChainChanged as never);
    };
  }, [address, connect, disconnect]);

  return (
    <WalletContext.Provider value={{
      address, isConnected, chainId, provider, signer, isCorrectNetwork, isConnecting, connect, disconnect, getSigner,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
