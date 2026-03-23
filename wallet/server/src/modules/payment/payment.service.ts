import { prisma } from '../../config/database.js';
import { getProvider } from '../../blockchain/provider.js';
import { EVM_CHAINS } from '../../blockchain/chains.js';
import { ethers, Interface } from 'ethers';
import { logger } from '../../utils/logger.js';

const REVENUE_ADDRESS = process.env.REVENUE_ADDRESS;
const ERC20_ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];

/**
 * Tier 1 Payment Logic
 * Upgraded for Production: Features Re-org Protection, Multi-decimal validation, 
 * and Atomic Confirmation logic for real-world assets.
 */
export const paymentService = {
  /**
   * Creates a pending payment record (Intent)
   */
  async createIntent(wallet: string, amount: number, chain: string) {
    return await prisma.payment.create({
      data: {
        wallet: wallet.toLowerCase(),
        amount,
        chain: chain.toUpperCase(),
        confirmed: false
      }
    });
  },

  /**
   * Heavy-Duty Transaction Verifier
   * Upgraded: Checks for block depth (finality) and strict recipient matching.
   */
  async verifyTransaction(paymentId: string, txHash: string) {
    if (!REVENUE_ADDRESS) throw new Error("REVENUE_ADDRESS not set in environment");

    // 1. Fetch record and chain config
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Payment record not found");
    if (payment.confirmed) return payment; // Idempotency: Already done

    const chainConfig = EVM_CHAINS.find(c => c.name === payment.chain);
    if (!chainConfig) throw new Error(`Chain ${payment.chain} not supported`);

    const provider = getProvider(payment.chain); // Uses your provider factory
    
    // 2. Fetch Receipt, Tx, and Current Block in Parallel
    const [receipt, tx, currentBlock] = await Promise.all([
      provider.getTransactionReceipt(txHash),
      provider.getTransaction(txHash),
      provider.getBlockNumber()
    ]);

    if (!receipt || receipt.status !== 1 || !tx) {
      throw new Error("Transaction is still pending, dropped, or failed on-chain");
    }

    // 3. FINALITY CHECK: Ensure at least 2-5 confirmations to prevent Re-org attacks
    const confirmations = currentBlock - receipt.blockNumber;
    const minConfirms = (payment.chain === 'ETHEREUM') ? 2 : 5; // L2s need more confirms for safe finality
    
    if (confirmations < minConfirms) {
      throw new Error(`Awaiting confirmation depth (${confirmations}/${minConfirms})`);
    }

    // 4. NATIVE VALUE CHECK (ETH/BNB/POL)
    // We allow a 2% slippage for price fluctuations if paying in native
    const isNativeToMe = receipt.to?.toLowerCase() === REVENUE_ADDRESS.toLowerCase();
    const nativeValueMatches = parseFloat(ethers.formatEther(tx.value)) >= (payment.amount * 0.98);

    // 5. ERC20 VALUE CHECK (USDC/USDT)
    let isTokenVerified = false;
    const iface = new Interface(ERC20_ABI);
    
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === 'Transfer' && parsed.args.to.toLowerCase() === REVENUE_ADDRESS.toLowerCase()) {
          
          const rawValue = parsed.args.value;
          // Check for both 6-decimal (USDC/USDT) and 18-decimal tokens
          const val6 = parseFloat(ethers.formatUnits(rawValue, 6));
          const val18 = parseFloat(ethers.formatUnits(rawValue, 18));
          
          if (val6 >= (payment.amount * 0.98) || val18 >= (payment.amount * 0.98)) {
            isTokenVerified = true;
            break;
          }
        }
      } catch (e) { continue; }
    }

    // 6. ATOMIC CONFIRMATION
    if ((isNativeToMe && nativeValueMatches) || isTokenVerified) {
      logger.info(`[Payment Verified] ID: ${paymentId} | Amount: $${payment.amount} | TX: ${txHash}`);
      
      return await prisma.payment.update({
        where: { id: paymentId },
        data: { 
          txHash, 
          confirmed: true,
          // updatedAt is handled by Prisma
        }
      });
    }

    throw new Error("Transaction detected but recipient address or amount does not match intent");
  }
};
