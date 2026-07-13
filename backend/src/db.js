require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const noSsl = process.env.PGSSL === 'disable';

// Prefer individual PG* vars over a connection URL to avoid @ in password breaking URL parsing
const pool = process.env.PGHOST
  ? new Pool({
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE,
      ssl: noSsl ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: noSsl ? false : { rejectUnauthorized: false },
    });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
