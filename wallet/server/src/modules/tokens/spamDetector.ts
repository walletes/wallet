export interface TokenClassification {
  status: 'verified' | 'spam' | 'dust' | 'clean';
  securityNote: string | null;
  score: number;
  usdValue: number;
}

const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

async function getCachedPrice(key: string, fetcher: () => Promise<number>): Promise<number> {
  const now = Date.now();
  const cached = priceCache.get(key);
  if (cached && (now - cached.timestamp < CACHE_DURATION)) return cached.price;
  const freshPrice = await fetcher();
  priceCache.set(key, { price: freshPrice, timestamp: now });
  return freshPrice;
}

export async function classifyToken(asset: any): Promise<TokenClassification> {
  const name = (asset.name || '').toLowerCase();
  const symbol = (asset.symbol || '').toLowerCase();
  const balance = parseFloat(asset.balance) || 0;
  
  const blacklist = ['visit', '.com', '.io', '.net', 'claim', 'free', 'reward', 'voucher', 'airdrop'];
  if (blacklist.some(k => name.includes(k) || symbol.includes(k))) {
    return { status: 'spam', securityNote: 'Phishing: High risk of wallet drain', score: 0, usdValue: 0 };
  }

  let usdValue = 0;
  try {
    if (asset.type === 'native') {
      const ethPrice = await getCachedPrice('eth-price', async () => {
        const res = await fetch('https://api.binance.com');
        const data = await res.json();
        return parseFloat(data.price) || 3000;
      });
      usdValue = balance * ethPrice;
    } else if (asset.contract) {
      const tokenPrice = await getCachedPrice(`price-${asset.contract}`, async () => {
        // Correcting variable usage to satisfy TypeScript
        const networkId = asset.chain.toLowerCase() === 'ethereum' ? 'ethereum' : 'polygon-pos';
        const baseUrl = 'https://api.coingecko.com';
        
        // Dynamic fetch using the networkId variable
        const res = await fetch(`${baseUrl}/${networkId}?contract_addresses=${asset.contract}&vs_currencies=usd`);
        const data = await res.json();
        return data[asset.contract.toLowerCase()]?.usd || 0;
      });
      usdValue = balance * tokenPrice;
    }
  } catch { usdValue = 0; }

  if (balance > 0 && usdValue > 0 && usdValue < 1.0) {
    return { status: 'dust', securityNote: `Dust: Value approx $${usdValue.toFixed(4)}`, score: 40, usdValue };
  }

  const isVerified = !!asset.logo || usdValue > 10;
  return {
    status: isVerified ? 'verified' : 'clean',
    securityNote: usdValue > 100 ? 'High Value Asset' : null,
    score: isVerified ? 100 : 70,
    usdValue
  };
}
