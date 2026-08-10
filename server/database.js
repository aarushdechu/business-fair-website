import pg from 'pg';
import { databaseUrl, isProduction } from './config.js';

const { Pool } = pg;

export const pool = databaseUrl
  ? new Pool({
      connectionString:databaseUrl,
      ssl:isProduction ? { rejectUnauthorized:false } : false
    })
  : null;

export function requireDatabase(res) {
  if (pool) return true;
  res.status(503).json({ error:'Order tracking is not configured yet.' });
  return false;
}

export async function initializeDatabase() {
  if (!pool) {
    console.warn('DATABASE_URL is missing. Static site works, but order APIs are disabled.');
    return;
  }

  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS order_number_seq START 101;
    CREATE TABLE IF NOT EXISTS orders (
      id text PRIMARY KEY,
      number integer UNIQUE NOT NULL DEFAULT nextval('order_number_seq'),
      customer_name varchar(80) NOT NULL,
      customer_email varchar(180),
      items jsonb NOT NULL,
      notes text NOT NULL DEFAULT '',
      status varchar(20) NOT NULL CHECK (status IN ('received','drawing','ready','picked-up')),
      tracking_code varchar(30) UNIQUE NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);
}
