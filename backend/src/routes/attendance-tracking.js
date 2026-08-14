const router = require('express').Router();
const db = require('../db');
const { authAdmin, authEditor, authAny } = require('../middleware/auth');

// Get attendance for a session + date
router.get('/', authAny, async (req, res) => {
  const { session_id, date, faculty_id, staff_type } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  let sql = `
    SELECT a.*, s.name AS staff_name, s.staff_code, s.department,
      f.name AS faculty_name, f.code AS faculty_code,
      adm.name AS verified_by_name
    FROM attendance a
    JOIN staff s ON s.id = a.staff_id
    LEFT JOIN faculties f ON f.id = a.faculty_id
    LEFT JOIN admins adm ON adm.id = a.verified_by
    WHERE a.session_id = $1`;
  const params = [session_id];

  if (date) { params.push(date); sql += ` AND a.attendance_date = $${params.length}`; }
  if (faculty_id) { params.push(faculty_id); sql += ` AND a.faculty_id = $${params.length}`; }
  if (staff_type) { params.push(staff_type); sql += ` AND a.staff_type = $${params.length}`; }

  sql += ' ORDER BY s.name';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance summary for a session (all dates)
router.get('/summary', authAny, async (req, res) => {
  const { session_id, faculty_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  let sql = `
    SELECT a.staff_id, s.name AS staff_name, s.staff_code, s.department, a.staff_type,
      f.code AS faculty_code,
      COUNT(*) FILTER (WHERE a.present) AS days_present,
      COUNT(*) AS total_days,
      json_agg(json_build_object(
        'date', a.attendance_date, 'present', a.present, 'verified', a.verified, 'notes', a.notes
      ) ORDER BY a.attendance_date) AS daily_records
    FROM attendance a
    JOIN staff s ON s.id = a.staff_id
    LEFT JOIN faculties f ON f.id = a.faculty_id
    WHERE a.session_id = $1`;
  const params = [session_id];

  if (faculty_id) {
    params.push(faculty_id);
    sql += ` AND a.faculty_id = $${params.length}`;
  }

  sql += ` GROUP BY a.staff_id, s.name, s.staff_code, s.department, a.staff_type, f.code
    HAVING COUNT(*) FILTER (WHERE a.present) > 0
    ORDER BY s.name`;

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark attendance (single)
router.post('/', authAny, async (req, res) => {
  const { session_id, staff_id, staff_type, faculty_id, attendance_date, present, notes } = req.body;
  if (!session_id || !staff_id || !attendance_date)
    return res.status(400).json({ error: 'session_id, staff_id, and attendance_date are required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO attendance (session_id, staff_id, staff_type, faculty_id, attendance_date, present, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (session_id, staff_id, attendance_date)
       DO UPDATE SET present = $6, notes = $7
       RETURNING *`,
      [session_id, staff_id, staff_type || 'invigilator', faculty_id || null, attendance_date, present !== false, notes || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk mark attendance for a date
router.post('/bulk', authAny, async (req, res) => {
  const { session_id, attendance_date, records } = req.body;
  if (!session_id || !attendance_date || !records?.length)
    return res.status(400).json({ error: 'session_id, attendance_date, and records are required' });

  try {
    let upserted = 0;
    for (const r of records) {
      await db.query(
        `INSERT INTO attendance (session_id, staff_id, staff_type, faculty_id, attendance_date, present, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (session_id, staff_id, attendance_date)
         DO UPDATE SET present = $6, notes = $7`,
        [session_id, r.staff_id, r.staff_type || 'invigilator', r.faculty_id || null, attendance_date, r.present !== false, r.notes || null]
      );
      upserted++;
    }
    res.json({ upserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify attendance records
router.put('/verify', authEditor, async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'ids required' });
  try {
    const { rowCount } = await db.query(
      'UPDATE attendance SET verified = true, verified_by = $1 WHERE id = ANY($2)',
      [req.admin.id, ids]
    );
    res.json({ verified: rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete attendance record
router.delete('/:id', authAny, async (req, res) => {
  try {
    await db.query('DELETE FROM attendance WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dates that have attendance for a session
router.get('/dates', authAny, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  try {
    const { rows } = await db.query(
      `SELECT attendance_date::text AS date, COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE present)::int AS present_count
       FROM attendance WHERE session_id = $1
       GROUP BY attendance_date ORDER BY attendance_date`, [session_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
