import { calculateVerdict, runSecurityScan } from './spamDetector.js';

async function strangerAttack() {
  console.log('🕵️ STRANGER-DANGER: INITIATING CHAOS INJECTION...\n');

  // ATTACK 1: THE NULL POINTER INJECTION
  // Simulate a request with missing or "undefined" fields from a broken API
  console.log('--- ATTACK 1: Malformed Metadata ---');
  try {
    const corruptAsset = { symbol: null, name: undefined, balance: 'Infinity' };
    const result = calculateVerdict(corruptAsset, {}, { price: 0, liquidity: 0 });
    console.log(`Result: ${result.status} (Handled gracefully)`);
  } catch (e) {
    console.log('❌ CRASH: Logic died on null/undefined metadata');
  }

  // ATTACK 2: THE "INSTANT REFRESH" DDOS
  // Simulate 1000 requests in 1 second to break the Auth Lock
  console.log('\n--- ATTACK 2: Auth Hammering ---');
  const hammer = Array.from({ length: 100 }).map(() => runSecurityScan('0x0', 1));
  const results = await Promise.allSettled(hammer);
  console.log(`Finished 100 blind scans. Check logs for socket hangs.`);

  // ATTACK 3: THE OVERFLOW (Real Finance Risk)
  // Can your Decimal.js handle a balance of 10^77 (Common in scam tokens)?
  console.log('\n--- ATTACK 3: Integer Overflow Injection ---');
  const whaleScam = { 
    symbol: 'SCAM', 
    balance: '99999999999999999999999999999999999999999999999999999999999' 
  };
  const highValue = calculateVerdict(whaleScam, { tax: 0 }, { price: 1, liquidity: 1000000 });
  console.log(`USD Value calculated: ${highValue.usdValue}`);
  if (isNaN(highValue.usdValue)) console.log('❌ ERROR: Math overflowed to NaN');
  else console.log('✅ Math held firm.');

  console.log('\n🏁 STRANGER MISSION COMPLETE.');
}

strangerAttack();
