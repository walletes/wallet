import { scanGlobalWallet } from '../../blockchain/walletScanner';
import { tokenService } from '../tokens/token.service';
import { prisma } from '../../config/database';

export const walletService = {
  /**
   * Performs a full cross-chain scan, categorizes assets, and updates the database.
   */
  async scanFull(address: string) {
    // 1. Get raw on-chain data from all providers
    const rawAssets = await scanGlobalWallet(address);

    // 2. Process through the heavy-duty classification engine
    const categorizedData = await tokenService.categorizeAssets(rawAssets);

    // 3. Dynamic Database Sync (Future-proof)
    await prisma.wallet.upsert({
      where: { address: address.toLowerCase() },
      update: { 
        lastSynced: new Date(),
        // Store a summary in the DB for quick dashboard loads
        balance: categorizedData.summary.totalUsdValue.toString() 
      },
      create: { 
        address: address.toLowerCase(),
        balance: categorizedData.summary.totalUsdValue.toString()
      }
    });

    // 4. Return the "Premium" structure the controller expects
    return {
      wallet: address.toLowerCase(),
      summary: categorizedData.summary,
      groups: categorizedData.groups,
      all: categorizedData.raw // Ensure this matches 'data.all' in controller
    };
  }
};
