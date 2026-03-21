import { formatUnits, parseUnits } from 'ethers';
import { getProvider } from '../blockchain/provider.js';
import { EVM_CHAINS } from '../blockchain/chains.js';

export async function getSmartRescueQuote(walletAddress: string, assets: any[]) {
  // 1. Group assets by chain to check for native gas
  const chainGroups = assets.reduce((acc: any, asset: any) => {
    if (!acc[asset.chain]) acc[asset.chain] = { native: 0n, tokens: [] };
    if (asset.type === 'native') acc[asset.chain].native = parseUnits(asset.balance, 18);
    else acc[asset.chain].tokens.push(asset);
    return acc;
  }, {});

  const quoteTasks = Object.keys(chainGroups).map(async (chainName) => {
    const group = chainGroups[chainName];
    const chain = EVM_CHAINS.find(c => c.name === chainName);
    
    // Skip if chain not in registry or if there are no tokens to rescue
    if (!chain || group.tokens.length === 0) return null;

    try {
      // USE getProvider to fetch real-time gas data
      const provider = getProvider(chain.rpc);
      const feeData = await provider.getFeeData();
      
      // Dynamic Threshold: Cost of a typical swap (approx 200k gas)
      const currentGasPrice = feeData.gasPrice ?? parseUnits('20', 'gwei');
      const gasThreshold = currentGasPrice * 200000n; 

      // 2. Determine if user has enough gas
      const hasGas = group.native >= gasThreshold;

      // 3. Dynamic Fee Logic (5% vs 7.2%)
      const feeTier = hasGas ? 0.05 : 0.072;
      const feeLabel = hasGas 
        ? "Standard Rescue (5%)" 
        : "Relayed Rescue (7.2% - No Gas Needed)";

      // Calculate total dust value for this chain
      const totalDustValue = group.tokens.reduce((sum: bigint, t: any) => 
        sum + parseUnits(t.balance, 18), 0n
      );

      const serviceFee = (totalDustValue * BigInt(Math.floor(feeTier * 10000))) / 10000n;

      return {
        wallet: walletAddress, // ✅ walletAddress is now used
        chain: chainName,
        status: hasGas ? 'GAS_AVAILABLE' : 'GASLESS_REQUIRED',
        feeTier: `${(feeTier * 100).toFixed(1)}%`,
        feeLabel,
        estimatedGasCost: formatUnits(gasThreshold, 18),
        summary: {
          totalValue: formatUnits(totalDustValue, 18),
          serviceFee: formatUnits(serviceFee, 18),
          currency: chain.symbol
        },
        tokens: group.tokens.map((t: any) => t.symbol)
      };
    } catch (err) {
      console.error(`Quote failed for ${chainName}:`, err);
      return null;
    }
  });

  const rescueQuotes = await Promise.all(quoteTasks);
  return rescueQuotes.filter(Boolean);
}
