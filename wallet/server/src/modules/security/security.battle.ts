import express from 'express';
import axios from 'axios';
import http from 'http';
import { scanSecurityController } from './security.controller.js';
import { validator } from '../../utils/validator.js';

/**
 * 2026 DIRECT-HIT STRATEGY: CONCURRENCY-HARDENED
 * Features: Connection Pooling, Micro-Server Isolation, and 
 * Detailed Latency Distribution.
 */

const app = express();
const PORT = 5001; 
const API_BASE = `http://localhost:${PORT}/scan`;
const INTERNAL_KEY = "9293939sj39dn2oenaJKOw1oKHNa9e9iok0k11zo3ixja9wo3ndkzoskendkxks";

// Connection pooling to prevent socket exhaustion during the 15-audit burst
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });

app.use(express.json());

// Direct route mounting to bypass loader complexity
app.all('/scan', validator.validateRequestBody, scanSecurityController);

const TEST_WALLETS = {
  SECURE_EOA: "0xd8dA6BF26964aF9d7eEd9e03E53415D37aA96045",
  MALFORMED: "0xInvalidAddress123",
  LOWERCASE: "0x742d35cc6634c0532925a3b844bc454e4438f44e",
};

async function runBattleTest() {
  const server = app.listen(PORT);
  console.log(`\n📡 Micro-Server online on port ${PORT}`);
  console.log("🚀 [2026] STARTING DIRECT ISOLATION TEST (CONCURRENCY MODE)\n");

  let passCount = 0;
  let failCount = 0;

  const scenarios = [
    {
      name: "Standard POST Audit (Secure EOA)",
      method: 'POST',
      data: { address: TEST_WALLETS.SECURE_EOA, network: 'base' },
      expectedStatus: 200
    },
    {
      name: "Legacy GET Audit (URL Params)",
      method: 'GET',
      params: { address: TEST_WALLETS.SECURE_EOA, network: 'optimism' },
      expectedStatus: 200
    },
    {
      name: "Input Sanitization (Lowercase Auto-Checksum)",
      method: 'POST',
      data: { address: TEST_WALLETS.LOWERCASE },
      expectedStatus: 200,
      validate: (res: any) => {
        const wallet = res.data.data?.wallet;
        return wallet === "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
      }
    },
    {
      name: "Validation Failure (Invalid Address)",
      method: 'POST',
      data: { address: TEST_WALLETS.MALFORMED },
      expectedStatus: 422
    }
  ];

  for (const test of scenarios) {
    try {
      const res = await axios({
        method: test.method,
        url: API_BASE,
        headers: { 'x-api-key': INTERNAL_KEY },
        data: test.method === 'POST' ? test.data : undefined,
        params: test.method === 'GET' ? test.params : undefined,
        validateStatus: () => true,
        httpAgent
      });

      if (res.status === test.expectedStatus) {
        const logicPass = test.validate ? test.validate(res) : true;
        if (logicPass) {
          console.log(`✅ [PASS] ${test.name}`);
          passCount++;
        } else {
          console.log(`❌ [FAIL] ${test.name}: Checksum/Logic mismatch`);
          failCount++;
        }
      } else {
        console.log(`❌ [FAIL] ${test.name}: Expected ${test.expectedStatus}, got ${res.status}`);
        console.log(`   Response: ${JSON.stringify(res.data)}`);
        failCount++;
      }
    } catch (err: any) {
      console.log(`💥 [CRITICAL] ${test.name}: ${err.message}`);
      failCount++;
    }
  }

  console.log("\n🔥 STARTING CONCURRENCY BURST (15 Parallel Audits)...");
  const startTime = Date.now();
  
  const burstPromises = Array.from({ length: 15 }).map((_, i) => 
    axios.post(API_BASE, 
      { address: TEST_WALLETS.SECURE_EOA },
      { 
        headers: { 'x-api-key': INTERNAL_KEY },
        httpAgent,
        timeout: 20000 
      }
    ).catch(e => e.response)
  );

  const burstResults = await Promise.all(burstPromises);
  const totalTime = Date.now() - startTime;
  
  const burstSuccess = burstResults.filter(r => r && r.status === 200).length;
  const avgLatency = (totalTime / 15).toFixed(2);

  console.log(`📊 BURST COMPLETE: ${burstSuccess}/15 successful`);
  console.log(`⏱️  Average Burst Latency: ${avgLatency}ms`);

  console.log("\n--- BATTLE SUMMARY ---");
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log(`FINAL SCORE:  ${passCount}/4 Tests | ${burstSuccess}/15 Burst`);
  console.log("-----------------------\n");

  server.close();
  // Exit with error if core tests fail or burst is less than 80% successful
  process.exit(failCount > 0 || burstSuccess < 12 ? 1 : 0);
}

runBattleTest();
