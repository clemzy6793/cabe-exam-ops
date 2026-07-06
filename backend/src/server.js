require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());

(async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
    await db.query(
      `INSERT INTO admins (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'superadmin')
       ON CONFLICT (email) DO NOTHING`,
      [process.env.ADMIN_NAME || 'Super Admin', process.env.ADMIN_EMAIL || 'admin@cabe.knust.edu.gh', hash]
    );
    await db.query(`INSERT INTO faculties (name, code) VALUES
      ('Faculty of Built Environment', 'FOBE'),
      ('Faculty of Art', 'Art'),
      ('Faculty of Educational Studies', 'Education')
      ON CONFLICT (name) DO NOTHING`);
    console.log('DB schema ready');
  } catch (e) {
    console.error('DB init error:', e.message);
  }
})();

app.use('/api/auth', require('./routes/auth'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/lookup', require('./routes/lookup'));
app.use('/api/reports', require('./routes/reports'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Exam Ops API running on port ${PORT}`));
