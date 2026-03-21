import { formatEther, formatUnits } from 'ethers';
import { EVM_CHAINS, ChainConfig } from './chains.js';
import { getProvider, getAlchemyUrl } from './provider.js';
import { fetchFromCovalent, fetchFromMoralis, AggregatedToken } from './aggregator.js';

export interface FinalAsset {
  chain: string;
  type: string;
  symbol: string;
  name?: string;
  balance: string;
  contract?: string;
  logo?: string | null;
}

async function fetchMeta(url: string, contract: string) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "alchemy_getTokenMetadata", params: [contract] })
    });
    const data = await res.json();
    return data.result;
  } catch { return null; }
}

export async function scanGlobalWallet(address: string): Promise<FinalAsset[]> {
  const tasks = EVM_CHAINS.map(async (chain: ChainConfig) => {
    try {
      const provider = getProvider(chain.rpc);
      let assets: FinalAsset[] = [];

      // 1. Native balance check
      const native = await Promise.race([
        provider.getBalance(address),
        new Promise<bigint>((_, r) => setTimeout(() => r(0n), 3500))
      ]);

      if (native && native > 0n) {
        assets.push({ chain: chain.name, type: 'native', symbol: chain.symbol, balance: formatEther(native) });
      }

      // 2. Alchemy Deep Scan (Automatic Token Discovery)
      if (chain.alchemy && process.env.ALCHEMY_API_KEY) {
        const url = getAlchemyUrl(chain.alchemy);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "alchemy_getTokenBalances", params: [address, "DEFAULT_TOKENS"] })
        });
        const { result } = await res.json();
        
        if (result?.tokenBalances) {
          const alchemyTokens = await Promise.all(result.tokenBalances.map(async (t: any) => {
            if (t.tokenBalance === "0x0" || t.tokenBalance.length < 5) return null;
            const meta = await fetchMeta(url, t.contractAddress);
            return meta ? {
              chain: chain.name,
              type: 'erc20',
              symbol: meta.symbol,
              name: meta.name,
              balance: formatUnits(t.tokenBalance, meta.decimals || 18),
              contract: t.contractAddress,
              logo: meta.logo
            } : null;
          }));
          assets.push(...(alchemyTokens.filter(Boolean) as FinalAsset[]));
          // If Alchemy found tokens, we consider this chain "covered" and skip fallbacks
          if (assets.length > 1) return assets; 
        }
      }

      // 3. Fallback logic: Covalent then Moralis
      const covalentRes: AggregatedToken[] = await fetchFromCovalent(chain.id, address);
      if (covalentRes.length > 0) {
        assets.push(...covalentRes.map(t => ({
          chain: chain.name,
          type: t.type,
          symbol: t.symbol,
          name: t.name,
          balance: formatUnits(t.balance, t.decimals),
          contract: t.contract,
          logo: t.logo
        })));
      } else if (chain.moralis) {
        const moralisRes: AggregatedToken[] = await fetchFromMoralis(address, chain.moralis);
        assets.push(...moralisRes.map(t => ({
          chain: chain.name,
          type: t.type,
          symbol: t.symbol,
          name: t.name,
          balance: formatUnits(t.balance, t.decimals),
          contract: t.contract,
          logo: t.logo
        })));
      }

      return assets;
    } catch { return []; }
  });

  const results = await Promise.all(tasks);
  return results.flat();
}

// Fixed signature
export async function scanWallet(_address?: string) { return []; }
