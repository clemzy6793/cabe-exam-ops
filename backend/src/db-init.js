require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function init() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Schema created successfully');

  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
  await pool.query(
    `INSERT INTO admins (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'superadmin')
     ON CONFLICT (email) DO NOTHING`,
    [process.env.ADMIN_NAME || 'Super Admin', process.env.ADMIN_EMAIL || 'admin@cabe.knust.edu.gh', hash]
  );
  console.log('Admin account ready');

  await pool.query(`INSERT INTO faculties (name, code) VALUES
    ('Faculty of Built Environment', 'FOBE'),
    ('Faculty of Art', 'Art'),
    ('Faculty of Educational Studies', 'Education')
    ON CONFLICT (name) DO NOTHING`);
  console.log('Faculties seeded');

  await pool.end();
}

init().catch(e => { console.error(e); process.exit(1); });
