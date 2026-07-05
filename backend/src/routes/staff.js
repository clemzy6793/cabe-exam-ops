const router = require('express').Router();
const db = require('../db');
const { authAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { search, faculty_id, staff_type } = req.query;
  let sql = `
    SELECT s.*, f.name AS faculty_name, f.code AS faculty_code,
      (SELECT COUNT(*)::int FROM exam_assignments ea WHERE ea.staff_id = s.id) AS assignment_count
    FROM staff s
    LEFT JOIN faculties f ON f.id = s.faculty_id
    WHERE 1=1`;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (s.name ILIKE $${params.length} OR s.staff_code ILIKE $${params.length} OR s.email ILIKE $${params.length})`;
  }
  if (faculty_id) {
    params.push(faculty_id);
    sql += ` AND s.faculty_id = $${params.length}`;
  }
  if (staff_type) {
    params.push(staff_type);
    sql += ` AND s.staff_type = $${params.length}`;
  }
  sql += ' ORDER BY s.name';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, f.name AS faculty_name
      FROM staff s LEFT JOIN faculties f ON f.id = s.faculty_id
      WHERE s.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const { rows: assignments } = await db.query(`
      SELECT ea.*, e.course_code, e.course_name, e.exam_date, e.day_name,
        e.session_number, e.start_time, e.end_time, e.venue,
        f.name AS faculty_name
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      JOIN faculties f ON f.id = e.faculty_id
      WHERE ea.staff_id = $1
      ORDER BY e.exam_date, e.session_number`, [req.params.id]);

    res.json({ ...rows[0], assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authAdmin, async (req, res) => {
  const { name, email, phone, department, faculty_id, role } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const { rows: maxCode } = await db.query(
      "SELECT staff_code FROM staff WHERE staff_code LIKE 'CABE%' ORDER BY staff_code DESC LIMIT 1"
    );
    let nextNum = 1000;
    if (maxCode.length) {
      const num = parseInt(maxCode[0].staff_code.replace('CABE', ''));
      nextNum = num + 1;
    }
    const staffCode = `CABE${String(nextNum).padStart(4, '0')}`;

    const staff_type = req.body.staff_type || 'lecturer';
    const { rows } = await db.query(
      `INSERT INTO staff (name, staff_code, email, phone, department, faculty_id, role, staff_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, staffCode, email, phone, department, faculty_id, role || 'invigilator', staff_type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authAdmin, async (req, res) => {
  const { name, email, phone, department, faculty_id, role, staff_type } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE staff SET name=$1, email=$2, phone=$3, department=$4, faculty_id=$5, role=$6, staff_type=$7
       WHERE id=$8 RETURNING *`,
      [name, email, phone, department, faculty_id, role, staff_type || 'lecturer', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM staff WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
