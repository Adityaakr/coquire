interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, handler: (...args: never[]) => void) => void;
    removeListener: (event: string, handler: (...args: never[]) => void) => void;
  };
}
