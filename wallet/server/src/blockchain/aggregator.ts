import { getAddress, isAddress, formatUnits } from 'ethers';
import { logger } from '../utils/logger.js';
import { helpers } from '../utils/helpers.js';
import crypto from 'crypto';

/**
 * BASE DATA LAYER: Raw provider response structure
 */
export interface BaseToken {
  type: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  logo: string | null;
  contract: string;
  usdPrice?: number;
  traceId: string;
}

/**
 * INTELLIGENCE LAYER: Decision-making metadata
 */
export interface TokenIntelligence {
  isRecoverable: boolean;   // High enough value to move
  isProfitable: boolean;    // Value > Gas + WIP Fee
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  spamProbability: number;  // 0-100
  recommendedAction: 'IGNORE' | 'RECOVER' | 'BURN' | 'NONE';
  confidence: number;       // Data reliability 0-100
  flags: string[];          // Insight tags for UI/Devs
}

/**
 * PRODUCT LAYER: The final enriched object for consumers
 */
export interface AggregatedToken extends BaseToken {
  humanBalance: string;     
  totalUsdValue: number;    
  intelligence: TokenIntelligence;
}

const CONFIG = {
  COVALENT_BASE: process.env.COVALENT_API_URL || 'https://api.covalenthq.com/v1',
  MORALIS_BASE: process.env.MORALIS_API_URL || 'https://deep-index.moralis.io/api/v2',
  TIMEOUT_MS: Number(process.env.AGGREGATOR_TIMEOUT_MS) || 8000,
  GAS_FLOOR_USD: 0.50 
};

const CHAIN_MAP: Record<number, string> = {
  1: 'eth',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  56: 'bsc'
};

/**
 * MASTER INTELLIGENCE ENGINE: Unified Asset Aggregator.
 * Implements advanced risk scoring, type-safe processing, and forensic metadata.
 */
export async function getUnifiedBalances(
  address: string, 
  chainId: number
): Promise<AggregatedToken[]> {
  const masterTraceId = `AGG-${crypto.randomUUID?.() || Date.now()}`;
  const moralisChain = CHAIN_MAP[chainId] || 'eth';
  
  try {
    logger.info(`[Aggregator][${masterTraceId}] Starting unified scan for ${address} on ${moralisChain}`);

    // 1. Fetch raw data from providers (Type-Safe BaseTokens)
    const [covalentData, moralisData] = await Promise.all([
      fetchFromCovalent(chainId, address),
      fetchFromMoralis(address, moralisChain)
    ]);

    // 2. Map-Based Deduplication
    const tokenMap = new Map<string, BaseToken>();

    [...covalentData, ...moralisData].forEach((token) => {
      const contract = token.contract.toLowerCase();
      
      if (!tokenMap.has(contract)) {
        tokenMap.set(contract, token);
      } else {
        const existing = tokenMap.get(contract)!;
        tokenMap.set(contract, {
          ...existing,
          usdPrice: existing.usdPrice || token.usdPrice,
          logo: existing.logo || token.logo,
          traceId: `${existing.traceId}->${token.traceId}`
        });
      }
    });

    // 3. Transformation & Intelligence Enrichment
    const finalTokens = Array.from(tokenMap.values()).map(token => {
      try {
        // Safe Formatting: Keeps precision for human display
        const humanBalance = formatUnits(token.balance, token.decimals);
        
        // Precision Safety: Capping precision for USD calc
        const safeBalance = humanBalance.length > 20 ? humanBalance.substring(0, 20) : humanBalance;
        const totalUsdValue = token.usdPrice ? Number(safeBalance) * token.usdPrice : 0;

        // --- MICRO-OPTIMIZED RISK & SPAM MODEL ---
        const hasLogo = !!token.logo;
        const hasPrice = !!token.usdPrice;
        const isUnknownSymbol = token.symbol === '???';
        const isAirdropSpam = token.name.toLowerCase().includes('airdrop') || 
                             token.symbol.toLowerCase().includes('visit');
        const isDust = Number(safeBalance) < 0.000001;
        
        let spamProbability = 0;
        let confidence = 100;
        const flags: string[] = [];

        if (!hasPrice) { 
          spamProbability += 45; 
          confidence -= 25;
          flags.push('NO_MARKET_PRICE'); 
        }
        if (!hasLogo) { 
          spamProbability += 15; 
          confidence -= 10;
          flags.push('NO_LOGO'); 
        }
        if (isUnknownSymbol) { 
          spamProbability += 20; 
          confidence -= 10;
          flags.push('UNKNOWN_SYMBOL'); 
        }
        if (isAirdropSpam) {
          spamProbability += 20;
          flags.push('SUSPICIOUS_NAME');
        }
        if (isDust) {
          flags.push('NEGLIGIBLE_BALANCE');
        }

        const riskLevel = 
          spamProbability > 75 ? 'HIGH' : 
          spamProbability > 40 ? 'MEDIUM' : 'LOW';

        // --- INTELLIGENT ACTION LOGIC ---
        // Future Hook: Plug in security.service.ts for bytecode/honeypot checks here
        const isRecoverable = totalUsdValue > 0.10 && !isDust;
        const isProfitable = totalUsdValue > (CONFIG.GAS_FLOOR_USD * 1.5); 
        const shouldBurn = (spamProbability > 85 || isAirdropSpam) && !isProfitable;

        let recommendedAction: 'IGNORE' | 'RECOVER' | 'BURN' | 'NONE' = 'IGNORE';
        if (shouldBurn) {
          recommendedAction = 'BURN';
        } else if (isProfitable) {
          recommendedAction = 'RECOVER';
        } else if (isRecoverable) {
          recommendedAction = 'NONE';
        }

        const intelligence: TokenIntelligence = {
          isRecoverable,
          isProfitable,
          riskLevel,
          spamProbability: Math.min(spamProbability, 100),
          recommendedAction,
          confidence: Math.max(confidence, 10),
          flags
        };

        return {
          ...token,
          humanBalance,
          totalUsdValue: Number(totalUsdValue.toFixed(2)),
          intelligence,
          traceId: `${token.traceId}->${masterTraceId}`
        };
      } catch (e) {
        logger.error(`[Aggregator] Processing error for ${token.symbol}: ${e}`);
        return null;
      }
    }).filter(Boolean) as AggregatedToken[];

    logger.info(`[Aggregator][${masterTraceId}] Unified ${finalTokens.length} assets for ${address}`);
    return finalTokens;

  } catch (err: any) {
    logger.error(`[Aggregator][${masterTraceId}] Master Aggregator Failure: ${err.message}`);
    return [];
  }
}

