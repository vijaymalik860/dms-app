import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

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
  return 'Police Stations';
}

function normalize(name) {
  return name.toUpperCase()
    .replace(/\s*(DISTRICT|COMMISSIONERATE|COMMISSIONARY|RANGE)\s*$/gi, '')
    .trim();
}

async function run() {
  const { rows: allNodes } = await pool.query(`
    SELECT n.id, n.name, n.parent_id, l.level_order
    FROM hierarchy_nodes n
    JOIN hierarchy_levels l ON n.level_id = l.id
    WHERE n.is_active = TRUE
  `);

  const byLevel = { 1:[], 2:[], 3:[], 4:[], 5:[] };
  allNodes.forEach(n => { if (byLevel[n.level_order]) byLevel[n.level_order].push(n); });

  // Parse CSV
  const csv = fs.readFileSync('unit_hierarchy/police_hierarchy.csv', 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());

  // Build CSV map: range → district → [ps]
  const csvMap = {};
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    let cols = raw.startsWith('"')
      ? raw.split('","').map(s => s.replace(/^"|"$/g, '').trim())
      : raw.split(',').map(s => s.trim());
    if (cols.length < 3 || !cols[2]) continue;
    const [r, d, ps] = cols;
    if (!csvMap[r]) csvMap[r] = {};
    if (!csvMap[r][d]) csvMap[r][d] = [];
    csvMap[r][d].push(ps);
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  HIERARCHY vs CSV — Full Comparison Report');
  console.log('══════════════════════════════════════════════════════════\n');

  let totalMissing = 0;
  let totalExtra   = 0;
  let totalOk      = 0;

  for (const [csvRange, districts] of Object.entries(csvMap)) {
    const normRange = normalize(csvRange);
    const dbRange = byLevel[2].find(r => normalize(r.name) === normRange);

    if (!dbRange) {
      console.log(`❌ RANGE NOT IN DB: "${csvRange}"`);
      continue;
    }

    for (const [csvDist, csvPSList] of Object.entries(districts)) {
      const normDist = normalize(csvDist);
      const distUnderRange = byLevel[3].filter(d => String(d.parent_id) === String(dbRange.id));
      const dbDist = distUnderRange.find(d => normalize(d.name) === normDist);

      if (!dbDist) {
        console.log(`  ❌ DISTRICT NOT IN DB: "${csvDist}" (under ${csvRange})`);
        totalMissing += csvPSList.length;
        continue;
      }

      // Get all sub-units under this district (via units)
      const unitsUnderDist = byLevel[4].filter(u => String(u.parent_id) === String(dbDist.id));
      const dbSubUnits = [];
      unitsUnderDist.forEach(unit => {
        const subs = byLevel[5].filter(s => String(s.parent_id) === String(unit.id));
        subs.forEach(s => dbSubUnits.push(s.name.toUpperCase()));
      });

      // Compare CSV PS list with DB sub-units
      const missingInDB = csvPSList.filter(ps => !dbSubUnits.includes(ps.toUpperCase()));
      const csvUpper    = csvPSList.map(p => p.toUpperCase());
      const extraInDB   = dbSubUnits.filter(ps => !csvUpper.includes(ps));

      if (missingInDB.length === 0 && extraInDB.length === 0) {
        console.log(`  ✅ ${csvRange} → ${csvDist} (${csvPSList.length} PS — all match)`);
        totalOk += csvPSList.length;
      } else {
        console.log(`  ⚠️  ${csvRange} → ${csvDist}`);
        if (missingInDB.length > 0) {
          console.log(`     🔴 Missing in DB (${missingInDB.length}): ${missingInDB.join(', ')}`);
          totalMissing += missingInDB.length;
        }
        if (extraInDB.length > 0) {
          console.log(`     🟡 Extra in DB (not in CSV) (${extraInDB.length}): ${extraInDB.join(', ')}`);
          totalExtra += extraInDB.length;
        }
        totalOk += (csvPSList.length - missingInDB.length);
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  ✅ Matched     : ${totalOk}`);
  console.log(`  🔴 Missing     : ${totalMissing}`);
  console.log(`  🟡 Extra in DB : ${totalExtra}`);
  console.log('══════════════════════════════════════════════════════════\n');

  pool.end();
}

run().catch(e => { console.error(e); pool.end(); });
