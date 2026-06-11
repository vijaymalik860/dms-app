import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const toDelete = ['PS Ambala Cantt', 'PS Ambala City', 'PS Baldev Nagar', 'PS Mullana'];

pool.query('DELETE FROM hierarchy_nodes WHERE name = ANY($1) RETURNING name', [toDelete])
  .then(r => {
    console.log('✅ Deleted:');
    r.rows.forEach(x => console.log('  🗑️ ', x.name));
    pool.end();
  })
  .catch(e => { console.error('❌', e.message); pool.end(); });
