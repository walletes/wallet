// ─── FILE: client/services/tokenService.ts ─────────────────────────────
// Token portfolio, dust recovery, spam detection, and pricing

import apiClient from './apiClient';
import type { Token, RecoveryItemType } from '../hooks/useTokens';

export interface SpamCheckResult {
  tokenAddress: string;
  chainId:      number;
  isSpam:       boolean;
  confidence:   number; // 0–100
  reasons:      string[];
}

export interface DustToken {
  tokenId:  string;
  address:  string;
  symbol:   string;
  chain:    string;
  chainId:  number;
  usdValue: number;
  balance:  string;
  type:     RecoveryItemType;
}

export interface PortfolioSnapshot {
  tokens:    Token[];
  totalUsd:  number;
  change24h: number;
  dustUsd:   number;
  spamCount: number;
  fetchedAt: string;
}

export const tokenService = {
  // ─── Portfolio ───────────────────────────────────────
  getPortfolio: (address: string, chainIds?: number[]) =>
    apiClient.get<PortfolioSnapshot>(
      `/tokens/${address}/portfolio`,
      chainIds ? { chains: chainIds.join(',') } : undefined
    ),

  // ─── Dust Tokens ─────────────────────────────────────
  getDustItems: (address: string, thresholdUsd = 0.01) =>
    apiClient.get<DustToken[]>(`/tokens/${address}/dust`, { threshold: thresholdUsd }),

  // ─── Spam Tokens ─────────────────────────────────────
  getSpamTokens: (address: string) =>
    apiClient.get<Token[]>(`/tokens/${address}/spam`),

  checkSpam: (tokenAddress: string, chainId: number) =>
    apiClient.post<SpamCheckResult>('/tokens/spam-check', { tokenAddress, chainId }),

  batchCheckSpam: (tokens: { address: string; chainId: number }[]) =>
    apiClient.post<SpamCheckResult[]>('/tokens/spam-check/batch', { tokens }),

  // ─── Token Price ────────────────────────────────────
  getPrice: (tokenAddress: string, chainId: number) =>
    apiClient.get<{ usd: number; change24h: number }>(
      `/tokens/price`,
      { address: tokenAddress, chainId }
    ),
};

export default tokenService;
