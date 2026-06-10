import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dropSql = `
DROP TABLE IF EXISTS hierarchy_nodes CASCADE;
DROP TABLE IF EXISTS hierarchy_levels CASCADE;
DROP VIEW IF EXISTS vw_hierarchy_full;
`;

const createSql = fs.readFileSync('database/neon_setup.sql', 'utf-8');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Connecting to database...');
  try {
    console.log('Dropping old tables...');
    await pool.query(dropSql);
    
    console.log('Running setup script...');
    await pool.query(createSql);
    
    console.log('✅ Database setup successfully applied!');
  } catch (e) {
    console.error('❌ Database error:', e.message);
  } finally {
    await pool.end();
  }
}

run();
