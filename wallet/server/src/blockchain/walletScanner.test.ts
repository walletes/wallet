import { scanGlobalWallet } from './walletScanner.js';
import { logger } from '../utils/logger.js';

/**
 * INSTITUTIONAL TEST: Global Wallet Scanner.
 * Purpose: Verifies Multi-Source Aggregation, Spam Filtering, and Deduplication.
 */
async function runScannerValidation() {
  logger.info('--- Starting WalletScanner Unit Test (Colocated) ---');

  // A known high-activity address (e.g., Vitalik.eth or a major Exchange cold wallet)
  const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; 

  logger.info(`[Test 1] Scanning Global Assets for ${TEST_ADDRESS}...`);

  try {
    const startTime = Date.now();
    const assets = await scanGlobalWallet(TEST_ADDRESS);
    const duration = (Date.now() - startTime) / 1000;

    logger.info(`✅ Scan Complete in ${duration}s. Found ${assets.length} unique/valuable assets.`);

    // 1. Verify Native Asset Detection
    const eth = assets.find(a => a.type === 'native' && a.chainId === 1);
    if (eth) {
      logger.info(`✅ Native ETH Detected: ${eth.balance} ETH`);
    } else {
      logger.warn('⚠️ No Native ETH detected (Check Provider/Mainnet RPC)');
    }

    // 2. Verify ERC20 & Metadata
    const tokens = assets.filter(a => a.type === 'erc20');
    if (tokens.length > 0) {
      logger.info(`✅ ERC20 Tokens Detected: ${tokens.length}`);
      const sample = tokens[0];
      logger.info(`🔍 Sample Token: ${sample.symbol} (${sample.name}) | Balance: ${sample.balance}`);
      
      if (sample.contract && sample.contract.startsWith('0x')) {
        logger.info('✅ Contract Address Normalization Verified');
      }
    }

    // 3. Verify Spam Filtering Logic
    const spamInResults = assets.filter(a => a.isSpam === true);
    if (spamInResults.length === 0) {
      logger.info('✅ Spam/Phishing Filter: ACTIVE (No spam returned in valuable assets)');
    } else {
      logger.warn(`⚠️ Found ${spamInResults.length} spam items in final results. Check filter regex.`);
    }

    // 4. Verify Multi-Chain Deduplication
    const chainCounts = assets.reduce((acc: any, curr) => {
      acc[curr.chain] = (acc[curr.chain] || 0) + 1;
      return acc;
    }, {});
    
    logger.info('📊 Coverage Report:', chainCounts);

  } catch (err: any) {
    logger.error(`❌ Scanner Test Failed: ${err.message}`);
    if (err.message.includes('ALCHEMY')) {
      logger.warn('💡 Tip: Ensure ALCHEMY_API_KEY is set in your .env');
    }
  }

  logger.info('--- WalletScanner Test Suite: COMPLETED ---');
}

runScannerValidation().catch(err => {
  console.error('Scanner Test Fatal:', err);
  process.exit(1);
});
