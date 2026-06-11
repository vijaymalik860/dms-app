// ─────────────────────────────────────────────────────────────
// server/routes/dropdowns.js
// Dropdown Master API Routes
// GET    /api/dropdowns          - Fetch all field types + their values
// POST   /api/dropdowns/values   - Add a new dropdown value
// PUT    /api/dropdowns/values/:id - Update a dropdown value
// DELETE /api/dropdowns/values/:id - Soft delete (is_active = false)
// ─────────────────────────────────────────────────────────────
import express from 'express';

const router = express.Router();

// Inject pool via middleware (set in index.js)
function getPool(req) {
  return req.app.locals.pool;
}

// ── GET /api/dropdowns ─────────────────────────────────────────
// Sabhi active field types + unke values ek saath fetch karo
router.get('/', async (req, res) => {
  const pool = getPool(req);
  try {
    // Fetch all active field types
    const typesRes = await pool.query(`
      SELECT id, field_name, display_name, personnel_field_name, helper_example, is_active
      FROM master_field_types
      WHERE is_active = TRUE
      ORDER BY display_name ASC
    `);

    // Fetch all active values grouped by field_type_id
    const valuesRes = await pool.query(`
      SELECT id, field_type_id, value, display_order, is_active
      FROM master_dropdown_values
      WHERE is_active = TRUE
      ORDER BY field_type_id, display_order ASC, value ASC
    `);

    // Map values to their parent field types
    const valuesMap = {};
    valuesRes.rows.forEach(v => {
      if (!valuesMap[v.field_type_id]) valuesMap[v.field_type_id] = [];
      valuesMap[v.field_type_id].push(v);
    });

    const result = typesRes.rows.map(ft => ({
      ...ft,
      values: valuesMap[ft.id] || []
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ GET /api/dropdowns:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/dropdowns/values ────────────────────────────────
// Ek nayi dropdown value add karo
// Body: { field_type_id, value, display_order }
router.post('/values', async (req, res) => {
  const pool = getPool(req);
  const { field_type_id, value, display_order = 0 } = req.body;

  if (!field_type_id || !value) {
    return res.status(400).json({ success: false, error: 'field_type_id aur value required hain' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO master_dropdown_values (field_type_id, value, display_order)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [field_type_id, value.trim(), display_order]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    // Duplicate entry handle karo
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Yeh value pehle se exist karti hai' });
    }
    console.error('❌ POST /api/dropdowns/values:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/dropdowns/values/:id ────────────────────────────
// Existing dropdown value update karo
// Body: { value, display_order, is_active }
router.put('/values/:id', async (req, res) => {
  const pool = getPool(req);
  const { id } = req.params;
  const { value, display_order, is_active } = req.body;

  if (!value) {
    return res.status(400).json({ success: false, error: 'value required hai' });
  }

  try {
    const { rows } = await pool.query(`
      UPDATE master_dropdown_values
      SET value = $1,
          display_order = COALESCE($2, display_order),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [value.trim(), display_order, is_active, id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Dropdown value nahi mili' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ PUT /api/dropdowns/values/:id:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/dropdowns/values/:id ─────────────────────────
// Soft delete: is_active = false
router.delete('/values/:id', async (req, res) => {
  const pool = getPool(req);
  const { id } = req.params;

  try {
    const { rows } = await pool.query(`
      UPDATE master_dropdown_values
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, value
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Dropdown value nahi mili' });
    }
    res.json({ success: true, message: `"${rows[0].value}" delete ho gayi`, data: rows[0] });
  } catch (err) {
    console.error('❌ DELETE /api/dropdowns/values/:id:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/dropdowns/field-types ──────────────────────────
// Naya field type (tab) add karo
// Body: { field_name, display_name }
router.post('/field-types', async (req, res) => {
  const pool = getPool(req);
  const { field_name, display_name } = req.body;

  if (!field_name || !display_name) {
    return res.status(400).json({ success: false, error: 'field_name aur display_name required hain' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO master_field_types (field_name, display_name, is_active)
      VALUES ($1, $2, TRUE)
      RETURNING *
    `, [field_name.trim(), display_name.trim()]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Yeh tab pehle se exist karta hai' });
    }
    console.error('❌ POST /api/dropdowns/field-types:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

