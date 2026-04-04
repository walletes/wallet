import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 1. Manually resolve the path to wallet/server/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env'); 
dotenv.config({ path: envPath });

// Debug: Verify keys are loaded before importing the controller
console.log(`\n🔍 [Environment Check]`);
console.log(`Config Path: ${envPath}`);
console.log(`ALCHEMY_KEY: ${process.env.ALCHEMY_API_KEY ? '✅ LOADED' : '❌ MISSING'}`);
console.log(`COVALENT_KEY: ${process.env.COVALENT_API_KEY ? '✅ LOADED' : '❌ MISSING'}\n`);

import { Request, Response } from 'express';
import { scanTokensController } from './token.controller.js';

async function runProductionStress() {
  const TEST_WALLETS = ['0x00000000219ab540356cBB839Cbe05303d7705Fa'];
  
  const req = {
    query: { address: TEST_WALLETS[0], refresh: 'true' },
    headers: { 'x-trace-id': 'ENV-FIX-TEST' },
    body: {}
  } as any;

  const res = {
    headers: {},
    setHeader(n: string, v: string) { this.headers[n] = v; return this; },
    status(code: number) {
      return {
        json: (data: any) => {
          if (code === 200) console.log(`✅ Success! USD Value: ${data.summary.totalUsdValue}`);
          else console.log(`❌ Failed (${code}): ${data.error}`);
        }
      };
    }
  } as any;

  await scanTokensController(req, res);
}

runProductionStress().catch(console.error);
