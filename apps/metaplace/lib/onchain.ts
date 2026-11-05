/** Compra on-chain desde el navegador (approve BRLT + Marketplace.buy). */
import { encodeFunctionData, parseAbi } from "viem";

export const BRLT_ADDRESS = "0xf08521C9359E5950E9334D79C29cbDC2059a31f8" as const;
export const MARKETPLACE_ADDRESS = "0x8b79fa806Afacf81889fdfFf610E555844583F01" as const;
export const CHAIN_ID_HEX = "0x7a69";

const BRLT_ABI = parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]);
const MARKET_ABI = parseAbi(["function buy(uint256 listingId)", "function confirmReceipt(uint256 listingId)"]);

interface EthProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
function provider(): EthProvider {
  const eth = (globalThis as unknown as { ethereum?: EthProvider }).ethereum;
  if (!eth) throw new Error("No se detectó una billetera en el navegador.");
  return eth;
}

export async function ensureChain(): Promise<void> {
  const eth = provider();
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current?.toLowerCase() === CHAIN_ID_HEX) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  } catch {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: CHAIN_ID_HEX,
        chainName: "Barlo Anvil (GCP)",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL ?? ""],
      }],
    });
  }
}

/** Ejecuta approve(BRLT) + Marketplace.buy y devuelve el tx hash de la compra. */
export async function buyOnchain(listingId: string, priceWei: bigint): Promise<string> {
  await ensureChain();
  const eth = provider();
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  await eth.request({
    method: "eth_sendTransaction",
    params: [{ from, to: BRLT_ADDRESS, data: encodeFunctionData({ abi: BRLT_ABI, functionName: "approve", args: [MARKETPLACE_ADDRESS, priceWei] }) }],
  });
  return (await eth.request({
    method: "eth_sendTransaction",
    params: [{ from, to: MARKETPLACE_ADDRESS, data: encodeFunctionData({ abi: MARKET_ABI, functionName: "buy", args: [BigInt(listingId)] }) }],
  })) as string;
}

export async function confirmOnchain(listingId: string): Promise<string> {
  await ensureChain();
  const eth = provider();
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  return (await eth.request({
    method: "eth_sendTransaction",
    params: [{ from: accounts[0], to: MARKETPLACE_ADDRESS, data: encodeFunctionData({ abi: MARKET_ABI, functionName: "confirmReceipt", args: [BigInt(listingId)] }) }],
  })) as string;
}
