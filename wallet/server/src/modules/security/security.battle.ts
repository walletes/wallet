import axios from 'axios';

/**
 * 2026 INSTITUTIONAL GATEWAY: HEAVY BATTLE TEST SUITE
 * Targets: Latency, EIP-7702 Risk, Timeout Resilience, and Input Sanitization.
 */

const API_BASE = 'http://localhost:5000/api/v1/security/scan';
const INTERNAL_KEY = "9293939sj39dn2oenaJKOw1oKHNa9e9iok0k11zo3ixja9wo3ndkzoskendkxks";

const TEST_WALLETS = {
  SECURE_EOA: "0xd8dA6BF26964aF9d7eEd9e03E53415D37aA96045", // Vitalik
  MALFORMED: "0xInvalidAddress123",
  LOWERCASE: "0x742d35cc6634c0532925a3b844bc454e4438f44e",
};

async function runBattleTest() {
  console.log("\n🚀 [2026] STARTING HEAVY BATTLE TEST: SECURITY_CONTROLLER\n");
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
      validate: (res: any) => res.data.data.wallet === "0x742d35Cc6634C0532925a3b844bc454e4438f44e"
    },
    {
      name: "Validation Failure (Invalid Address)",
      method: 'POST',
      data: { address: TEST_WALLETS.MALFORMED },
      expectedStatus: 422
    },
    {
      name: "Superchain Aggregation Check",
      method: 'POST',
      data: { address: TEST_WALLETS.SECURE_EOA, network: 'superchain' },
      expectedStatus: 200
    },
    {
        name: "Forced Cache Bypass (High-Stakes Mode)",
        method: 'GET',
        params: { address: TEST_WALLETS.SECURE_EOA, refresh: 'true' },
        expectedStatus: 200
    }
  ];

  for (const test of scenarios) {
    const start = performance.now();
    try {
      const config: any = {
        method: test.method,
        url: API_BASE,
        headers: { 
            'x-api-key': INTERNAL_KEY, 
            'x-trace-id': `BATTLE-UNIT-${Date.now()}` 
        },
        data: test.data,
        params: test.params,
        validateStatus: () => true 
      };

      const res = await axios(config);
      const duration = (performance.now() - start).toFixed(2);

      if (res.status === test.expectedStatus) {
        let extraCheck = test.validate ? test.validate(res) : true;
        if (extraCheck) {
          console.log(`✅ [PASS] ${test.name} (${duration}ms)`);
          passCount++;
        } else {
          console.log(`❌ [FAIL] ${test.name}: Logic Validation Failed`);
          failCount++;
        }
      } else {
        console.log(`❌ [FAIL] ${test.name}: Expected ${test.expectedStatus}, got ${res.status}`);
        console.log(`   Error: ${res.data.error || 'Unknown'}`);
        failCount++;
      }
    } catch (err: any) {
      console.log(`💥 [CRITICAL] ${test.name}: ${err.message}`);
      failCount++;
    }
  }

  // --- 2026 CONCURRENCY STRESS (Flood Test) ---
  console.log("\n🔥 STARTING CONCURRENCY BURST (15 Parallel Audits)...");
  const burstStart = performance.now();
  
  const burst = Array.from({ length: 15 }).map((_, i) => 
    axios.post(API_BASE, 
      { address: TEST_WALLETS.SECURE_EOA, traceId: `BURST-${i}` }, 
      { headers: { 'x-api-key': INTERNAL_KEY } }
    ).catch(e => e.response)
  );

  const results = await Promise.all(burst);
  const burstDuration = (performance.now() - burstStart).toFixed(2);
  const burstSuccess = results.filter(r => r && r.status === 200).length;

  console.log(`📊 BURST COMPLETE: ${burstSuccess}/15 successful in ${burstDuration}ms`);

  console.log("\n--- BATTLE SUMMARY ---");
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log("-----------------------\n");

  if (failCount > 0) process.exit(1);
  process.exit(0);
}

runBattleTest();
