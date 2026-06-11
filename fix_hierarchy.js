import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixHierarchy() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Step 1: Fix Level Names ─────────────────────────────────
    console.log('\n📝 Step 1: Fixing level names...');
    await client.query("UPDATE hierarchy_levels SET name='Units' WHERE level_order=4");
    await client.query("UPDATE hierarchy_levels SET name='Sub-Units' WHERE level_order=5");

    const chowki = await client.query("SELECT id FROM hierarchy_levels WHERE level_order=6");
    if (chowki.rows.length === 0) {
      await client.query("INSERT INTO hierarchy_levels (name, level_order, color) VALUES ('Chowki', 6, '#f0abfc')");
      console.log('  ✅ Chowki added as level 6');
    }
    console.log('  ✅ Level 4 → "Units", Level 5 → "Sub-Units"');

    // ── Step 2: Find Duplicate Districts ───────────────────────
    console.log('\n🔍 Step 2: Finding duplicate districts...');

    const { rows: districts } = await client.query(`
      SELECT n.id, n.name, n.parent_id,
             COUNT(c.id) as child_count
      FROM hierarchy_nodes n
      LEFT JOIN hierarchy_nodes c ON c.parent_id = n.id
      WHERE n.level_id = (SELECT id FROM hierarchy_levels WHERE level_order=3)
      GROUP BY n.id, n.name, n.parent_id
      ORDER BY n.parent_id, COUNT(c.id) DESC
    `);

    // Group by parent_id
    const byParent = {};
    districts.forEach(d => {
      const key = String(d.parent_id);
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(d);
    });

    const toDelete = [];
    for (const dists of Object.values(byParent)) {
      if (dists.length <= 1) continue;
      for (let i = 0; i < dists.length; i++) {
        for (let j = i + 1; j < dists.length; j++) {
          const a = dists[i].name.toLowerCase().replace(/\s*district\s*/gi, '').trim();
          const b = dists[j].name.toLowerCase().replace(/\s*district\s*/gi, '').trim();
          if (a === b) {
            // dists sorted by child_count DESC — keep [i] (more children), delete [j]
            console.log(`  Duplicate: "${dists[i].name}"(${dists[i].child_count} kids) vs "${dists[j].name}"(${dists[j].child_count} kids) → deleting "${dists[j].name}"`);
            toDelete.push(Number(dists[j].id));
          }
        }
      }
    }

    if (toDelete.length > 0) {
      await client.query('DELETE FROM hierarchy_nodes WHERE id = ANY($1)', [toDelete]);
      console.log(`  ✅ Deleted ${toDelete.length} duplicate district(s) with CASCADE`);
    } else {
      // Fallback: delete known old seed codes
      console.log('  ℹ️ No name-match duplicates found. Removing old seed codes...');
      const oldCodes = ['HR-AMB-DIST','HR-KRK-DIST','HR-YNR-DIST','HR-PKL-DIST',
                        'HR-ROH-DIST','HR-JJR-DIST','HR-SNP-DIST',
                        'HR-AMB-PS-01','HR-AMB-PS-02','HR-AMB-PS-03','HR-AMB-PS-04',
                        'HR-KRK-PS-01','HR-KRK-PS-02','HR-KRK-PS-03',
                        'HR-AMB-PS-01-CK-01','HR-AMB-PS-01-CK-02','HR-AMB-PS-01-CK-03',
                        'HR-KRK-PS-01-CK-01','HR-KRK-PS-01-CK-02'];
      for (const code of oldCodes) {
        const r = await client.query('DELETE FROM hierarchy_nodes WHERE code=$1 RETURNING name', [code]);
        if (r.rows.length) console.log(`    🗑️ Deleted: ${r.rows[0].name} (${code})`);
      }
    }

    // ── Step 3: Final Count ─────────────────────────────────────
    const { rows: count } = await client.query('SELECT COUNT(*) FROM hierarchy_nodes');
    console.log(`\n📊 Final node count: ${count[0].count}`);

    await client.query('COMMIT');
    console.log('\n✅ Hierarchy fix completed successfully!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Fix failed, rolled back:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

fixHierarchy();
