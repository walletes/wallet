import { encryptPrivateKey } from './crypto.js';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateSecureTestKey() {
  const burner = Wallet.createRandom();
  console.log(`\n🔑 NEW BURNER ADDRESS: ${burner.address}`);
  console.log(`📄 RAW PRIVATE KEY: ${burner.privateKey}`);

  try {
    // This uses your production encryption logic
    const encrypted = await encryptPrivateKey(burner.privateKey);
    
    console.log('\n--- 🛡️ ENCRYPTED VAULT STRING (USE THIS IN STRESS TEST) ---');
    console.log(encrypted);
    console.log('----------------------------------------------------------\n');
  } catch (err) {
    console.error('❌ VAULT_ERROR: Ensure your ENCRYPTION_KEY is set in .env');
  }
}

generateSecureTestKey();
