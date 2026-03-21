import { JsonRpcProvider } from 'ethers';

const cache = new Map<string, JsonRpcProvider>();

export function getProvider(url: string): JsonRpcProvider {
  if (!cache.has(url)) {
    cache.set(url, new JsonRpcProvider(url));
  }
  return cache.get(url)!;
}

export function getAlchemyUrl(network: string): string {
  const key = process.env.ALCHEMY_API_KEY;
  return `https://${network}.g.alchemy.com/v2/${key}`;
}
