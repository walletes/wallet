import { scanWallet, scanGlobalWallet } from '../../blockchain/walletScanner.js';
import { WalletScanResult, TokenAddress } from './wallet.types.js';

export const walletService = {
  // ─── EXISTING (UNCHANGED) ─────────────────────
  async scan(address: string, tokensToTrack: TokenAddress[] = []): Promise<WalletScanResult> {
    if (!address) {
      throw new Error('Wallet address is required');
    }

    const data = await scanWallet(address, tokensToTrack);

    return {
      wallet: address,
      assets: data,
      total_assets: data.length,
      timestamp: new Date().toISOString(),
    };
  },

  // ─── NEW MULTI-CHAIN SCAN ─────────────────────
  async scanFull(address: string) {
    if (!address) {
      throw new Error('Wallet address is required');
    }

    const assets = await scanGlobalWallet(address);

    return {
      wallet: address,
      assets,
      total_chains: assets.length,
      timestamp: new Date().toISOString(),
    };
  },
};
