import { ethers as ethersLegacy } from 'ethers-v6-legacy'; 
import { FlashbotsBundleProvider, FlashbotsBundleResolution } from '@flashbots/ethers-provider-bundle';
import { logger } from '../utils/logger.js';

export interface BundleResult {
  success: boolean;
  error?: string;
  txHash?: string;
}

/**
 * Tier 1 Private Execution Engine
 * Fixes: "Argument of type JsonRpcProvider is not assignable" by using explicit casting.
 */
export const flashbotsExecution = {
  async executeBundle(
    userPrivateKey: string, 
    rpcUrl: string, 
    payloads: any[], 
    chainId: number
  ): Promise<BundleResult> {
    try {
      // 1. Initialize using the LEGACY engine
      const provider = new ethersLegacy.JsonRpcProvider(rpcUrl);
      const userWallet = new ethersLegacy.Wallet(userPrivateKey, provider);
      const authSigner = ethersLegacy.Wallet.createRandom();

      // Fix: Cast provider and authSigner to 'any' to bypass the internal private property mismatch
      const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider as any,
        authSigner as any,
        chainId === 1 ? 'https://relay.flashbots.net' : 'https://relay-goerli.flashbots.net'
      );

      // 2. Format the bundle
      // Fix: Type the bundle as 'any[]' so the library accepts the Legacy Wallet
      const signedBundle: any[] = payloads.map(tx => ({
        signer: userWallet,
        transaction: {
          to: tx.to,
          data: tx.data,
          value: tx.value || 0n,
          gasLimit: tx.gasLimit || 150000n,
          chainId: chainId,
          type: 2 
        }
      }));

      const targetBlock = (await provider.getBlockNumber()) + 1;

      // 3. Simulation Phase
      const simulation = await flashbotsProvider.simulate(signedBundle, targetBlock);
      if ('error' in simulation) {
        throw new Error(`Simulation Failed: ${simulation.error.message}`);
      }

      // 4. Execution Phase
      const bundleSubmission = await flashbotsProvider.sendBundle(signedBundle, targetBlock);
      
      if ('error' in bundleSubmission) {
        throw new Error(bundleSubmission.error.message);
      }

      // Fix: Cast resolution check to handle enum version differences if any
      const waitResponse = await bundleSubmission.wait();
      
      if (waitResponse === (FlashbotsBundleResolution.BundleIncluded as any)) {
        logger.info(`[Flashbots] Bundle included in block ${targetBlock}`);
        return { success: true, txHash: 'Included' };
      } else {
        return { success: false, error: 'Bundle not included in block' };
      }

    } catch (err: any) {
      logger.error(`[Flashbots] Execution Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
};
