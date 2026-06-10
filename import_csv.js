import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function getUnitCategory(psName) {
  const upper = psName.toUpperCase();
  if (upper.includes('TRAFFIC')) return 'Traffic';
  if (upper.includes('STF') || upper.includes('CYBER') || upper.includes('HSENB') || 
      upper.includes('NARCOTICS') || upper.includes('CRIME') || upper.includes('GRP') || 
      upper.includes('SPECIAL') || upper.includes('CORRUPTION') || upper.includes('ENFORCEMENT')) {
    return 'Special Staffs';
  }
  if (upper.includes('COURT')) return 'Court';
  if (upper.includes('TRAINING') || upper.includes('TEMP') || upper.includes('MADHUBAN')) return 'Temp_Dep_Trg';
  if (upper.includes('ADMIN') || upper.includes('HQ')) return 'Administrative Units';
  if (upper.includes('SECURITY') || upper.includes('GUARD')) return 'Security';
  
  return 'Police Stations'; // Default fallback
}

async function run() {
  console.log('Connecting to Neon DB...');
  
  // 1. Fetch levels map
  const { rows: levelRows } = await pool.query('SELECT id, level_order FROM hierarchy_levels ORDER BY level_order');
  const levelMap = {};
  levelRows.forEach(r => levelMap[r.level_order] = r.id);
  
  const STATE_LVL = levelMap[1];
  const RANGE_LVL = levelMap[2];
  const DIST_LVL = levelMap[3];
  const UNIT_LVL = levelMap[4];
  const SUBUNIT_LVL = levelMap[5];
  
  // 2. Get State
  let stateNode;
  const stateRes = await pool.query("SELECT id FROM hierarchy_nodes WHERE level_id = $1 AND name = 'Haryana'", [STATE_LVL]);
  if (stateRes.rows.length > 0) {
    stateNode = stateRes.rows[0].id;
  } else {
    const res = await pool.query("INSERT INTO hierarchy_nodes (name, code, level_id) VALUES ('Haryana', 'HR-STATE', $1) RETURNING id", [STATE_LVL]);
    stateNode = res.rows[0].id;
  }

  // 3. Node cache
  const nodeCache = {}; 
  let counter = 0;
  
  async function getOrCreateNode(name, levelId, parentId) {
    const key = `${levelId}|${name}|${parentId}`;
    if (nodeCache[key]) return nodeCache[key];
    
    const res = await pool.query("SELECT id FROM hierarchy_nodes WHERE name = $1 AND parent_id = $2 AND level_id = $3", [name, parentId, levelId]);
    if (res.rows.length > 0) {
      nodeCache[key] = res.rows[0].id;
      return res.rows[0].id;
    }
    
    counter++;
    const code = `CSV-${Date.now()}-${counter}`;
    const iRes = await pool.query(
      "INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES ($1, $2, $3, $4) RETURNING id", 
      [name, code, levelId, parentId]
    );
    nodeCache[key] = iRes.rows[0].id;
    return iRes.rows[0].id;
  }
  
  // 4. Read CSV
  const csvContent = fs.readFileSync('unit_hierarchy/police_hierarchy.csv', 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim() !== '');
  
  console.log(`Found ${lines.length - 1} data records to import...`);
  
  let inserted = 0;
  // skip header
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    let cols;
    if (rawLine.startsWith('"')) {
      cols = rawLine.split('","').map(s => s.replace(/^"|"$/g, '').trim());
    } else {
      cols = rawLine.split(',').map(s => s.trim());
    }
    
    if (cols.length < 3) continue;

    const rangeName = cols[0];
    const distName = cols[1];
    const psName = cols[2];
    
    // Create hierarchy path
    const rangeId = await getOrCreateNode(rangeName, RANGE_LVL, stateNode);
    const distId = await getOrCreateNode(distName, DIST_LVL, rangeId);
    
    // Auto-categorize unit based on name
    const unitCategory = getUnitCategory(psName);
    const unitId = await getOrCreateNode(unitCategory, UNIT_LVL, distId);
    
    // Insert actual Sub-Unit
    await getOrCreateNode(psName, SUBUNIT_LVL, unitId);
    
    inserted++;
    if (inserted % 50 === 0) console.log(`Mapped & Imported ${inserted} records...`);
  }
  
  console.log(`✅ Import completed! Total records mapped & imported: ${inserted}`);
  await pool.end();
}

run().catch(e => {
  console.error('Import failed:', e);
  pool.end();
});
