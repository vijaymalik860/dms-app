// ─────────────────────────────────────────────────────────────
// apply_employee_db.js
// Sirf Employee Master & Dropdown tables ko Neon DB mein apply karta hai.
// Hierarchy tables ko TOUCH NAHI karta.
// Run: node apply_employee_db.js
// ─────────────────────────────────────────────────────────────
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const sql = fs.readFileSync('database/employee_dropdown_schema.sql', 'utf-8');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('🔌 Connecting to Neon database...');
  try {
    console.log('📋 Applying Employee Master & Dropdown schema...');
    await pool.query(sql);
    console.log('✅ Schema applied successfully!');
    console.log('   Tables created: master_field_types, master_dropdown_values, personnel');
    console.log('   Views created:  vw_personnel_full');
    console.log('   Seed data:      Rank, Gender, Blood Group, Religion, Caste, Cadre, Service Status');
  } catch (e) {
    console.error('❌ Database error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
