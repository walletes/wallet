export type TokenAddress = string;

export interface Asset {
  symbol: string;
  balance: string;        // formatted (safe for UI)
  rawBalance: string;     // BigInt string (financial precision)
  type: 'native' | 'token';
  address?: string;
}

export interface WalletScanResult {
  wallet: string;
  assets: Asset[];
  total_assets: number;
  timestamp: string;
}
