import { logger } from '../../utils/logger.js';

export interface TokenClassification {
  status: 'verified' | 'spam' | 'dust' | 'clean';
  securityNote: string | null;
  score: number;
  usdValue: number;
  isHoneypot?: boolean;
  isBlacklisted?: boolean;
}

// Configuration from Environment (No more hardcoding)
const CONFIG = {
  GOPLUS_API: process.env.GOPLUS_API_BASE || 'https://api.gopluslabs.io',
  COINGECKO_API: process.env.COINGECKO_API_BASE || 'https://api.coingecko.com',
  CACHE_DURATION: Number(process.env.PRICE_CACHE_MS) || 300000, // 5 mins
  DUST_THRESHOLD: Number(process.env.DUST_THRESHOLD_USD) || 0.50,
  CHAIN_MAP: JSON.parse(process.env.CHAIN_ID_MAP || '{"ethereum":"1","base":"8453","polygon":"137","bsc":"56","arbitrum":"42161"}'),
  CG_PLATFORM_MAP: JSON.parse(process.env.CG_PLATFORM_MAP || '{"ethereum":"ethereum","polygon":"polygon-pos","base":"base","bsc":"binance-smart-chain"}')
};

const priceCache = new Map<string, { price: number; timestamp: number }>();

async function getCachedPrice(key: string, fetcher: () => Promise<number>): Promise<number> {
  const now = Date.now();
  const cached = priceCache.get(key);
  if (cached && (now - cached.timestamp < CONFIG.CACHE_DURATION)) return cached.price;
  
  try {
    const freshPrice = await fetcher();
    if (freshPrice > 0) {
      priceCache.set(key, { price: freshPrice, timestamp: now });
    }
    return freshPrice;
  } catch (err) {
    logger.warn(`[PriceCache] Fetch failed for ${key}, using stale if available.`);
    return cached?.price || 0;
  }
}

/**
 * UPGRADED: Dynamic Spam & Threat Detector
 * Removes hardcoded URLs and implements resilient API calling for financial accuracy.
 */
export async function classifyToken(asset: any): Promise<TokenClassification> {
  const name = (asset.name || '').toLowerCase();
  const symbol = (asset.symbol || '').toLowerCase();
  const address = (asset.address || asset.contract || '').toLowerCase();
  const balance = parseFloat(asset.balance) || 0;
  const chainName = (asset.chain || 'ethereum').toLowerCase();

  // 1. DYNAMIC HEURISTIC ANALYSIS
  const spamKeywords = (process.env.SPAM_KEYWORDS || 'visit,claim,free,reward,voucher,airdrop,ticket').split(',');
  if (spamKeywords.some(k => name.includes(k) || symbol.includes(k))) {
    return { status: 'spam', securityNote: 'Phishing: Flagged metadata keywords', score: 0, usdValue: 0 };
  }

  // 2. SECURITY SCAN (GoPlus API) - Fixed dynamic URL construction
  let isHoneypot = false;
  let isBlacklisted = false;

  if (address && asset.type !== 'native') {
    try {
      const chainId = CONFIG.CHAIN_MAP[chainName] || '1';
      const response = await fetch(`${CONFIG.GOPLUS_API}/${chainId}?contract_addresses=${address}`);
      
      if (response.ok) {
        const data = await response.json();
        const security = data.result?.[address];

        if (security) {
          isHoneypot = security.is_honeypot === "1";
          isBlacklisted = security.is_blacklisted === "1" || security.trust_list === "0";
          
          if (isHoneypot || isBlacklisted) {
            return { 
              status: 'spam', 
              securityNote: isHoneypot ? 'CRITICAL: Honeypot detected' : 'RISK: Blacklisted/Low Trust', 
              score: 0, 
              usdValue: 0 
            };
          }
        }
      }
    } catch (err) {
      logger.error(`[SecurityScan] Failed for ${address} on ${chainName}: ${err}`);
    }
  }

  // 3. MULTI-SOURCE PRICE DISCOVERY
  let usdValue = 0;
  try {
    if (asset.type === 'native') {
      usdValue = balance * (asset.rawPrice || 0); // Prefer upstream price if injected
    } else if (address) {
      const tokenPrice = await getCachedPrice(`price-${address}`, async () => {
        const platform = CONFIG.CG_PLATFORM_MAP[chainName] || 'ethereum';
        const url = `${CONFIG.COINGECKO_API}/${platform}?contract_addresses=${address}&vs_currencies=usd`;
        
        const res = await fetch(url);
        if (!res.ok) return 0;
        const data = await res.json();
        return data[address]?.usd || 0;
      });
      usdValue = balance * tokenPrice;
    }
  } catch (err) {
    logger.warn(`[PriceDiscovery] Failed for ${symbol}: ${err}`);
  }

  // 4. PRODUCTION-GRADE CLASSIFICATION
  if (balance > 0 && usdValue > 0 && usdValue < CONFIG.DUST_THRESHOLD) {
    return { status: 'dust', securityNote: `Low Value: <$${CONFIG.DUST_THRESHOLD}`, score: 40, usdValue };
  }

  const isVerified = usdValue > 10 || asset.isVerifiedMarket;
  
  return {
    status: isVerified ? 'verified' : 'clean',
    securityNote: usdValue > 1000 ? '⭐ High Value Asset' : (isVerified ? 'Verified Asset' : 'Unverified/Clean'),
    score: isVerified ? 100 : 70,
    usdValue: Number(usdValue.toFixed(6)),
    isHoneypot,
    isBlacklisted
  };
}
