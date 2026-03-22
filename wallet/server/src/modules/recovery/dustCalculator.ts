import { tokenService } from '../tokens/token.service.js';
import { getProvider } from '../../blockchain/provider.js';
import { EVM_CHAINS } from '../../blockchain/chains.js';
import { scanGlobalWallet } from '../../blockchain/walletScanner.js';
import { formatUnits, parseUnits, getAddress } from 'ethers';
import { logger } from '../../utils/logger.js';

export interface DustReport {
  asset: any;
  rescueCostNative: string;
  estimatedNetGain: string;
  isProfitable: boolean;
  reason: string;
}

/**
 * Premium Dust Calculator
 * Dynamically scans the wallet and calculates which assets are worth the gas to rescue.
 */
export async function detectDustTokens(walletAddress: string): Promise<DustReport[]> {
  // Standardize address (Clears the 'safeAddr' unused variable error)
  const safeAddr = getAddress(walletAddress);
  
  try {
    // 1. DYNAMIC DATA: Fetch real-time assets for this specific safeAddr
    const rawAssets = await scanGlobalWallet(safeAddr);
    
    // 2. CATEGORIZATION: Pass raw assets to the tokenService classification engine
    const report = await tokenService.categorizeAssets(rawAssets);
    
    // We target assets already flagged as 'dust' or 'clean' but skip 'spam'
    const candidates = [...report.groups.clean, ...report.groups.dust];

    const dustAnalysis = await Promise.all(candidates.map(async (asset) => {
      try {
        const chain = EVM_CHAINS.find(c => c.name === asset.chain);
        if (!chain || asset.type !== 'erc20') return null;

        // 3. LIVE GAS DATA: Pull current network fees
        const provider = getProvider(chain.rpc);
        const feeData = await provider.getFeeData();
        
        // Dynamic Gas Calculation: Swap (150k) + Approval (50k) + Buffer (50k) = 250k
        const gasPrice = feeData.gasPrice || parseUnits('20', 'gwei');
        const estimatedGasLimit = 250000n; 
        const rescueCostWei = gasPrice * estimatedGasLimit;

        // 4. PRECISION MATH: Scaling based on the token's actual decimals
        const balanceWei = parseUnits(asset.balance, asset.decimals || 18);
        
        // 5. PROFITABILITY THRESHOLDS
        const minThreshold = (rescueCostWei * 120n) / 100n; // 20% Profit Margin required
        const maxThreshold = parseUnits('0.1', 18);        // Threshold for "Major Asset" (e.g. 0.1 ETH)

        const isProfitable = balanceWei > minThreshold;
        const isTooBig = balanceWei > maxThreshold;

        if (isProfitable && !isTooBig) {
          return {
            asset,
            rescueCostNative: formatUnits(rescueCostWei, 18),
            estimatedNetGain: formatUnits(balanceWei - rescueCostWei, 18),
            isProfitable: true,
            reason: 'Profitable dust detected'
          };
        }

        return {
          asset,
          rescueCostNative: formatUnits(rescueCostWei, 18),
          estimatedNetGain: '0',
          isProfitable: false,
          reason: isTooBig ? 'Major asset (not dust)' : 'Gas cost exceeds value'
        };
      } catch (err) {
        logger.error(`[DustCalculator] Analysis failed for ${asset.symbol}: ${err}`);
        return null;
      }
    }));

    return dustAnalysis.filter((item): item is DustReport => item !== null);

  } catch (globalErr: any) {
    logger.error(`[DustCalculator] Global scan failed for ${safeAddr}: ${globalErr.message}`);
    return [];
  }
}
