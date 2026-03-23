/**
 * BRANDED TYPES: Prevents logic errors by ensuring strings are 
 * validated before being used as addresses or chain IDs.
 */
export type EvmAddress = string & { readonly __brand: unique symbol };
export type HexString = string & { readonly __brand: unique symbol };

/**
 * SUPPORTED NETWORKS: Strict enum for "real money" handling.
 * Prevents scanning unsupported or risky chains.
 */
export type SupportedChain = 

  | 'ethereum' 
  | 'polygon' 
  | 'bsc' 

  | 'arbitrum' 
  | 'optimism' 
  | 'base' 

  | 'avalanche';

export interface Asset {
  chain: SupportedChain;
  symbol: string;
  name: string;
  // 'balance' is for display (e.g. "1.5"), 'rawBalance' is for calculations (e.g. "1500000...")
  balance: string;  
  rawBalance: string; 
  decimals: number;
  type: 'native' | 'erc20' | 'erc721' | 'erc1155';
  contract: EvmAddress | null;
  logo: string | null;
  usdValue: number;
  status: 'verified' | 'spam' | 'dust' | 'clean';
  // Financial Metadata
  priceSource?: 'coingecko' | 'binance' | 'dex' | 'fallback';
  lastPriceUsd?: number;
}

export interface WalletScanResult {
  meta: {
    traceId: string;
    checksummedAddress: EvmAddress;
    timestamp: string;
    latencyMs: number;
  };
  summary: {
    totalAssets: number;
    totalUsdValue: number;
    totalCleanValue: number; // Value excluding spam/dust
    spamCount: number;
    dustCount: number;
    highRiskCount: number;
  };
  groups: {
    clean: Asset[];
    dust: Asset[];
    spam: Asset[];
  };
  all: Asset[];
}

/**
 * Audit Log Interface
 * Used for "Real Money" auditing and compliance tracking.
 */
export interface ScanAuditEntry {
  id: string;
  wallet: EvmAddress;
  performedAt: Date;
  success: boolean;
  errorCode?: string;
}
