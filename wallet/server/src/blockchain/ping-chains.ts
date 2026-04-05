import 'dotenv/config';
import { fs } from 'fs';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { EVM_CHAINS } from './chains.js';

/**
 * AEGIS-SOVEREIGN RPC AUDITOR (v2.0 - File Logging Enabled)
 * Pings every endpoint and writes a detailed report to audit-results.log
 */

const LOG_FILE = join(process.cwd(), 'wallet/server/src/blockchain/audit-results.log');
const logStream = createWriteStream(LOG_FILE, { flags: 'w' });

// Helper to log to both Console and File
function log(message: string) {
  const timestamp = new Date().toISOString();
  const cleanMessage = `[${timestamp}] ${message}`;
  console.log(message);
  logStream.write(cleanMessage + '\n');
}

const RPC_TIMEOUT = 5000;

async function pingRpc(chainId: number, chainName: string, url: string) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT);

    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        jsonrpc: '2.0', 
        id: chainId, 
        method: 'eth_blockNumber', 
        params: [] 
      })
    });

    clearTimeout(timeout);
    const data = await res.json();
    const latency = Date.now() - start;

    if (data.result) {
      const blockNum = parseInt(data.result, 16);
      log(`✅ [${chainName.padEnd(15)}] ${url.padEnd(45)} | Block: ${blockNum.toString().padStart(9)} | Latency: ${latency}ms`);
      return true;
    } else {
      throw new Error(data.error?.message || 'Invalid Response');
    }
  } catch (err: any) {
    log(`❌ [${chainName.padEnd(15)}] ${url.padEnd(45)} | FAILED: ${err.message.slice(0, 50)}`);
    return false;
  }
}

async function runAuditor() {
  log('--- 🛡️ AEGIS-SOVEREIGN RPC AUDIT STARTING ---');
  log(`Target: ${EVM_CHAINS.length} chains configured.\n`);

  let totalSuccessful = 0;
  let totalFailed = 0;

  // Process chains sequentially to keep the log readable
  for (const chain of EVM_CHAINS) {
    const pings = chain.rpcs.map(url => pingRpc(chain.id, chain.name, url));
    const results = await Promise.all(pings);
    
    totalSuccessful += results.filter(r => r).length;
    totalFailed += results.filter(r => !r).length;
  }

  log('\n--- 📊 AUDIT SUMMARY ---');
  log(`✅ Healthy Endpoints: ${totalSuccessful}`);
  log(`❌ Failed Endpoints:  ${totalFailed}`);
  log(`Report saved to: ${LOG_FILE}`);
  log('-------------------------\n');

  logStream.end();
}

runAuditor().catch(err => {
  console.error('Audit Engine Failure:', err);
  logStream.end();
});
