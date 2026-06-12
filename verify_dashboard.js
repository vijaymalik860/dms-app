import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // Count by level
  const { rows: counts } = await pool.query(`
    SELECT l.level_order, l.name, COUNT(n.id) as count
    FROM hierarchy_levels l
    LEFT JOIN hierarchy_nodes n ON n.level_id = l.id AND n.is_active = TRUE
    GROUP BY l.level_order, l.name
    ORDER BY l.level_order
  `);

  // Total personnel
  const { rows: personnel } = await pool.query(
    'SELECT COUNT(*) FROM personnel WHERE is_deleted = FALSE'
  );

  // Districts count under Haryana
  const { rows: distCheck } = await pool.query(`
    SELECT COUNT(*) FROM hierarchy_nodes n
    JOIN hierarchy_levels l ON n.level_id = l.id
    WHERE l.level_order = 3 AND n.is_active = TRUE
  `);

  console.log('\n══════════════════════════════════════════');
  console.log('  DASHBOARD DATA — DB Verification');
  console.log('══════════════════════════════════════════\n');

  console.log('📊 Hierarchy Counts:');
  counts.forEach(r => {
    console.log(`  Level ${r.level_order} (${r.name.padEnd(12)}): ${r.count}`);
  });

  console.log(`\n👥 Total Personnel : ${personnel[0].count}`);
  console.log(`🗺️  Districts       : ${distCheck[0].count}`);

  console.log('\n══════════════════════════════════════════');
  console.log('  Dashboard dikh raha hai:');
  console.log('  Ranges/Commissionerates : 11');
  console.log('  Districts               : 31');
  console.log('  Units / Police Stations : 76');
  console.log('  Sub-Units / Chowki      : 473');
  console.log('  Total Personnel         : 1');
  console.log('══════════════════════════════════════════\n');

  pool.end();
}

run().catch(e => { console.error(e); pool.end(); });
