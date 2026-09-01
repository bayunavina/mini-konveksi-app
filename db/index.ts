import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

function createDb() {
  const pool = globalForDb.pool ?? createPool();
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.pool = pool;
  }
  return drizzle(pool, { schema });
}

export const db = createDb();