/**
 * Covalent Fetcher
 */
export async function fetchFromCovalent(chainId: number, address: string): Promise<BaseToken[]> {
  const traceId = `COV-${crypto.randomUUID?.() || Date.now()}`;
  try {
    const key = process.env.COVALENT_RPC_KEY || process.env.COVALENT_API_KEY;
    if (!key || !isAddress(address)) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    const url = `${CONFIG.COVALENT_BASE}/${chainId}/address/${address}/balances_v2/?key=${key}&nft=false&no-spam=true`;
    
    const res = await helpers.retry(async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (response.status === 429) throw new Error('COVALENT_RATE_LIMIT');
      if (!response.ok) throw new Error(`Covalent HTTP ${response.status}`);
      return response;
    }, 2, 1000, traceId);
   
    clearTimeout(timeout);
    const json = await res.json();
    const items = json.data?.items || [];

    return items
      .filter((t: any) => t.balance && t.balance !== "0" && t.contract_address)
      .map((t: any) => {
        try {
          return {
            type: 'erc20',
            symbol: (t.contract_ticker_symbol || '???').substring(0, 10),
            name: (t.contract_name || 'Unknown').substring(0, 40),
            balance: t.balance.toString(),
            decimals: Number(t.contract_decimals) || 18,
            logo: t.logo_url || null,
            contract: getAddress(t.contract_address),
            usdPrice: t.quote_rate,
            traceId
          };
        } catch { return null; }
      })
      .filter(Boolean) as BaseToken[];
  } catch (err: any) {
    logger.warn(`[Aggregator][${traceId}] Covalent skip: ${err.message}`);
    return []; 
  }
}

/**
 * Moralis Fetcher
 */
export async function fetchFromMoralis(address: string, chain: string): Promise<BaseToken[]> {
  const traceId = `MOR-${crypto.randomUUID?.() || Date.now()}`;
  try {
    const key = process.env.MORALIS_RPC_KEY || process.env.MORALIS_API_KEY;
    if (!key || !isAddress(address)) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    const url = `${CONFIG.MORALIS_BASE}/${getAddress(address)}/erc20?chain=${chain.toLowerCase()}`;

    const res = await helpers.retry(async () => {
      const response = await fetch(url, {
        headers: { 'X-API-Key': key, 'accept': 'application/json' },
        signal: controller.signal
      });
      if (response.status === 429) throw new Error('MORALIS_RATE_LIMIT');
      if (!response.ok) throw new Error(`Moralis HTTP ${response.status}`);
      return response;
    }, 2, 1000, traceId);

    clearTimeout(timeout);
    const json = await res.json();
    const tokens = Array.isArray(json) ? json : (json.result || []);

    return tokens
      .map((t: any) => {
        try {
          return {
            type: 'erc20',
            symbol: (t.symbol || '???').substring(0, 10),
            name: (t.name || 'Unknown').substring(0, 40),
            balance: t.balance.toString(),
            decimals: parseInt(t.decimals) || 18,
            logo: t.thumbnail || t.logo || null,
            contract: getAddress(t.token_address),
            usdPrice: t.usd_price,
            traceId
          };
        } catch { return null; }
      })
      .filter(Boolean) as BaseToken[];
  } catch (err: any) {
    logger.warn(`[Aggregator][${traceId}] Moralis skip: ${err.message}`);
    return []; 
  }
}
