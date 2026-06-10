import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test DB connection
pool.connect()
  .then(() => console.log('✅ PostgreSQL connected → dms_app'))
  .catch(err => console.error('❌ DB connection failed:', err.message));

// ─────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────

// GET /api/hierarchy  — full tree as JSON
app.get('/api/hierarchy', async (req, res) => {
  try {
    // Fetch all nodes with level info
    const { rows } = await pool.query(`
      SELECT
        n.id, n.name, n.parent_id,
        l.name  AS level,
        l.level_order
      FROM hierarchy_nodes n
      JOIN hierarchy_levels l ON n.level_id = l.id
      WHERE n.is_active = TRUE
      ORDER BY l.level_order, n.name
    `);

    // Build tree from flat list
    const map = {};
    rows.forEach(r => {
      map[r.id] = { id: String(r.id), name: r.name, level: r.level, children: [] };
    });

    let root = null;
    rows.forEach(r => {
      if (r.parent_id === null) {
        root = map[r.id];
      } else if (map[r.parent_id]) {
        map[r.parent_id].children.push(map[r.id]);
      }
    });

    res.json({ success: true, data: root });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/hierarchy/nodes  — flat list
app.get('/api/hierarchy/nodes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vw_hierarchy_full');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/hierarchy/nodes  — add new node
app.post('/api/hierarchy/nodes', async (req, res) => {
  const { name, parent_id } = req.body;
  if (!name || !parent_id) return res.status(400).json({ success: false, error: 'name and parent_id required' });

  try {
    // Get parent's level to determine child level
    const parentRes = await pool.query(
      'SELECT l.level_order FROM hierarchy_nodes n JOIN hierarchy_levels l ON n.level_id = l.id WHERE n.id = $1',
      [parent_id]
    );
    if (!parentRes.rows.length) return res.status(404).json({ success: false, error: 'Parent not found' });

    const childLevelOrder = parentRes.rows[0].level_order + 1;
    const levelRes = await pool.query('SELECT id FROM hierarchy_levels WHERE level_order = $1', [childLevelOrder]);
    if (!levelRes.rows.length) return res.status(400).json({ success: false, error: 'Cannot add child to this level' });

    const childLevelId = levelRes.rows[0].id;
    const code = `NODE-${Date.now()}`;

    const { rows } = await pool.query(
      'INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code, childLevelId, parent_id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/hierarchy/nodes/:id  — update node name
app.put('/api/hierarchy/nodes/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });

  try {
    const { rows } = await pool.query(
      'UPDATE hierarchy_nodes SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Node not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/hierarchy/nodes/:id  — delete node + children (CASCADE)
app.delete('/api/hierarchy/nodes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Prevent deleting root (State level)
    const check = await pool.query(
      'SELECT l.level_order FROM hierarchy_nodes n JOIN hierarchy_levels l ON n.level_id = l.id WHERE n.id = $1',
      [id]
    );
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    if (check.rows[0].level_order === 1) return res.status(403).json({ success: false, error: 'Cannot delete root State node' });

    await pool.query('DELETE FROM hierarchy_nodes WHERE id = $1', [id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 DMS API Server running → http://localhost:${PORT}`);
    console.log(`   GET  /api/hierarchy`);
    console.log(`   POST /api/hierarchy/nodes`);
    console.log(`   PUT  /api/hierarchy/nodes/:id`);
    console.log(`   DEL  /api/hierarchy/nodes/:id`);
  });
}

export default app;
