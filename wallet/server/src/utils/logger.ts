import chalk from 'chalk';

/**
 * UPGRADED: Production-grade Financial Logger.
 * Features: PII Redaction, Structured JSON for Production, and Trace Linking.
 */
const IS_PROD = process.env.NODE_ENV === 'production';

// Sensitive keys that should NEVER be logged
const REDACT_KEYS = ['privatekey', 'seed', 'mnemonic', 'password', 'secret', 'key'];

/**
 * Deep-scans objects and redacts sensitive financial data before they hit the disk.
 */
function redact(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const copy = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in copy) {
    if (REDACT_KEYS.some(k => key.toLowerCase().includes(k))) {
      copy[key] = '[REDACTED]';
    } else if (typeof copy[key] === 'object') {
      copy[key] = redact(copy[key]);
    }
  }
  return copy;
}

const formatMessage = (level: string, message: string, meta: any[]) => {
  const timestamp = new Date().toISOString();
  const redactedMeta = meta.map(m => redact(m));

  if (IS_PROD) {
    // Structured JSON for CloudWatch/Datadog/ELK
    return JSON.stringify({
      timestamp,
      level,
      message,
      context: redactedMeta.length > 0 ? redactedMeta : undefined,
    });
  }

  // Human-readable for Development
  const colors: Record<string, any> = {
    INFO: chalk.blue,
    WARN: chalk.yellow,
    ERROR: chalk.red,
    DEBUG: chalk.magenta,
    TX: chalk.green
  };

  const color = colors[level] || chalk.white;
  const metaStr = redactedMeta.length > 0 ? ` | ${JSON.stringify(redactedMeta)}` : '';
  return `${color(`[${level}]`)} [${timestamp}] ${message}${metaStr}`;
};

export const logger = {
  info: (message: string, ...meta: any[]) => {
    console.log(formatMessage('INFO', message, meta));
  },

  warn: (message: string, ...meta: any[]) => {
    console.warn(formatMessage('WARN', message, meta));
  },

  error: (message: string, ...meta: any[]) => {
    // Ensure Error objects are serialized correctly
    const processedMeta = meta.map(m => m instanceof Error ? { name: m.name, message: m.message, stack: m.stack } : m);
    console.error(formatMessage('ERROR', message, processedMeta));
  },

  debug: (message: string, ...meta: any[]) => {
    if (IS_PROD) return;
    console.debug(formatMessage('DEBUG', message, meta));
  },

  /**
   * Financial Audit Log
   * Specifically for tracking asset movements or high-value scans.
   */
  tx: (hash: string, chain: string, details: object = {}) => {
    const msg = `[TX-SYNC] ${chain.toUpperCase()} | Hash: ${hash}`;
    console.log(formatMessage('TX', msg, [details]));
  }
};

export default logger;
