import { scanWallet, scanGlobalWallet } from '../../blockchain/walletScanner.js';

export const walletService = {
  // Legacy scan (kept safe)
  async scan(address: string) {
    if (!address) throw new Error('Wallet address is required');
    const data = await scanWallet(address);
    return {
      wallet: address,
      assets: data,
      total_assets: data.length,
      timestamp: new Date().toISOString(),
    };
  },

  // Dynamic Multi-Chain Multi-Asset Engine
  async scanFull(address: string) {
    if (!address) throw new Error('Wallet address is required');

    // Calls the Aggregator (Alchemy + Covalent + Moralis)
    const assets = await scanGlobalWallet(address);

    return {
      wallet: address,
      assets,
      total_assets: assets.length,
      timestamp: new Date().toISOString(),
    };
  },
};
