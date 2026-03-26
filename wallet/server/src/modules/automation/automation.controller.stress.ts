import { automationController } from './automation.controller.js';
import { prisma } from '../../config/database.js';
import { Wallet } from 'ethers';

/**
 * SCHEMA-SPECIFIC STRESS TEST
 * Targeted at: wallet/server/prisma/schema.prisma
 */
const mockRes = () => {
  const res: any = {};
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.body = data; return res; };
  return res;
};

async function runSchemaStress() {
  console.log("📊 STARTING SCHEMA-ALIGNED CONTROLLER STRESS...");

  const TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const TEST_ADDR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const CHAIN_ID = 8453; // Base

  // Ensure test wallet exists in DB (Required by @relation)
  await prisma.wallet.upsert({
    where: { address: TEST_ADDR },
    update: {},
    create: { address: TEST_ADDR, balance: "0", healthScore: 100 }
  });

  // --- ANGLE 1: IDEMPOTENCY & DB INDEXES ---
  console.log("\n[Angle 1] Testing @@index([walletAddress, active]) under load...");
  const addReq = {
    body: {
      address: TEST_ADDR,
      chainId: CHAIN_ID,
      type: "AUTO_BURN",
      privateKey: TEST_KEY,
      chain: "BASE"
    }
  };

  // Hammer the unique constraint/idempotency check
  const addResults = await Promise.all([
    automationController.addRule(addReq as any, mockRes() as any),
    automationController.addRule(addReq as any, mockRes() as any),
    automationController.addRule(addReq as any, mockRes() as any)
  ]);

  const success = addResults.filter(r => r.statusCode === 201).length;
  const conflicts = addResults.filter(r => r.statusCode === 409).length;

  console.log(`>> Success: ${success} | Conflicts (Blocked): ${conflicts}`);
  if (success > 1) console.error("❌ FAIL: Duplicate active rules allowed!");

  // --- ANGLE 2: SCHEMA TYPE VALIDATION (Int ID) ---
  console.log("\n[Angle 2] Testing Int ID Parsing (Schema alignment)...");
  
  // Get the ID of the rule we just created
  const createdRule = await prisma.automationRule.findFirst({ where: { walletAddress: TEST_ADDR }});
  
  if (createdRule) {
    const updReq = {
      params: { id: createdRule.id.toString() }, // Pass as string to simulate URL param
      body: { active: false }
    };
    const updRes = mockRes();
    await automationController.updateRule(updReq as any, updRes as any);

    if (updRes.statusCode === 200 && typeof updRes.body.rule.id === 'number') {
      console.log("✅ PASS: Controller correctly maps URL string to Prisma Int ID.");
    } else {
      console.error("❌ FAIL: ID mismatch or parsing error.");
    }
  }

  // --- ANGLE 3: DATA LEAK & REDACTION ---
  console.log("\n[Angle 3] Testing 'privateKey' Redaction...");
  const getReq = { query: { address: TEST_ADDR } };
  const getRes = mockRes();
  await automationController.getRules(getReq as any, getRes as any);

  const rawJson = JSON.stringify(getRes.body);
  if (rawJson.includes(TEST_KEY) || rawJson.includes("privateKey")) {
    console.error("❌ FAIL: SECURITY LEAK! Private key found in output.");
  } else {
    console.log("✅ PASS: Sensitive fields excluded from JSON response.");
  }

  // Cleanup
  await prisma.automationRule.deleteMany({ where: { walletAddress: TEST_ADDR } });
  console.log("\n✨ SCHEMA STRESS TEST COMPLETE.");
  process.exit(0);
}

runSchemaStress().catch(err => {
  console.error("STRESS CRASH:", err);
  process.exit(1);
});
