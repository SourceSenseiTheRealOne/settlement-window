import {
  createWalletClient,
  custom,
  getAddress,
  type EIP1193Provider,
  type WalletClient,
} from "viem";
import {
  SHANNON_CHAIN_ID,
  SHANNON_EXPLORER_URL,
  SHANNON_HTTP_RPC_URL,
  somniaShannon,
} from "./config";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export interface WalletConnection {
  address: `0x${string}`;
  client: WalletClient;
}

export async function connectShannonWallet(): Promise<WalletConnection> {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error("Install an EVM wallet such as MetaMask to use testnet protection.");
  }

  const chainHex = `0x${SHANNON_CHAIN_ID.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainHex,
          chainName: "Somnia Shannon Testnet",
          nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
          rpcUrls: [SHANNON_HTTP_RPC_URL],
          blockExplorerUrls: [SHANNON_EXPLORER_URL],
        },
      ],
    });
  }

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  const first = accounts[0];
  if (!first) throw new Error("The wallet did not return an account.");
  const address = getAddress(first);

  return {
    address,
    client: createWalletClient({
      account: address,
      chain: somniaShannon,
      transport: custom(provider),
    }),
  };
}
