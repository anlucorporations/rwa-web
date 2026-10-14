interface EthereumProvider {
  isMetaMask?: boolean;
  isCodeCrypto?: boolean;
  isCoinbaseWallet?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  removeAllListeners?: (event: string) => void;
  providers?: EthereumProvider[];
}

interface Window {
  ethereum?: EthereumProvider;
}

