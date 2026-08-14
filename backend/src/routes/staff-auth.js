const router = require('express').Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Staff self-service login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await db.query(
      `SELECT s.*, f.name AS faculty_name, f.code AS faculty_code
       FROM staff s LEFT JOIN faculties f ON f.id = s.faculty_id
       WHERE LOWER(s.email) = $1 AND s.password_hash IS NOT NULL`,
      [email.trim().toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
    const staff = rows[0];
    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ staff_id: staff.id, type: 'staff' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        staff_code: staff.staff_code,
        email: staff.email,
        faculty_id: staff.faculty_id,
        faculty_name: staff.faculty_name,
        faculty_code: staff.faculty_code,
        role: staff.role,
        staff_type: staff.staff_type,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Staff self check-in
router.post('/checkin', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'staff') throw new Error('wrong type');
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { staff_type, session_number } = req.body;
  const sn = session_number ?? 0;

  try {
    // Get the active/published session
    const { rows: sessions } = await db.query(
      `SELECT id FROM examination_sessions WHERE published = true ORDER BY id DESC LIMIT 1`
    );
    if (!sessions.length) return res.status(400).json({ error: 'No active exam session' });
    const session_id = sessions[0].id;

    const { rows: staffRows } = await db.query('SELECT * FROM staff WHERE id = $1', [decoded.staff_id]);
    if (!staffRows.length) return res.status(404).json({ error: 'Staff not found' });
    const staff = staffRows[0];

    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await db.query(
      `INSERT INTO attendance (session_id, staff_id, staff_type, faculty_id, attendance_date, present, session_number)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       ON CONFLICT ON CONSTRAINT attendance_unique_session
       DO UPDATE SET present = true
       RETURNING *`,
      [session_id, staff.id, staff_type, staff.faculty_id, today, sn]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
