import 'dotenv/config';
import { getNetworkUrl, getProvider, getHealthyProvider } from './provider.js';
import { logger } from '../utils/logger.js';
import { EVM_CHAINS } from './chains.js';

/**
 * AEGIS-SOVEREIGN DYNAMIC PROVIDER TEST
 * Purpose: Verify .env priority and RPC health without hardcoded URLs.
 */
async function runTests() {
  console.log('--- 🛡️ AEGIS-SOVEREIGN DYNAMIC TEST ---');

  // 1. Dynamic Resolution Test (Ethereum)
  // This will check .env (RPC_ETHEREUM), then Alchemy, then chains.ts
  const ethName = 'ethereum';
  const ethUrl = getNetworkUrl(ethName);
  console.log(`[TEST 1] ${ethName} resolved dynamically to: ${ethUrl}`);

  // 2. Multi-Chain Verification (Sampling 3 random chains from your config)
  const testChains = [1, 137, 8453]; // Eth, Polygon, Base
  
  for (const cid of testChains) {
    console.log(`\n[TEST] Checking Chain ID: ${cid}...`);
    try {
      // getHealthyProvider performs the block-staleness check and latency sorting
      const provider = await getHealthyProvider(cid);
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      
      console.log(`✅ SUCCESS: Connected to ${network.name}`);
      console.log(`   - Resolved RPC: ${provider._getConnection().url}`);
      console.log(`   - Current Block: ${blockNumber}`);
    } catch (error: any) {
      console.log(`❌ FAILED for Chain ${cid}: ${error.message}`);
    }
  }

  // 3. Test .env Override Detection
  console.log('\n[TEST 3] Environment Variable Check:');
  const envKeys = Object.keys(process.env).filter(key => key.startsWith('RPC_') || key.startsWith('ALCHEMY_'));
  if (envKeys.length > 0) {
    console.log(`✅ Detected ${envKeys.length} environment overrides: [${envKeys.join(', ')}]`);
  } else {
    console.log('⚠️ WARNING: No .env overrides found. Test is running on public fallbacks only.');
  }

  console.log('\n--- 🛡️ DYNAMIC TEST COMPLETE ---');
}

runTests().catch(err => {
  logger.error(`Test Suite Crashed: ${err.message}`);
  process.exit(1);
});
