import { formatUnits, parseUnits, getAddress } from 'ethers';
import { getProvider } from '../../blockchain/provider.js';
import { EVM_CHAINS } from '../../blockchain/chains.js';
import { logger } from '../../utils/logger.js';

export interface RescueQuote {
  chain: string;
  strategy: 'DIRECT' | 'RELAYED';
  feeTier: string;
  feeLabel: string;
  gasEstimateNative: string;
  platformFeeUsd: string;
  netUserReceiveUsd: string;
  tokens: string[];
}

/**
 * Premium Smart Rescue Quoter
 * Bundles tokens by chain and calculates the cheapest path (Direct vs Relayed).
 */
export async function getSmartRescueQuote(walletAddress: string, assets: any[]): Promise<RescueQuote[]> {
  // 1. Standardize Address (Clears the unused variable error)
  const safeAddr = getAddress(walletAddress);
  
  // 2. Group assets by chain
  const chainGroups = assets.reduce((acc: any, report: any) => {
    const asset = report.asset || report;
    const chainName = asset.chain;
    if (!acc[chainName]) acc[chainName] = { tokens: [] };
    acc[chainName].tokens.push(asset);
    return acc;
  }, {});

  const quoteTasks = Object.keys(chainGroups).map(async (chainName): Promise<RescueQuote | null> => {
    const group = chainGroups[chainName];
    const chain = EVM_CHAINS.find(c => c.name === chainName);
    if (!chain || group.tokens.length === 0) return null;

    try {
      const provider = getProvider(chain.rpc);
      
      // 3. LIVE DATA: Fetch fresh native balance for safeAddr and gas fees
      const [nativeBalance, feeData] = await Promise.all([
        provider.getBalance(safeAddr),
        provider.getFeeData()
      ]);

      const currentGasPrice = feeData.gasPrice || parseUnits('20', 'gwei');
      const totalGasLimit = BigInt(group.tokens.length) * 200000n; 
      const estimatedGasCostWei = currentGasPrice * totalGasLimit;

      // 4. STRATEGY: Direct (5%) if nativeBalance exists, else Relayed (7.5%)
      const hasEnoughGas = nativeBalance >= (estimatedGasCostWei * 11n / 10n);
      const feePercent = hasEnoughGas ? 0.05 : 0.075; 
      
      // 5. DECIMAL-SAFE VALUE CALCULATION
      let totalChainValueUsd = 0;
      group.tokens.forEach((t: any) => {
        totalChainValueUsd += (t.usdValue || 0);
      });

      const platformFeeUsd = totalChainValueUsd * feePercent;
      const netReceiveUsd = totalChainValueUsd - platformFeeUsd;

      return {
        chain: chainName,
        strategy: hasEnoughGas ? 'DIRECT' : 'RELAYED',
        feeTier: `${(feePercent * 100).toFixed(1)}%`,
        feeLabel: hasEnoughGas 
          ? "Direct Rescue (User pays gas)" 
          : "Smart Relay (Platform covers gas + 7.5% fee)",
        gasEstimateNative: formatUnits(estimatedGasCostWei, 18),
        platformFeeUsd: platformFeeUsd.toFixed(2),
        netUserReceiveUsd: netReceiveUsd.toFixed(2),
        tokens: group.tokens.map((t: any) => t.symbol)
      };

    } catch (err: any) {
      logger.error(`[SwapExecutor] Quote failed for ${chainName}: ${err.message}`);
      return null;
    }
  });

  const results = await Promise.all(quoteTasks);
  return results.filter((r): r is RescueQuote => r !== null);
}
