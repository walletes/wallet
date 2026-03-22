import { ethers, getAddress } from 'ethers';
import { logger } from '../utils/logger.js';

/**
 * Tier 1 Transaction Architect
 * Builds standardized, ready-to-sign payloads for all on-chain interactions.
 */
export const txBuilder = {
  /**
   * Prepares a standard ERC20 'Burn' by routing to the verified Dead address.
   */
  async buildBurnTx(tokenAddress: string, amount: string, decimals: number) {
    const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
    const iface = new ethers.Interface(["function transfer(address to, uint256 value)"]);
    
    try {
      const data = iface.encodeFunctionData("transfer", [
        BURN_ADDRESS,
        ethers.parseUnits(amount, decimals)
      ]);

      return {
        to: getAddress(tokenAddress),
        data,
        value: "0x0",
        gasLimit: "100000",
        metadata: { type: 'BURN', symbol: 'SPAM' }
      };
    } catch (err: any) {
      logger.error(`[TxBuilder] Failed to encode burn: ${err.message}`);
      throw err;
    }
  },

  /**
   * Prepares an Approval for Recovery (Uniswap/Pancake/1inch)
   */
  async buildApprovalTx(tokenAddress: string, spender: string, amount: string, decimals: number) {
    const iface = new ethers.Interface(["function approve(address spender, uint256 value)"]);
    
    try {
      const data = iface.encodeFunctionData("approve", [
        getAddress(spender),
        ethers.parseUnits(amount, decimals)
      ]);

      return {
        to: getAddress(tokenAddress),
        data,
        value: "0x0",
        gasLimit: "65000",
        metadata: { type: 'APPROVAL', spender: getAddress(spender) }
      };
    } catch (err: any) {
      logger.error(`[TxBuilder] Failed to encode approval: ${err.message}`);
      throw err;
    }
  },

  /**
   * NEW: Prepares a Revoke Transaction (The "Security Shield")
   * Sets the allowance for a specific spender/scam contract to EXACTLY ZERO.
   */
  async buildRevokeTx(tokenAddress: string, spender: string) {
    const iface = new ethers.Interface(["function approve(address spender, uint256 value)"]);
    
    try {
      // Logic: Approve zero tokens = Revoke permission
      const data = iface.encodeFunctionData("approve", [
        getAddress(spender),
        0n 
      ]);

      return {
        to: getAddress(tokenAddress),
        data,
        value: "0x0",
        gasLimit: "60000",
        metadata: { type: 'REVOKE', targetSpender: getAddress(spender) },
        description: `Revoking all permissions for contract ${spender}`
      };
    } catch (err: any) {
      logger.error(`[TxBuilder] Failed to encode revoke: ${err.message}`);
      throw err;
    }
  },

  /**
   * NEW: Builds a Native Asset Transfer (ETH/POL/BNB)
   * Used for moving funds out of a compromised wallet manually.
   */
  async buildNativeTransfer(to: string, amount: string) {
    try {
      return {
        to: getAddress(to),
        value: ethers.parseEther(amount).toString(),
        data: "0x",
        gasLimit: "21000",
        metadata: { type: 'NATIVE_TRANSFER' }
      };
    } catch (err: any) {
      logger.error(`[TxBuilder] Failed to encode native transfer: ${err.message}`);
      throw err;
    }
  }
};
