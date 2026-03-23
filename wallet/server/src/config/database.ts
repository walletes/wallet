import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { logger } from '../utils/logger.js';
import { encryptPrivateKey } from '../utils/crypto.js';

const connectionString = process.env.DATABASE_URL;

// 1. Create a high-performance connection pool
const pool = new pg.Pool({ 
  connectionString,
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error(`[Database] Unexpected pool error: ${err.message}`);
});

/**
 * DATABASE INITIALIZER
 */
export async function connectDB() {
  try {
    const client = await pool.connect();
    client.release();
    logger.info('[Database] Connection verified via PG Pool.');
  } catch (err: any) {
    logger.error(`[Database] Connection failed: ${err.message}`);
    process.exit(1);
  }
}

// 2. Initialize Base Prisma with the PG Adapter
const adapter = new PrismaPg(pool as any);
const basePrisma = new PrismaClient({ adapter });

/**
 * 3. MAXIMUM SECURITY EXTENSION
 * Automatically intercepts 'AutomationRule' writes to encrypt private keys.
 * This prevents raw keys from ever hitting my database logs or storage.
 */
export const prisma = basePrisma.$extends({
  query: {
    automationRule: {
      async create({ args, query }) {
        if (args.data.privateKey) {
          args.data.privateKey = encryptPrivateKey(args.data.privateKey);
        }
        return query(args);
      },
      async update({ args, query }) {
        if (args.data.privateKey && typeof args.data.privateKey === 'string') {
          args.data.privateKey = encryptPrivateKey(args.data.privateKey);
        }
        return query(args);
      },
      async upsert({ args, query }) {
        if (args.create.privateKey) {
          args.create.privateKey = encryptPrivateKey(args.create.privateKey);
        }
        if (args.update.privateKey && typeof args.update.privateKey === 'string') {
          args.update.privateKey = encryptPrivateKey(args.update.privateKey);
        }
        return query(args);
      }
    },
  },
});

logger.info('[Database] Secure Prisma Client with Auto-Encryption initialized.');
