import chalk from 'chalk';
import { Buffer } from 'buffer';
import { clearSensitiveData } from './crypto.js';

/**
 * UPGRADED: 2026 Institutional Financial Logger.
 * Features: BigInt Serialization, Request Tracing, PII Scrubbing, 
 * and EIP-4844/7702 Transaction Contextualization.
 */
const IS_PROD = process.env.NODE_ENV === 'production';
const APP_VERSION = process.env.APP_VERSION || '2026.3.1-PROD';

// 2026 Strict Redaction List - Hardened for Mainnet Finance
const REDACT_KEYS = [
  'privatekey', 'seed', 'mnemonic', 'password', 'secret', 
  'key', 'token', 'auth', 'authorization', 'signature', 'pk',
  'private_key', 'xprv', 'master_seed'
];

/**
 * GLOBAL SERIALIZER SAFETY NET
 * Handles any BigInts that escape the recursive redaction.
 */
const bigIntReplacer = (_key: string, value: any) => 
  typeof value === 'bigint' ? value.toString() : value;

/**
 * Deep-scans objects and redacts sensitive financial data.
 * v2.1: Implements memory-wiping for intercepted sensitive buffers.
 */
function redact(data: any, seen = new WeakSet()): any {
  if (data === null || typeof data !== 'object') return data;
  
  // Prevent infinite loops in circular objects
  if (seen.has(data)) return '[Circular]';
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map(item => redact(item, seen));
  }

  const redactedObj: any = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = REDACT_KEYS.some(k => key.toLowerCase().includes(k));

    if (isSensitive) {
      // If the sensitive value is a Buffer, wipe it from memory immediately
      if (value instanceof Buffer) clearSensitiveData(value);
      redactedObj[key] = '[REDACTED_SENSITIVE_PII]';
    } else if (typeof value === 'bigint') {
      redactedObj[key] = value.toString(); // BigInts crash JSON.stringify
    } else if (value instanceof Buffer) {
      redactedObj[key] = `Buffer(${value.length})`;
    } else if (typeof value === 'object') {
      redactedObj[key] = redact(value, seen);
    } else {
      redactedObj[key] = value;
    }
  }
  return redactedObj;
}

/**
 * Normalizes error objects for structured logging.
 * Explicit return type added to resolve ts(7023) recursion error.
 */
function processError(err: any): any {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: IS_PROD ? undefined : err.stack, 
      code: (err as any).code,
      cause: (err as any).cause ? processError((err as any).cause) : undefined
    };
  }
  return err;
}

const formatMessage = (level: string, message: string, meta: any[]) => {
  const timestamp = new Date().toISOString();
  
  // Extract TraceID or generate a generic system trace
  let traceId = 'SYSTEM';
  if (meta.length > 0 && typeof meta[0] === 'string' && (meta[0].startsWith('TRACE-') || meta[0].startsWith('SEC-') || meta[0].startsWith('PAY-'))) {
    traceId = meta.shift();
  }
  
  const processedMeta = meta.map(m => redact(processError(m)));

  if (IS_PROD) {
    // 2026 Standard: Structured JSON for ELK/Datadog/CloudWatch
    return JSON.stringify({
      timestamp,
      level,
      traceId,
      message,
      context: processedMeta.length > 0 ? processedMeta : undefined,
      version: APP_VERSION,
      environment: process.env.NODE_ENV
    }, bigIntReplacer);
  }

  // Human-readable for Local Development
  const colors: Record<string, any> = {
    INFO: chalk.cyan,
    WARN: chalk.yellow,
    ERROR: chalk.red.bold,
    DEBUG: chalk.gray,
    TX: chalk.greenBright,
    AUDIT: chalk.magenta.bold
  };

  const color = colors[level] || chalk.white;
  const metaStr = processedMeta.length > 0 ? ` | ${JSON.stringify(processedMeta, bigIntReplacer, 2)}` : '';
  
  return `${color(`[${level}]`)} [${timestamp}] [${traceId}] ${message}${metaStr}`;
};

export const logger = {
  info: (message: string, ...meta: any[]) => {
    process.stdout.write(formatMessage('INFO', message, meta) + '\n');
  },

  warn: (message: string, ...meta: any[]) => {
    process.stderr.write(formatMessage('WARN', message, meta) + '\n');
  },

  error: (message: string, ...meta: any[]) => {
    process.stderr.write(formatMessage('ERROR', message, meta) + '\n');
  },

  debug: (message: string, ...meta: any[]) => {
    if (IS_PROD && process.env.LOG_LEVEL !== 'debug') return;
    process.stdout.write(formatMessage('DEBUG', message, meta) + '\n');
  },

  /**
   * Financial Audit Log: 2026 Real-time Settlement Monitoring
   */
  tx: (hash: string, chain: string, details: any = {}) => {
    const traceId = details.traceId || `TX-${hash.slice(2, 10).toUpperCase()}`;
    const msg = `[SETTLEMENT] ${chain.toUpperCase()} | ${hash}`;
    process.stdout.write(formatMessage('TX', msg, [traceId, details]) + '\n');
  },

  /**
   * Institutional Security Audit: EIP-7702 & Simulation results
   */
  audit: (action: string, wallet: string, result: object) => {
    const msg = `[AUDIT] ${action.toUpperCase()} | ${wallet}`;
    process.stdout.write(formatMessage('AUDIT', msg, [result]) + '\n');
  }
};

export default logger;
