import { ethers as ethersLegacy } from 'ethers-v6-legacy'; 
import { FlashbotsBundleProvider, FlashbotsBundleResolution } from '@flashbots/ethers-provider-bundle';
import { logger } from '../utils/logger.js';
import { decryptPrivateKey } from '../utils/crypto.js';

export interface BundleResult {
  success: boolean;
  error?: string;
  txHash?: string;
}

/**
 * Tier 1 Private Execution Engine
 * Handles real-world funds by decrypting keys just-in-time and 
 * optimizing gas for competitive block inclusion.
 */
export const flashbotsExecution = {
  async executeBundle(
    encryptedPrivateKey: string, 
    rpcUrl: string, 
    payloads: any[], 
    chainId: number
  ): Promise<BundleResult> {
    try {
      const provider = new ethersLegacy.JsonRpcProvider(rpcUrl);
      
      // DECRYPT DIRECTLY INTO CONSTRUCTOR
      // Minimized memory footprint for the raw private key string
      const userWallet = new ethersLegacy.Wallet(
        decryptPrivateKey(encryptedPrivateKey), 
        provider
      );
      
      const authSigner = ethersLegacy.Wallet.createRandom();

      const relayUrl = chainId === 1 
        ? 'https://relay.flashbots.net' 
        : 'https://relay-sepolia.flashbots.net';

      const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider as any,
        authSigner as any,
        relayUrl
      );

      const baseNonce = await provider.getTransactionCount(userWallet.address);
      const feeData = await provider.getFeeData();

      // Ensure priority fee is high enough to be attractive to miners
      const priorityFee = (feeData.maxPriorityFeePerGas ?? 0n) + ethersLegacy.parseUnits('2', 'gwei');

      const signedBundle = payloads.map((tx, i) => ({ 
        signer: userWallet,
        transaction: {
          to: tx.to,
          data: tx.data,
          value: tx.value || 0n,
          gasLimit: tx.gasLimit || 150000n,
          chainId: chainId,
          type: 2,
          nonce: baseNonce + i,
          maxFeePerGas: feeData.maxFeePerGas ?? undefined,
          maxPriorityFeePerGas: priorityFee,
        }
      }));

      const blockNumber = await provider.getBlockNumber();
      const targetBlock = blockNumber + 1;
     
      // Simulation: Prevents burning gas on failing bundles
      const simulation = await flashbotsProvider.simulate(signedBundle, targetBlock);
      if ('error' in simulation) {
        throw new Error(`Simulation Failed: ${simulation.error.message}`);
      }

      logger.info(`[Flashbots] Bundle simulated for block ${targetBlock}. Submitting...`);

      const bundleSubmission = await flashbotsProvider.sendBundle(signedBundle, targetBlock);
      if ('error' in bundleSubmission) {
        throw new Error(bundleSubmission.error.message);
      }

      const waitResponse = await bundleSubmission.wait();
      
      if (waitResponse === FlashbotsBundleResolution.BundleIncluded) {
        logger.info(`[Flashbots] Success! Bundle included in block ${targetBlock}`);
        return { success: true, txHash: 'Included' };
      } else if (waitResponse === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
        return { success: false, error: 'Flashbots: Block passed without inclusion' };
      } else {
        return { success: false, error: 'Bundle failed or nonce mismatch' };
      }

    } catch (err: any) {
      if (err.message.includes("404")) {
          logger.error(`[Flashbots] Relay 404: Chain ${chainId} requires a Flashbots-compatible RPC.`);
      }
      return { success: false, error: err.message };
    }
  }
};
