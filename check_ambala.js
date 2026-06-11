import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT hn2.name as unit, hn3.name as subunit
    FROM hierarchy_nodes hn1
    JOIN hierarchy_nodes hn2 ON hn2.parent_id = hn1.id
    LEFT JOIN hierarchy_nodes hn3 ON hn3.parent_id = hn2.id
    WHERE hn1.name = 'Ambala District'
    ORDER BY hn2.name, hn3.name
  `);
  console.log(res.rows);
  pool.end();
}
run();
