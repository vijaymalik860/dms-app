// apply_personnel_migration.js
// Run: node apply_personnel_migration.js
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

const sql = fs.readFileSync(
  path.join(__dirname, 'database', 'personnel_migration.sql'),
  'utf8'
);

console.log('🔄 Running personnel migration...');

try {
  await pool.query(sql);
  console.log('✅ Migration successful! Naye columns add ho gaye.');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
} finally {
  await pool.end();
}
