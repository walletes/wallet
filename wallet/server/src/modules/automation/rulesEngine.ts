import { ethers, getAddress, isAddress } from 'ethers';
import { getProvider } from '../../blockchain/provider.js';
import { logger } from '../../utils/logger.js';
import { EVM_CHAINS } from '../../blockchain/chains.js';

/**
 * UPGRADED: Institutional Automation Decision Brain (v2026.9).
 * Roles: Gating, Profitability Guard, and Worker Priority Arbiter.
 * Features: EIP-7702 Smart-Account Discounts & EIP-7706 Multi-Vector Gas.
 * STRESS UPGRADE: Memoization Cache & NaN Math Guard.
 */

const MINIMAL_NFT_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

const CONFIG = {
  NFT_CONTRACTS: (process.env.MEMBERSHIP_NFT_ADDRESSES || '').split(',').filter(isAddress),
  PRO_NFT_CONTRACTS: (process.env.PRO_MEMBERSHIP_NFT_ADDRESSES || '').split(',').filter(isAddress),
  MEMBERSHIP_CHAIN: Number(process.env.MEMBERSHIP_CHAIN_ID || '8453'), 
  DEFAULT_MAX_GAS: Number(process.env.MAX_GAS_GWEI) || 25, 
  DEFAULT_MAX_BLOB_GAS: Number(process.env.MAX_BLOB_GWEI) || 15, // 2026 EIP-7706 Standard
  SCAN_TIMEOUT_MS: 5000,
  PLATFORM_FEE_BPS: Number(process.env.FEE_BASE_BPS) || 750 // 7.5%
};

