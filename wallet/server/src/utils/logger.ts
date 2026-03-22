import chalk from 'chalk';

/**
 * Premium Logger Utility
 * Supports: Colors, Timestamps, Objects, and Environment-based filtering
 */
const IS_DEV = process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Log standard information
   */
  info: (message: string, ...meta: any[]) => {
    const timestamp = new Date().toISOString();
    const prefix = chalk.blue(`[INFO] [${timestamp}]`);
    console.log(`${prefix} ${message}`, ...meta);
  },

  /**
   * Log warnings (Potential issues)
   */
  warn: (message: string, ...meta: any[]) => {
    const timestamp = new Date().toISOString();
    const prefix = chalk.yellow(`[WARN] [${timestamp}]`);
    console.warn(`${prefix} ${message}`, ...meta);
  },

  /**
   * Log errors with full stack trace visibility
   */
  error: (message: string, ...meta: any[]) => {
    const timestamp = new Date().toISOString();
    const prefix = chalk.red(`[ERROR] [${timestamp}]`);
    console.error(`${prefix} ${message}`, ...meta);
  },

  /**
   * Log debug info (Only visible in Development)
   */
  debug: (message: string, ...meta: any[]) => {
    if (!IS_DEV) return;
    const timestamp = new Date().toISOString();
    const prefix = chalk.magenta(`[DEBUG] [${timestamp}]`);
    console.debug(`${prefix} ${message}`, ...meta);
  },

  /**
   * Transaction specific logging
   */
  tx: (hash: string, chain: string) => {
    const timestamp = new Date().toISOString();
    const prefix = chalk.green(`[TX-SENT] [${timestamp}]`);
    console.log(`${prefix} Chain: ${chain} | Hash: ${hash}`);
  }
};

export default logger;
