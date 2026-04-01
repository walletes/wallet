import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import { getChainById } from '../../blockchain/chains.js';
import Decimal from 'decimal.js'; 
import unidecode from 'unidecode';

/**
 * AEGIS-INTELLIGENCE v4.2 (2026 Enterprise SaaS Edition) - MASTER RESTORATION
 * Core Logic: High-Fidelity Security Analytics & Pricing Waterfall
 * Status: Production-Hardened Intelligence Provider
 */

export interface TokenClassification {
  status: 'verified' | 'spam' | 'dust' | 'clean' | 'malicious';
  securityNote: string | null;
  score: number;
  usdValue: number;
  isHoneypot?: boolean;
  isBlacklisted?: boolean;
  sellTax?: number;
  buyTax?: number;
  isProxy?: boolean;
  isVerifiedSource?: boolean;
  liquidityUsd?: number;
  canRecover: boolean;
}

const CONFIG = {
  // Enforce normalized base URL to prevent 405 Method Not Allowed
  GOPLUS_API: (process.env.GOPLUS_API_BASE || 'https://gopluslabs.io').replace(/\/$/, ''),
  DEXSCREENER_API: 'https://dexscreener.com',
  LLAMA_API: 'https://llama.fi',
  DUST_THRESHOLD_USD: new Decimal(process.env.DUST_THRESHOLD_USD || '0.50'),
  LIQUIDITY_FLOOR: Number(process.env.MIN_LIQUIDITY_USD) || 1000,
  VERIFIED_BASES: ['WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'WBNB', 'SOL', 'MATIC'],
  CG_PLATFORM_MAP: JSON.parse(process.env.CG_PLATFORM_MAP || '{"1":"ethereum","137":"polygon-pos","8453":"base","56":"binance-smart-chain"}')
};

let goPlusAccessToken: string | null = null;
let tokenExpiry = 0;
let isRefreshing = false; 

const NATIVE_PRICE_CACHE: Record<string, { price: number, expiry: number }> = {};
const NATIVE_CACHE_TTL = 1000 * 60 * 30; 

/**
 * PRODUCTION GUARD: Handles non-JSON responses (WAF/Cloudflare) gracefully
 */
async function safeJson(resp: Response) {
  const text = await resp.text();
  try { return JSON.parse(text); } 
  catch (e) { 
    if (text.includes('<!DOCTYPE')) throw new Error('API_BLOCKED_BY_WAF_HTML');
    throw new Error(`INVALID_JSON_RESPONSE: ${text.substring(0, 15)}`);
  }
}

/**
 * Robust Auth: Handles token refresh with race-condition prevention & backoff
 */
async function getGoPlusAuth(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (goPlusAccessToken && now < tokenExpiry) return `Bearer ${goPlusAccessToken}`;
  
  if (isRefreshing) {
    for(let i=0; i<5; i++) {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        if (goPlusAccessToken && now < tokenExpiry) return `Bearer ${goPlusAccessToken}`;
    }
  }

  try {
    isRefreshing = true;
    const appKey = process.env.GOPLUS_APP_KEY || '';
    const appSecret = process.env.GOPLUS_APP_SECRET || '';
    if (!appKey || !appSecret) return '';

    const sign = crypto.createHash('sha1').update(`${appKey}${now}${appSecret}`).digest('hex');
    
    // STRICT ROUTING: Explicitly use /api/v1/auth/token to fix HTTP 405
    const resp = await fetch(`${CONFIG.GOPLUS_API}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ app_key: appKey, time: now, sign }),
      signal: AbortSignal.timeout(5000)
    });

    if (!resp.ok) throw new Error(`HTTP_${resp.status}`);

    const data = await safeJson(resp);
    if (data.result?.access_token) {
      goPlusAccessToken = data.result.access_token;
      tokenExpiry = now + (data.result.expires_in || 3600) - 60;
      return `Bearer ${goPlusAccessToken}`;
    }
  } catch (e) {
    logger.error(`[Aegis-Auth] ${e instanceof Error ? e.message : 'Unknown Auth Failure'}`);
  } finally {
    isRefreshing = false;
  }
  return '';
}

/**
 * Intelligent Security Waterfall: Cross-references multiple indicators
 */
export async function runSecurityScan(address: string, chainId: number) {
  let isHoneypot = false; let tax = 0; let note = 'Analyzed Clean';
  let blacklisted = false; let isProxy = false; let isVerifiedSource = false;

  try {
    const auth = await getGoPlusAuth();
    // FIX: Functional Honeypot v2 API Endpoint
    const hpUrl = `https://honeypot.is{address}${chainId ? `&chainID=${chainId}` : ''}`;
    
    const [hpRes, gpRes] = await Promise.allSettled([
      fetch(hpUrl, { signal: AbortSignal.timeout(8000) }).then(r => r.json()),
      fetch(`${CONFIG.GOPLUS_API}/api/v1/token_security/${chainId}?contract_addresses=${address}`, {
        headers: auth ? { 'Authorization': auth } : {},
        signal: AbortSignal.timeout(8000)
      }).then(safeJson)
    ]);

    if (hpRes.status === 'fulfilled' && hpRes.value.honeypotResult?.isHoneypot) {
      isHoneypot = true;
      note = '🚨 HONEYPOT SIMULATION DETECTED';
      tax = (hpRes.value.simulationResult?.sellTax || 0) / 100;
    }

    if (gpRes.status === 'fulfilled' && gpRes.value.result) {
      const s = gpRes.value.result[address] || gpRes.value.result[address.toLowerCase()];
      if (s) {
        isHoneypot = isHoneypot || s.is_honeypot === "1";
        blacklisted = s.is_blacklisted === "1";
        isProxy = s.is_proxy === "1";
        isVerifiedSource = s.is_open_source === "1";
        const gpTax = parseFloat(s.sell_tax || "0");
        tax = Math.max(tax, gpTax);
        
        if (s.is_mintable === "1" && s.is_proxy !== "1") note = '🚨 UNRESTRICTED MINTING DETECTED';
        if (s.owner_change_balance === "1") note = '🚨 BALANCE MANIPULATION DETECTED';
        if (s.hidden_owner === "1") note = '🚨 HIDDEN OWNER (SCAM RISK)';
        if (tax > 0.10 && !isHoneypot) note = `⚠️ HIGH SELL TAX DETECTED (${(tax * 100).toFixed(1)}%)`;
      }
    }
  } catch (e) {
    logger.error(`[Aegis-Scan] Waterfall partial failure for ${address}`);
  }

  return { isHoneypot, tax, note, blacklisted, isProxy, isVerifiedSource };
}

/**
 * Native Oracle: Cached pricing for gas/base assets
 */
async function getLiveNativePrice(nativePriceId: string): Promise<number> {
  const now = Date.now();
  if (NATIVE_PRICE_CACHE[nativePriceId] && NATIVE_PRICE_CACHE[nativePriceId].expiry > now) {
    return NATIVE_PRICE_CACHE[nativePriceId].price;
  }
  try {
    const res = await fetch(`${CONFIG.LLAMA_API}/coingecko:${nativePriceId}`, { signal: AbortSignal.timeout(4000) }).then(safeJson);
    const price = res.coins?.[`coingecko:${nativePriceId}`]?.price || 0;
    if (price > 0) {
      // Memory safety on cache size
      if (Object.keys(NATIVE_PRICE_CACHE).length > 100) delete NATIVE_PRICE_CACHE[Object.keys(NATIVE_PRICE_CACHE)[0]];
      NATIVE_PRICE_CACHE[nativePriceId] = { price, expiry: now + NATIVE_CACHE_TTL };
      return price;
    }
  } catch (e) { logger.warn(`[Aegis-Oracle] Native price failed for ${nativePriceId}`); }
  return 0;
}

/**
 * Pricing Waterfall: Multi-source fallback logic
 */
export async function runPriceScan(address: string, symbol: string, chainId: number): Promise<{ price: number, liquidity: number }> {
  const sym = (symbol || '').toLowerCase();
  const chain = getChainById(chainId);
  
  const stableAssets = ['usdc', 'usdt', 'dai', 'pyusd', 'usds', 'tusd'];
  if (stableAssets.includes(sym)) return { price: 1, liquidity: 999999999 };

  if (chain && sym === chain.symbol.toLowerCase()) {
    const price = await getLiveNativePrice(chain.nativePriceId);
    if (price > 0) return { price, liquidity: 999999999 };
  }

  try {
    const dexRes = await fetch(`${CONFIG.DEXSCREENER_API}/${address}`, { signal: AbortSignal.timeout(6000) }).then(r => r.json());
    const pair = (dexRes.pairs || [])
      .filter((p: any) => p.quoteToken?.symbol !== symbol) 
      .filter((p: any) => CONFIG.VERIFIED_BASES.includes(p.quoteToken?.symbol?.toUpperCase()))
      .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    
    if (pair?.liquidity?.usd > CONFIG.LIQUIDITY_FLOOR) {
      return { price: parseFloat(pair.priceUsd), liquidity: pair.liquidity.usd };
    }

    const platform = CONFIG.CG_PLATFORM_MAP[String(chainId)] || 'ethereum';
    const llama = await fetch(`${CONFIG.LLAMA_API}/prices/current/${platform}:${address}`, { signal: AbortSignal.timeout(4000) }).then(safeJson);
    const price = llama.coins?.[`${platform}:${address}`]?.price;
    if (price) return { price, liquidity: 0 };
  } catch (e) {
    logger.warn(`[Aegis-Price] Trace failed for ${symbol}`);
  }

  return { price: 0, liquidity: 0 };
}

/**
 * Final Verdict Engine: Weighs Security vs. Metadata vs. Value
 */
export function calculateVerdict(asset: any, security: any, priceData: { price: number, liquidity: number }): TokenClassification {
  const balance = new Decimal(asset?.balance || '0');
  const price = new Decimal(priceData?.price || 0);
  const usdValue = balance.times(price);
  
  const isMalicious = security?.isHoneypot || security?.tax > 0.40 || security?.blacklisted;
  
  let status: TokenClassification['status'] = 'clean';
  let note = security?.note || 'Analyzed Clean';

  const rawName = (asset?.name || '').toLowerCase();
  const rawSymbol = (asset?.symbol || '').toLowerCase();
  
  // FIX: Universal Homoglyph + Invisible Character Check
  const normalizedSymbol = unidecode(rawSymbol).replace(/\s/g, '');
  const hasInvisibleChars = /[\u200B-\u200D\uFEFF]/.test(asset?.symbol || '');
  const isLookalike = hasInvisibleChars || (normalizedSymbol !== rawSymbol && 
                      (normalizedSymbol === 'usdc' || normalizedSymbol === 'usdt' || normalizedSymbol === 'eth'));

  const spamKeywords = ['visit', 'claim', 'free', 'reward', 'gift', 'voucher', 'airdrop', 'v0uc', 'clm'];
  const hasSpamMetadata = spamKeywords.some(k => rawName.includes(k) || rawSymbol.includes(k)) || isLookalike;

  // VERDICT WATERFALL
  if (isMalicious) {
    status = 'malicious';
    note = note !== 'Analyzed Clean' ? note : '🚨 MALICIOUS CONTRACT';
  } else if (hasSpamMetadata) {
    status = 'spam';
    note = isLookalike ? `🚨 IDENTITY SPOOF: ${normalizedSymbol.toUpperCase()}` : 'Phishing: Metadata triggers';
  } else {
    if (price.isZero() || usdValue.lt(CONFIG.DUST_THRESHOLD_USD)) {
      status = 'dust'; 
      if (price.isZero()) note = 'System: Zero-Value/Unlisted Asset';
    } else if (usdValue.gt(50) && security?.isVerifiedSource && priceData.liquidity > 10000) {
      status = 'verified';
    }
  }

  // RUG-PULL SHIELD: Malicious if price exists but liquidity is fake/removed
  if (status !== 'malicious' && !price.isZero() && priceData.liquidity < CONFIG.LIQUIDITY_FLOOR && !security?.isVerifiedSource) {
    status = 'malicious';
    note = '🚨 ILLIQUID / EXIT SCAM RISK';
  }

  const finalUsdValue = usdValue.isNegative() ? 0 : Number(usdValue.toFixed(4));

  return {
    status,
    securityNote: note,
    score: status === 'malicious' ? 0 : (status === 'verified' ? 95 : (status === 'spam' ? 10 : 70)),
    usdValue: finalUsdValue,
    isHoneypot: security?.isHoneypot,
    sellTax: security?.tax,
    isProxy: security?.isProxy,
    isVerifiedSource: security?.isVerifiedSource,
    liquidityUsd: priceData.liquidity,
    canRecover: status !== 'malicious' && status !== 'spam' && finalUsdValue > 5.00 && !security?.blacklisted
  };
}
