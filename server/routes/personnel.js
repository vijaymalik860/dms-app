// server/routes/personnel.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const uploadDir = 'server/uploads/personnel';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, uploadDir); },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${Date.now()}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (['image/jpeg','image/jpg','image/png','image/webp'].includes(file.mimetype)) cb(null, true);
  else cb(new Error('Sirf JPG, PNG, WEBP allowed hain'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

function getPool(req) { return req.app.locals.pool; }

// ── All personnel columns (for reuse) ────────────────────────
const ALL_COLS = [
  'belt_number','pay_code','full_name','father_name','photo_url',
  'date_of_birth','gender','blood_group','mobile_number','alternate_contact',
  'religion','caste','category','aadhar_number','pan',
  'village_town','home_ps','home_district',
  'rank','cadre','service_status','service_book_number','service_type',
  'date_of_enlistment','date_of_last_promotion','retirement_date',
  'graduation_degree','subject_graduation','post_graduation_degree',
  'subject_post_graduation','swat_awt_course','special_course','promotion_type',
  'node_id',
  'state_id','range_id','district_id','unit_type','current_unit_id','current_sub_unit_id',
  'ps_duty_type','company','date_of_posting','r_batch','t_duty_order','remarks',
  'extra_fields',
];

const DATE_COLS = new Set(['date_of_birth','date_of_enlistment','date_of_last_promotion','retirement_date','date_of_posting']);
const INT_COLS  = new Set(['node_id','state_id','range_id','district_id','current_unit_id','current_sub_unit_id']);

// ── GET /api/personnel ────────────────────────────────────────
router.get('/', async (req, res) => {
  const pool = getPool(req);
  const { search, rank, node_id, limit = 100, offset = 0 } = req.query;
  try {
    let conditions = ['p.is_deleted = FALSE'];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.full_name ILIKE $${idx} OR p.belt_number ILIKE $${idx} OR p.pay_code ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (rank)    { conditions.push(`p.rank = $${idx}`);    params.push(rank);    idx++; }
    if (node_id) { conditions.push(`p.node_id = $${idx}`); params.push(node_id); idx++; }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(`
      SELECT p.id, p.belt_number, p.pay_code, p.full_name, p.father_name,
             p.photo_url, p.gender, p.blood_group, p.mobile_number,
             p.rank, p.category, p.caste, p.service_status, p.date_of_enlistment,
             p.date_of_birth, p.retirement_date, p.created_at,
             hn.name AS unit_name, hl.name AS unit_level
      FROM personnel p
      LEFT JOIN hierarchy_nodes hn ON p.node_id = hn.id
      LEFT JOIN hierarchy_levels hl ON hn.level_id = hl.id
      WHERE ${where}
      ORDER BY p.full_name ASC
      LIMIT $${idx} OFFSET $${idx+1}
    `, [...params, limit, offset]);

    const countRes = await pool.query(`SELECT COUNT(*) FROM personnel p WHERE ${where}`, params);
    res.json({ success: true, data: rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    console.error('❌ GET /api/personnel:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/personnel/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  const pool = getPool(req);
  try {
    const { rows } = await pool.query(
      'SELECT p.*, hn.name AS unit_name, hn.code AS unit_code, hl.name AS unit_level FROM personnel p LEFT JOIN hierarchy_nodes hn ON p.node_id = hn.id LEFT JOIN hierarchy_levels hl ON hn.level_id = hl.id WHERE p.id = $1 AND p.is_deleted = FALSE',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Personnel nahi mila' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Helper: build column values from body ─────────────────────
function buildFieldValues(body, photoUrl) {
  const fields = {};
  ALL_COLS.forEach(col => {
    if (col === 'photo_url') { if (photoUrl !== undefined) fields[col] = photoUrl; return; }
    if (col === 'extra_fields') { fields[col] = body.extra_fields || '{}'; return; }
    if (body[col] !== undefined && body[col] !== '') {
      if (INT_COLS.has(col))  { fields[col] = parseInt(body[col]) || null; }
      else if (DATE_COLS.has(col)) { fields[col] = body[col] || null; }
      else { fields[col] = body[col]; }
    } else if (INT_COLS.has(col) || DATE_COLS.has(col)) {
      fields[col] = null;
    }
  });
  return fields;
}

// ── POST /api/personnel/upsert (Bulk Excel Import) ────────────
router.post('/upsert', async (req, res) => {
  const pool = getPool(req);
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0)
    return res.status(400).json({ success: false, error: 'records array required hai' });

  // All importable columns (except photo_url, extra_fields, node_id)
  const UPSERT_COLS = [
    'belt_number','pay_code','full_name','father_name','date_of_birth',
    'gender','blood_group','mobile_number','alternate_contact',
    'religion','caste','category','aadhar_number','pan',
    'village_town','home_ps','home_district',
    'rank','cadre','service_status','service_book_number','service_type',
    'date_of_enlistment','date_of_last_promotion','retirement_date',
    'graduation_degree','subject_graduation','post_graduation_degree',
    'subject_post_graduation','swat_awt_course','special_course','promotion_type',
    'ps_duty_type','company','r_batch','t_duty_order','remarks',
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0, updated = 0, skipped = 0;

    for (const r of records) {
      if (!r.full_name) { skipped++; continue; }

      // Build dynamic values for this record
      const cols = [];
      const vals = [];
      const casts = [];

      UPSERT_COLS.forEach(col => {
        // category → also fill caste
        const val = r[col] !== undefined ? r[col] : (col === 'caste' && r.category ? r.category : null);
        cols.push(col);
        vals.push(val || null);
        casts.push(DATE_COLS.has(col) ? `$${vals.length}::date` : `$${vals.length}`);
      });

      // Default service_status if not provided
      const ssIdx = cols.indexOf('service_status');
      if (ssIdx !== -1 && !vals[ssIdx]) vals[ssIdx] = 'Active';

      const updateSet = cols
        .filter(c => c !== 'pay_code') // don't overwrite conflict key
        .map(c => {
          const i = cols.indexOf(c) + 1;
          return `${c} = EXCLUDED.${c}`;
        })
        .join(', ');

      const result = await client.query(`
        INSERT INTO personnel (${cols.join(',')})
        VALUES (${casts.join(',')})
        ON CONFLICT (pay_code) DO UPDATE SET ${updateSet}, updated_at = NOW()
        RETURNING (xmax = 0) AS is_new
      `, vals);

      if (result.rows[0]?.is_new) inserted++; else updated++;
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Import complete: ${inserted} naye, ${updated} update, ${skipped} skip`,
      inserted, updated, skipped,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Upsert error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally { client.release(); }
});

router.post('/', upload.single('photo'), async (req, res) => {


  const pool = getPool(req);
  if (!req.body.full_name)
    return res.status(400).json({ success: false, error: 'full_name required hai' });

  const photoUrl = req.file ? `uploads/personnel/${req.file.filename}` : null;
  const f = buildFieldValues(req.body, photoUrl);

  // Build dynamic INSERT
  const cols = Object.keys(f);
  const vals = Object.values(f);
  const placeholders = cols.map((_, i) => {
    const col = cols[i];
    if (col === 'extra_fields') return `$${i+1}::jsonb`;
    if (INT_COLS.has(col))     return `$${i+1}::integer`;
    return `$${i+1}`;
  });

  try {
    const { rows } = await pool.query(
      `INSERT INTO personnel (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      vals
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'pay_code pehle se exist karta hai' });
    console.error('❌ POST /api/personnel:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/personnel/:id ────────────────────────────────────
router.put('/:id', upload.single('photo'), async (req, res) => {
  const pool = getPool(req);
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT id, photo_url FROM personnel WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'Personnel nahi mila' });

    let photoUrl = check.rows[0].photo_url;
    if (req.file) {
      if (photoUrl && fs.existsSync(`server/${photoUrl}`)) fs.unlinkSync(`server/${photoUrl}`);
      photoUrl = `uploads/personnel/${req.file.filename}`;
    }

    const f = buildFieldValues(req.body, photoUrl);
    const cols = Object.keys(f);
    const vals = Object.values(f);
    const setClause = cols.map((col, i) => {
      if (col === 'extra_fields') return `${col} = $${i+1}::jsonb`;
      if (INT_COLS.has(col))     return `${col} = $${i+1}::integer`;
      return `${col} = $${i+1}`;
    }).join(', ');

    const { rows } = await pool.query(
      `UPDATE personnel SET ${setClause}, updated_at = NOW() WHERE id = $${cols.length+1} RETURNING *`,
      [...vals, id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ PUT /api/personnel/:id:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/personnel/:id ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  const pool = getPool(req);
  try {
    const { rows } = await pool.query(
      'UPDATE personnel SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 AND is_deleted = FALSE RETURNING id, full_name',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Personnel nahi mila' });
    res.json({ success: true, message: `"${rows[0].full_name}" delete ho gaya` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
