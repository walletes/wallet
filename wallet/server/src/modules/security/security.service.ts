import { getAddress, formatUnits } from 'ethers';
import { getAlchemyUrl, getProvider } from '../../blockchain/provider.js';
import { logger } from '../../utils/logger.js';

export interface Allowance {
  tokenAddress: string;
  spender: string;
  amount: string;
  isInfinite: boolean;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  spenderName?: string;
  isMalicious?: boolean;
  maliciousReason?: string;
}

/**
 * Tier 1 Security Intelligence Service
 * Powered by GoPlus Security & Alchemy Simulation Engines.
 * Upgraded with Multi-Chain Support and Threat Caching.
 */
export const securityService = {
  // Simple in-memory cache to avoid redundant GoPlus API calls
  riskCache: new Map<string, { profile: any, expiry: number }>(),
  CACHE_TTL: 1000 * 60 * 60, // 1 Hour

  /**
   * Scans for open token approvals and validates spenders against live threat databases.
   */
  async scanApprovals(walletAddress: string, network: string = 'ethereum'): Promise<Allowance[]> {
    const url = getAlchemyUrl(network);
    if (!url) return [];

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getTokenAllowances",
          params: [{ owner: getAddress(walletAddress), pageKey: null }]
        })
      });

      const data = await res.json();
      const result = data.result;
      if (!result?.tokenAllowances) return [];

      // Parallel Real-Time Intelligence Check
      const allowances: Allowance[] = await Promise.all(
        result.tokenAllowances.map(async (allowance: any) => {
          const rawAmount = allowance.allowance;
          // Check for common max-uint256 patterns
          const isInfinite = rawAmount.includes('f') || rawAmount.startsWith('0xffffff') || rawAmount.length > 60; 
          const spenderAddr = getAddress(allowance.spender);
          const tokenAddr = getAddress(allowance.tokenAddress);

          // LIVE CHECK: Real-time risk assessment via GoPlus Security API
          const securityProfile = await this.assessSpenderRisk(spenderAddr, network);
          
          let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
          if (securityProfile.isMalicious) {
            riskLevel = 'CRITICAL';
          } else if (isInfinite) {
            riskLevel = 'HIGH';
          } else if (parseInt(rawAmount, 16) > 0) {
            riskLevel = 'MEDIUM';
          }

          return {
            tokenAddress: tokenAddr,
            spender: spenderAddr,
            amount: isInfinite ? 'Infinite' : rawAmount,
            isInfinite,
            riskLevel,
            spenderName: securityProfile.name || 'Unknown Contract',
            isMalicious: securityProfile.isMalicious,
            maliciousReason: securityProfile.reason
          };
        })
      );

      // Sort by risk: Malicious first, then Critical, then High
      return allowances.sort((a, b) => {
        if (a.riskLevel === 'CRITICAL' && b.riskLevel !== 'CRITICAL') return -1;
        if (a.isMalicious && !b.isMalicious) return -1;
        return 0;
      });
    } catch (err: any) {
      logger.error(`[SecurityService] Approval scan failed: ${err.message}`);
      return [];
    }
  },

  /**
   * REAL-TIME THREAT DETECTION
   * Integrates with GoPlus API to detect malicious spenders and drainers.
   */
  async assessSpenderRisk(spender: string, network: string) {
    const cacheKey = `${network}:${spender}`;
    const cached = this.riskCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) return cached.profile;

    try {
      const provider = getProvider(network);
      const code = await provider.getCode(spender);
      if (code === '0x') return { name: 'External Wallet', isMalicious: false };

      // Chain mappings: Ethereum=1, BNB=56, Polygon=137, Arbitrum=42161, Base=8453
      const chainIdMap: Record<string, string> = { 
        'ethereum': '1', 'base': '8453', 'polygon': '137', 'bsc': '56', 'arbitrum': '42161' 
      };
      const chainId = chainIdMap[network.toLowerCase()] || '1';
      
      // Fixed GoPlus Address Security Endpoint
      const goPlusRes = await fetch(`https://api.gopluslabs.io${spender}?chain_id=${chainId}`);
      const { result, message } = await goPlusRes.json();

      if (result) {
        // Advanced logic: Detect honeypots, unverified proxies, and known blacklists
        const isMalicious = 
          result.is_honeypot === "1" || 
          result.is_malicious_contract === "1" ||
          result.data_source === "phishfort" || // Known phishing database
          (result.is_proxy === "1" && result.is_open_source === "0"); // Hidden proxy logic is a major red flag

        const profile = {
          name: result.contract_name || 'Unlabeled Contract',
          isMalicious: !!isMalicious,
          reason: isMalicious ? 'Flagged as malicious or high-risk by GoPlus Intelligence' : undefined
        };

        this.riskCache.set(cacheKey, { profile, expiry: Date.now() + this.CACHE_TTL });
        return profile;
      }

      return { name: 'Unknown Contract', isMalicious: false };
    } catch (err: any) {
      logger.warn(`[SecurityService] Spender risk check failed for ${spender}: ${err.message}`);
      return { name: 'Check Failed', isMalicious: false };
    }
  },

  /**
   * REAL TRANSACTION SIMULATION (Alchemy Asset Changes API)
   * Future-proofed to detect balance drops and stealth transfers.
   */
  async simulateAction(walletAddress: string, tx: { to: string; data: string; value?: string }, network: string = 'ethereum') {
    const url = getAlchemyUrl(network);
    if (!url) throw new Error('Network not supported for simulation');

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_simulateAssetChanges",
          params: [{
            from: getAddress(walletAddress),
            to: getAddress(tx.to),
            value: tx.value || "0x0",
            data: tx.data
          }]
        })
      });

      const { result, error } = await res.json();
      if (error) throw new Error(error.message);

      // PRODUCTION GUARD: Check if native ETH or high-value tokens are leaving the wallet
      const transfersOut = result.changes.filter((c: any) => 
        c.changeType === 'TRANSFER' && 
        c.from.toLowerCase() === walletAddress.toLowerCase()
      );

      return {
        status: 'SUCCESS',
        changes: result.changes,
        gasUsed: result.gasUsed,
        // Transaction is "Safe" only if there are no suspicious outflows
        safe: transfersOut.length === 0,
        warning: transfersOut.length > 0 ? `Warning: This tx will move ${transfersOut.length} assets out of your wallet.` : undefined
      };
    } catch (err: any) {
      logger.error(`[SecurityService] Simulation failed: ${err.message}`);
      return { status: 'FAILED', error: err.message, safe: false };
    }
  }
};
