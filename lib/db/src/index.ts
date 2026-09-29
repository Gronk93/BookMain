import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

export function getPool(): pg.Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return poolInstance;
}

export function getDb(): NodePgDatabase<typeof schema> | null {
  if (dbInstance) {
    return dbInstance;
  }
  const pool = getPool();
  if (!pool) {
    return null;
  }
  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  const pool = getPool();
  if (!pool) {
    return false;
  }
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return true;
    } finally {
      client.release();
    }
  } catch {
    return false;
  }
}

// Proxy export for db to maintain backward compatibility where db is accessed directly
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const activeDb = getDb();
    if (!activeDb) {
      throw new Error(
        "DATABASE_URL must be set and accessible to query PostgreSQL. Alternatively, use repository fallback.",
      );
    }
    const val = (activeDb as any)[prop];
    if (typeof val === "function") {
      return val.bind(activeDb);
    }
    return val;
  },
});

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    const activePool = getPool();
    if (!activePool) {
      throw new Error("DATABASE_URL must be set and accessible to access pool.");
    }
    const val = (activePool as any)[prop];
    if (typeof val === "function") {
      return val.bind(activePool);
    }
    return val;
  },
});

export * from "./schema";
