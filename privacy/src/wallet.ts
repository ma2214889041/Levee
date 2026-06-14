/** Minimal injected-wallet (MetaMask) connection on Sepolia. */
export interface EthProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
declare global {
  interface Window {
    ethereum?: EthProvider;
  }
}

const SEPOLIA_HEX = "0xaa36a7"; // 11155111

export async function connectWallet(): Promise<string> {
  const eth = window.ethereum;
  if (!eth) throw new Error("No injected EVM wallet found. Install MetaMask.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_HEX }],
    });
  } catch {
    // Sepolia may not be added to the wallet; the demo continues regardless.
  }
  return accounts[0];
}
