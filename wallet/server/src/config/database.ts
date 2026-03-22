import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

// Fix: Cast pool to any to bridge the @types/pg version mismatch
const adapter = new PrismaPg(pool as any);
export const prisma = new PrismaClient({ adapter });
