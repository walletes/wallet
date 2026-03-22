import { JsonRpcProvider, FetchRequest } from 'ethers';

const providerCache = new Map<string, JsonRpcProvider>();

//  Hardcoded high-reliability mapping for Alchemy
const ALCHEMY_NETWORKS: Record<string, string> = {
  ethereum: 'eth-mainnet',
  polygon: 'polygon-mainnet',
  arbitrum: 'arb-mainnet',
  optimism: 'opt-mainnet',
  base: 'base-mainnet',
  blast: 'blast-mainnet',
  zksync: 'zksync-mainnet',
  linea: 'linea-mainnet',
  scroll: 'scroll-mainnet',
  fantom: 'fantom-mainnet'
};

/**
 * Enhanced Alchemy URL Generator
 * Checks if network is in our mapping, otherwise constructs it dynamically
 */
export function getAlchemyUrl(network: string): string | null {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return null;

  const slug = ALCHEMY_NETWORKS[network.toLowerCase()] || `${network.toLowerCase().trim()}-mainnet`;
  return `https://${slug}.g.alchemy.com/v2/${apiKey}`;
}

/**
 * Heavy-Duty Provider Factory
 * Features: 5s Timeouts, Static Network Optimization, and Dynamic Alchemy Routing
 */
export function getProvider(rpcOrNetwork: string): JsonRpcProvider {
  if (providerCache.has(rpcOrNetwork)) {
    return providerCache.get(rpcOrNetwork)!;
  }

  // Determine actual URL: Is it a full URL or an Alchemy network slug?
  const isUrl = rpcOrNetwork.startsWith('http');
  const url = isUrl ? rpcOrNetwork : getAlchemyUrl(rpcOrNetwork);

  if (!url) {
    throw new Error(`Invalid RPC or Network: ${rpcOrNetwork}`);
  }

  // Use FetchRequest for Network-Level Timeouts (Stops scanner hanging)
  const request = new FetchRequest(url);
  request.timeout = 5000; 

  // Use staticNetwork: true (Stops 'eth_chainId' spam, makes scan 2x faster)
  const provider = new JsonRpcProvider(request, undefined, {
    staticNetwork: true,
  });

  providerCache.set(rpcOrNetwork, provider);
  return provider;
}

/**
 * Health Check: Validates if a provider is alive in < 3 seconds
 */
export async function isProviderHealthy(provider: JsonRpcProvider): Promise<boolean> {
  try {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );
    await Promise.race([provider.getBlockNumber(), timeout]);
    return true;
  } catch {
    return false;
  }
}
