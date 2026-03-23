import { getAddress, isAddress } from 'ethers';
import { logger } from './logger.js';
import { EVM_CHAINS } from '../blockchain/chains.js';

/**
 * UPGRADED: Financial-grade Utility Engine.
 * Features: Jitter-based backoff, Checksum-safe shortening, and Precision formatting.
 */
export const helpers = {
  /**
   * Safe Async Pause
   */
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Checksum-safe Address Shortener.
   * Prevents phishing by ensuring the address is valid before shortening.
   */
  shortenAddress: (address: string): string => {
    if (!address || !isAddress(address)) return 'Invalid Address';
    const checksummed = getAddress(address);
    return `${checksummed.substring(0, 6)}...${checksummed.substring(checksummed.length - 4)}`;
  },

  /**
   * Advanced Retry Engine with Jitter & Exponential Backoff.
   * Crucial for 'Real Money' apps to avoid 429 Rate Limits from RPC providers.
   */
  async retry<T>(
    fn: () => Promise<T>, 
    retries: number = 3, 
    baseDelay: number = 1000,
    traceId: string = 'internal'
  ): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const status = err.response?.status || err.status;
      const message = err.message?.toLowerCase() || '';

      // Retry logic: Only retry on network, timeout, or rate-limit (429/503) errors.
      const isRetryable = 
        status === 429 || 
        status >= 500 || 
        message.includes('timeout') || 
        message.includes('network') ||
        message.includes('econnreset');

      if (retries <= 0 || !isRetryable) throw err;

      // Add Jitter: Prevents multiple instances from hitting the API at the exact same millisecond
      const jitter = Math.random() * 200;
      const nextDelay = (baseDelay * 2) + jitter;

      logger.warn(`[Retry][${traceId}] Attempt failed (${status || 'Network'}). Retrying in ${Math.round(nextDelay)}ms...`);
      
      await new Promise(r => setTimeout(r, nextDelay));
      return helpers.retry(fn, retries - 1, nextDelay, traceId); 
    }
  },

  /**
   * Secure Explorer Link Generator
   */
  getExplorerUrl: (txHash: string, chainName: string = 'ethereum'): string => {
    const chain = EVM_CHAINS.find(c => 
      c.name.toLowerCase() === chainName.toLowerCase() || 
      c.id?.toString() === chainName
    );
    const baseUrl = chain?.explorer || 'https://etherscan.io';
    // Ensure no double slashes if explorer URL ends with /
    const sanitizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${sanitizedBase}/tx/${txHash}`;
  },

  /**
   * High-Precision USD Formatter.
   * Handles large whale balances ($1M+) and tiny dust (<$0.01) correctly.
   */
  formatUsd: (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0.00';

    // For very small values (real money dust), show more decimals
    const fractionDigits = num > 0 && num < 0.01 ? 6 : 2;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(num);
  }
};

/**
 * Wrapper for simpler retry logic
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  return helpers.retry(fn, retries);
}

export default helpers;
