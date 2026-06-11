// sync_police_stations.js
// Safely syncs Sub-Units (Police Stations) from CSV into existing DB hierarchy
// Rules:
//   - NEVER deletes anything
//   - NEVER modifies existing nodes
//   - Only INSERTs missing Sub-Units (and Units/Districts if not found)
//   - Uses fuzzy name matching to find existing Districts in DB

import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ── Categorize PS name into a Unit group ─────────────────────────
function getUnitCategory(psName) {
  const u = psName.toUpperCase();
  if (u.includes('TRAFFIC'))                                                    return 'Traffic';
  if (u.includes('STF') || u.includes('CYBER') || u.includes('HSENB') ||
      u.includes('NARCOTICS') || u.includes('CRIME') || u.includes('GRP') ||
      u.includes('SPECIAL') || u.includes('CORRUPTION') || u.includes('ENFORCEMENT') ||
      u.includes('HSNCB') || u.includes('TRANSPORT') || u.includes('ANTI CORRUPTION') ||
      u.includes('STATE CRIME'))                                                return 'Special Staffs';
  if (u.includes('COURT'))                                                      return 'Court';
  if (u.includes('TRAINING') || u.includes('TEMP') || u.includes('MADHUBAN')) return 'Temp_Dep_Trg';
  if (u.includes('ADMIN') || u.includes('HQ'))                                 return 'Administrative Units';
  if (u.includes('SECURITY') || u.includes('GUARD'))                           return 'Security';
  if (u.includes('WOMEN'))                                                      return 'Police Stations';
  return 'Police Stations';
}

// ── Normalize name for fuzzy matching ────────────────────────────
// Strips suffixes like "District", "Range", "Commissionerate", "Commissionary"
function normalize(name) {
  return name
    .toUpperCase()
    .replace(/\s*(DISTRICT|COMMISSIONERATE|COMMISSIONARY|RANGE)\s*$/gi, '')
    .trim();
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Fetch level IDs ─────────────────────────────────────────
    const { rows: lvls } = await client.query(
      'SELECT id, level_order FROM hierarchy_levels ORDER BY level_order'
    );
    const levelId = {};
    lvls.forEach(r => { levelId[r.level_order] = r.id; });

    const STATE_LVL   = levelId[1];
    const RANGE_LVL   = levelId[2];
    const DIST_LVL    = levelId[3];
    const UNIT_LVL    = levelId[4];
    const SUBUNIT_LVL = levelId[5];

    // ── Fetch State node ────────────────────────────────────────
    const { rows: states } = await client.query(
      'SELECT id FROM hierarchy_nodes WHERE level_id=$1 LIMIT 1', [STATE_LVL]
    );
    const stateId = states[0].id;

    // ── Load all existing nodes into memory ─────────────────────
    const { rows: allNodes } = await client.query(`
      SELECT n.id, n.name, n.parent_id, l.level_order
      FROM hierarchy_nodes n
      JOIN hierarchy_levels l ON n.level_id = l.id
      WHERE n.is_active = TRUE
    `);

    // Separate by level for fast lookup
    const byLevel = { 2: [], 3: [], 4: [], 5: [] };
    allNodes.forEach(n => { if (byLevel[n.level_order]) byLevel[n.level_order].push(n); });

    // ── Helper: find or create a node ───────────────────────────
    async function getOrCreate(name, lvlId, parentId, levelOrder) {
      // Try exact case-insensitive match
      const found = byLevel[levelOrder]?.find(n =>
        n.name.trim().toUpperCase() === name.trim().toUpperCase() &&
        String(n.parent_id) === String(parentId)
      );
      if (found) return found.id;

      // Not found — create it
      const code = `SYNC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const { rows } = await client.query(
        'INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, code, lvlId, parentId]
      );
      const newId = rows[0].id;
      // Add to in-memory cache so same-batch duplicates are caught
      byLevel[levelOrder].push({ id: newId, name, parent_id: parentId, level_order: levelOrder });
      return newId;
    }

    // ── Parse CSV ───────────────────────────────────────────────
    const csv = fs.readFileSync('unit_hierarchy/police_hierarchy.csv', 'utf-8');
    const lines = csv.split('\n').filter(l => l.trim());

    let created = 0, skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i].trim();
      let cols;
      if (raw.startsWith('"')) {
        cols = raw.split('","').map(s => s.replace(/^"|"$/g, '').trim());
      } else {
        cols = raw.split(',').map(s => s.trim());
      }
      if (cols.length < 3 || !cols[2]) continue;

      const [csvRange, csvDist, csvPS] = cols;

      // ── 1. Find/Create Range ──────────────────────────────────
      const normRange = normalize(csvRange);
      let rangeNode = byLevel[2].find(r => normalize(r.name) === normRange);
      let rangeId;
      if (rangeNode) {
        rangeId = rangeNode.id;
      } else {
        rangeId = await getOrCreate(csvRange, RANGE_LVL, stateId, 2);
        console.log(`  ➕ Range created: "${csvRange}"`);
      }

      // ── 2. Find/Create District ───────────────────────────────
      const normDist = normalize(csvDist);
      const distUnderRange = byLevel[3].filter(d => String(d.parent_id) === String(rangeId));
      let distNode = distUnderRange.find(d => normalize(d.name) === normDist);
      let distId;
      if (distNode) {
        distId = distNode.id;
      } else {
        distId = await getOrCreate(csvDist, DIST_LVL, rangeId, 3);
        console.log(`    ➕ District created: "${csvDist}"`);
      }

      // ── 3. Find/Create Unit Category ─────────────────────────
      const unitCat = getUnitCategory(csvPS);
      const unitsUnderDist = byLevel[4].filter(u => String(u.parent_id) === String(distId));
      let unitNode = unitsUnderDist.find(u => u.name.trim().toUpperCase() === unitCat.toUpperCase());
      let unitId;
      if (unitNode) {
        unitId = unitNode.id;
      } else {
        unitId = await getOrCreate(unitCat, UNIT_LVL, distId, 4);
        console.log(`      ➕ Unit created: "${unitCat}" under "${csvDist}"`);
      }

      // ── 4. Find/Create Sub-Unit (actual PS name) ──────────────
      const subsUnderUnit = byLevel[5].filter(s => String(s.parent_id) === String(unitId));
      const alreadyExists = subsUnderUnit.find(s => s.name.trim().toUpperCase() === csvPS.trim().toUpperCase());
      if (alreadyExists) {
        skipped++;
      } else {
        await getOrCreate(csvPS, SUBUNIT_LVL, unitId, 5);
        created++;
      }
    }

    // ── Final count ─────────────────────────────────────────────
    const { rows: cnt } = await client.query('SELECT COUNT(*) FROM hierarchy_nodes');

    await client.query('COMMIT');

    console.log('\n══════════════════════════════════════════');
    console.log(`✅  Sync Complete!`);
    console.log(`   New Sub-Units inserted : ${created}`);
    console.log(`   Already existed (skip) : ${skipped}`);
    console.log(`   Total DB nodes now     : ${cnt[0].count}`);
    console.log('══════════════════════════════════════════\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Sync failed, rolled back:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
