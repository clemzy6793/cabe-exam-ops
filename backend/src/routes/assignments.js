const router = require('express').Router();
const db = require('../db');
const { authAdmin } = require('../middleware/auth');

router.post('/', authAdmin, async (req, res) => {
  const { exam_id, staff_id, role } = req.body;
  if (!exam_id || !staff_id) return res.status(400).json({ error: 'Exam and staff are required' });

  try {
    const { rows: [staffRow] } = await db.query('SELECT staff_type FROM staff WHERE id=$1', [staff_id]);
    const isItStaff = staffRow?.staff_type === 'it_staff';

    if (!isItStaff) {
      const { rows: conflicts } = await db.query(`
        SELECT ea.id, e.course_code, e.start_time, e.end_time
        FROM exam_assignments ea
        JOIN exams e ON e.id = ea.exam_id
        WHERE ea.staff_id = $1
          AND e.exam_date = (SELECT exam_date FROM exams WHERE id = $2)
          AND e.session_number = (SELECT session_number FROM exams WHERE id = $2)`,
        [staff_id, exam_id]
      );
      if (conflicts.length) {
        return res.status(409).json({
          error: `Staff already assigned to ${conflicts[0].course_code} in this session`,
          conflict: conflicts[0],
        });
      }
    }

    const { rows } = await db.query(
      `INSERT INTO exam_assignments (exam_id, staff_id, role, assigned_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [exam_id, staff_id, role || 'invigilator', req.admin.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already assigned' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', authAdmin, async (req, res) => {
  const { staff_ids, exam_ids } = req.body;
  if (!staff_ids?.length || !exam_ids?.length)
    return res.status(400).json({ error: 'Staff and exams are required' });

  let assigned = 0, skipped = 0, conflicts = [];
  for (const exam_id of exam_ids) {
    const { rows: [exam] } = await db.query('SELECT exam_date, session_number, course_code FROM exams WHERE id=$1', [exam_id]);
    if (!exam) continue;

    for (const staff_id of staff_ids) {
      const { rows: existing } = await db.query(
        'SELECT 1 FROM exam_assignments WHERE exam_id=$1 AND staff_id=$2', [exam_id, staff_id]);
      if (existing.length) { skipped++; continue; }

      const { rows: [staffRow] } = await db.query('SELECT staff_type FROM staff WHERE id=$1', [staff_id]);
      const isItStaff = staffRow?.staff_type === 'it_staff';

      if (!isItStaff) {
        const { rows: conflict } = await db.query(`
          SELECT e.course_code FROM exam_assignments ea
          JOIN exams e ON e.id = ea.exam_id
          WHERE ea.staff_id=$1 AND e.exam_date=$2 AND e.session_number=$3`,
          [staff_id, exam.exam_date, exam.session_number]);
        if (conflict.length) {
          conflicts.push({ staff_id, exam_id, reason: `Already in ${conflict[0].course_code}` });
          continue;
        }
      }

      await db.query(
        'INSERT INTO exam_assignments (exam_id, staff_id, role, assigned_by) VALUES ($1,$2,$3,$4)',
        [exam_id, staff_id, 'it_support', req.admin.id]);
      assigned++;
    }
  }
  res.json({ assigned, skipped, conflicts });
});

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM exam_assignments WHERE id=$1', [req.params.id]);
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/exam/:examId/all', authAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM exam_assignments WHERE exam_id=$1', [req.params.examId]);
    res.json({ message: `Removed ${rowCount} assignment(s)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-date/:date', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ea.*, s.name AS staff_name, s.staff_code,
        e.course_code, e.course_name, e.exam_date, e.session_number,
        e.start_time, e.end_time, e.venue, f.name AS faculty_name
      FROM exam_assignments ea
      JOIN staff s ON s.id = ea.staff_id
      JOIN exams e ON e.id = ea.exam_id
      JOIN faculties f ON f.id = e.faculty_id
      WHERE e.exam_date = $1
      ORDER BY e.session_number, s.name`, [req.params.date]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unassigned', async (req, res) => {
  const { date } = req.query;
  let sql = `
    SELECT e.*, f.name AS faculty_name,
      (SELECT COUNT(*)::int FROM exam_assignments ea WHERE ea.exam_id = e.id) AS staff_count
    FROM exams e
    JOIN faculties f ON f.id = e.faculty_id
    WHERE NOT EXISTS (SELECT 1 FROM exam_assignments ea WHERE ea.exam_id = e.id)`;
  const params = [];
  if (date) {
    params.push(date);
    sql += ` AND e.exam_date = $${params.length}`;
  }
  sql += ' ORDER BY e.exam_date, e.session_number';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