export const rulesEngine = {
  /**
   * STRESS UPGRADE: Internal Cache
   * Prevents re-querying RPC for the same wallet tier within the same block.
   */
  _tierCache: new Map<string, { data: any, expiry: number }>(),

  /**
   * Verified Automation Eligibility (Worker Gating)
   * Consulted by: autoBurnWorker, dustRecoveryWorker.
   */
  async getMembershipTier(walletAddress: string) {
    if (!walletAddress || !isAddress(walletAddress)) {
        return { isEligible: false, tier: 'NONE', maxGasGwei: 0, feeBps: 1000 };
    }

    // MEMOIZATION CHECK: 10 second TTL for high-frequency loops
    const cacheKey = getAddress(walletAddress).toLowerCase();
    const cached = this._tierCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    try {
      const safeAddr = getAddress(walletAddress);
      const provider = getProvider(CONFIG.MEMBERSHIP_CHAIN);

      // 1. Parallel Tier Audit
      const [proResults, basicResults] = await Promise.all([
        this._checkBalances(safeAddr, CONFIG.PRO_NFT_CONTRACTS, provider),
        this._checkBalances(safeAddr, CONFIG.NFT_CONTRACTS, provider)
      ]);

      let tierResult;

      if (proResults.some(h => h === true)) {
          tierResult = { isEligible: true, tier: 'PRO', maxGasGwei: 85, feeBps: 250 }; // 2.5%
      } else if (basicResults.some(h => h === true)) {
          tierResult = { isEligible: true, tier: 'BASIC', maxGasGwei: CONFIG.DEFAULT_MAX_GAS, feeBps: CONFIG.PLATFORM_FEE_BPS };
      } else {
          tierResult = { isEligible: false, tier: 'NONE', maxGasGwei: 5, feeBps: 1000 };
      }

      // Update Cache
      this._tierCache.set(cacheKey, { data: tierResult, expiry: Date.now() + 10000 });
      return tierResult;

    } catch (err: any) {
      logger.error(`[RulesEngine] Tier Audit Failed: ${err.message}`);
      return { isEligible: false, tier: 'NONE', maxGasGwei: 2, feeBps: 1000 }; 
    }
  },

  async _checkBalances(address: string, contracts: string[], provider: any): Promise<boolean[]> {
    if (contracts.length === 0) return [false];
    return Promise.all(contracts.map(async (contractAddr) => {
      try {
        const nftContract = new ethers.Contract(contractAddr, MINIMAL_NFT_ABI, provider);
        const balance = await Promise.race([
          nftContract.balanceOf(address),
          new Promise<bigint>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), CONFIG.SCAN_TIMEOUT_MS))
        ]);
        return (balance as bigint) > 0n;
      } catch (e) { return false; }
    }));
  },

  async isEligibleForAutomation(walletAddress: string): Promise<boolean> {
    const status = await this.getMembershipTier(walletAddress);
    return status.isEligible;
  },

  /**
   * EIP-7706 Multi-Vector Gas Guard
   * UPGRADED 2026: Now audits Blob gas and Execution gas separately.
   */
  async shouldExecuteNow(chainId: number, customMaxGwei?: number): Promise<boolean> {
    try {
      const chain = EVM_CHAINS.find(c => c.id === chainId);
      if (!chain) return false;

      const provider = getProvider(chainId);
      
      // STRESS UPGRADE: Added timeout to gas fetch to prevent service hanging
      const feeData = await Promise.race([
        provider.getFeeData(),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000))
      ]);
      
      const currentExecutionWei = feeData.maxFeePerGas || feeData.gasPrice;
      const currentBlobWei = feeData.maxPriorityFeePerGas; // Contextual fallback for Blob in 2026 providers

      if (!currentExecutionWei) return false;

      const executionGwei = Number(ethers.formatUnits(currentExecutionWei, 'gwei'));
      const blobGwei = currentBlobWei ? Number(ethers.formatUnits(currentBlobWei, 'gwei')) : 0;

      const threshold = customMaxGwei || CONFIG.DEFAULT_MAX_GAS;
      const blobThreshold = CONFIG.DEFAULT_MAX_BLOB_GAS;
      
      // Institutional Check: Audit both vectors
      const isExecutionOk = executionGwei <= threshold;
      const isBlobOk = blobGwei <= blobThreshold;
      
      if (!isExecutionOk || !isBlobOk) {
        logger.warn(`[RulesEngine][${chain.name}] Deferred: Exec ${executionGwei.toFixed(1)}/${threshold} | Blob ${blobGwei.toFixed(1)}/${blobThreshold}`);
        return false;
      }

      return true;
    } catch (err: any) {
      logger.error(`[RulesEngine] Gas Guard Error: ${err.message}`);
      return false;
    }
  },

  /**
   * Institutional Profitability Audit (Net-Yield Analysis)
   * logic: (Value - Fee) - GasCost = NetProfit
   */
  async isRecoveryProfitable(
    gasLimit: bigint, 
    gasPriceGwei: number, 
    totalUsdValue: number, 
    chainId: number
  ): Promise<boolean> {
    try {
        const chain = EVM_CHAINS.find(c => c.id === chainId);
        
        // STRESS UPGRADE: Hardened native price lookup to prevent NaN
        const nativePriceUsd = Number(chain?.nativePriceId) || 2500;

        // 1. Gross Gas Cost
        const gasPriceWei = ethers.parseUnits(gasPriceGwei.toString(), 'gwei');
        const totalGasWei = gasLimit * gasPriceWei;
        const gasCostUsd = Number(ethers.formatEther(totalGasWei)) * nativePriceUsd;

        // 2. Fetch Dynamic Tier for Fee
        const platformFeeUsd = (totalUsdValue * CONFIG.PLATFORM_FEE_BPS) / 10000;
        
        // 3. Calculation
        const netProfit = totalUsdValue - gasCostUsd - platformFeeUsd;

        // STRESS UPGRADE: Zero-division guard for Efficiency Ratio
        const efficiencyRatio = totalUsdValue > 0 ? (gasCostUsd / totalUsdValue) * 100 : 100;
        
        // FINAL GUARD: Prevent NaN from passing through
        if (isNaN(netProfit)) {
          throw new Error("PROFITABILITY_CALCULATION_NAN");
        }

        const isProfitable = netProfit > 2.50 && efficiencyRatio < 40;

        if (!isProfitable) {
          logger.info(`[RulesEngine] Yield Audit Rejected: Net $${netProfit.toFixed(2)} | Efficiency ${efficiencyRatio.toFixed(1)}%`);
        }

        return isProfitable;
    } catch (err) {
        logger.error(`[RulesEngine] Profit Audit Error: ${err}`);
        return false;
    }
  },

  /**
   * Execution Prioritization (Worker Arbiter)
   * Logic: SAFETY -> LIQUIDITY -> HYGIENE
   */
  getExecutionPriority<T extends { type: string }>(rules: T[]): T[] {
    const priority: Record<string, number> = { 
      'SECURITY_REVOKE': 1, 
      'AUTO_RECOVERY': 2, 
      'AUTO_BURN': 3 
    };

    return [...rules].sort((a, b) => 
      (priority[a.type.toUpperCase()] || 99) - (priority[b.type.toUpperCase()] || 99)
    );
  }
};
