require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const db = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5003;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5176',
  credentials: true
}));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, slow down' }
});
app.use('/api', apiLimiter);

(async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await db.query(
      `INSERT INTO admins (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'superadmin')
       ON CONFLICT (email) DO NOTHING`,
      [process.env.ADMIN_NAME, process.env.ADMIN_EMAIL, hash]
    );
    await db.query(`INSERT INTO faculties (name, code) VALUES
      ('Faculty of Built Environment', 'FOBE'),
      ('Faculty of Art', 'Art'),
      ('Faculty of Educational Studies', 'Education')
      ON CONFLICT (name) DO NOTHING`);

    const { rows: facs } = await db.query('SELECT id, code FROM faculties');
    const facMap = {};
    facs.forEach(f => { facMap[f.code] = f.id; });
    const { rows: existingVenues } = await db.query('SELECT COUNT(*) FROM venues');
    if (parseInt(existingVenues[0].count) === 0) {
      const venues = [
        ['New Blk GF', 130, 'FOBE'], ['New Blk FF', 135, 'FOBE'], ['New Blk Bsmt', 90, 'FOBE'],
        ['TB - GF', 100, 'FOBE'], ['TB - FF', 160, 'FOBE'], ['TB - SF', 170, 'FOBE'], ['TB - TF', 150, 'FOBE'],
        ['BT Workshop', 90, 'FOBE'], ['LE Hall', 100, 'FOBE'], ['M Arc Studio', 70, 'FOBE'], ['DEPP Classroom', 70, 'FOBE'],
        ['BT Postgraduate rm', 50, 'FOBE'],
        ['GF1', 100, 'Art'], ['GF2', 100, 'Art'], ['GF3', 100, 'Art'], ['GF4', 100, 'Art'], ['GFW', 100, 'Art'],
        ['FF2', 100, 'Art'], ['FF3', 100, 'Art'], ['FF4', 100, 'Art'], ['FF5', 100, 'Art'], ['FFW', 100, 'Art'],
        ['PUB', 150, 'Education'], ['LRM1', 50, 'Education'], ['LRM2', 50, 'Education'],
        ['LRM3', 50, 'Education'], ['LRM4', 50, 'Education'],
        ['NCB GF LH1', 100, null], ['NCB GF LH2', 100, null], ['NCB GF LH3', 100, null],
        ['NCB FF LH1', 100, null], ['NCB FF LH3', 180, null],
        ['NCB TF EXH 1', 220, null], ['NCB TF EXH 2', 100, null],
        ['NCB FF EXH', 250, null], ['NCB FF DR', 15, null], ['NCB SF DR', 15, null],
        ['KNUST Library', 50, null],
      ];
      for (const [name, cap, fCode] of venues) {
        await db.query('INSERT INTO venues (name, capacity, faculty_id) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
          [name, cap, fCode ? facMap[fCode] : null]);
      }
      console.log('Venues seeded');
    }
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
app.use('/api/venues', require('./routes/venues'));
app.use('/api/timetable-upload', require('./routes/timetable-upload'));

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
