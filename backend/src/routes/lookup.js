const router = require('express').Router();
const db = require('../db');

router.get('/staff', async (req, res) => {
  const { name, code } = req.query;

  if (code) {
    try {
      const { rows } = await db.query(
        'SELECT id, name, staff_code, department, role FROM staff WHERE UPPER(staff_code)=UPPER($1)',
        [code.trim()]
      );
      if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
      const staff = rows[0];
      const { rows: assignments } = await db.query(`
        SELECT ea.role AS assignment_role,
          e.course_code, e.course_name, e.exam_date, e.day_name,
          e.session_number, e.start_time, e.end_time, e.venue, e.student_count, e.exam_type,
          f.name AS faculty_name, f.code AS faculty_code
        FROM exam_assignments ea
        JOIN exams e ON e.id = ea.exam_id
        JOIN faculties f ON f.id = e.faculty_id
        WHERE ea.staff_id = $1
        ORDER BY e.exam_date, e.session_number`, [staff.id]);
      return res.json({ staff, assignments });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (!name || name.trim().length < 2)
    return res.status(400).json({ error: 'Enter at least 2 characters' });

  try {
    const { rows } = await db.query(
      `SELECT id, name, staff_code, department, role FROM staff
       WHERE name ILIKE $1 ORDER BY name LIMIT 20`,
      [`%${name.trim()}%`]
    );
    res.json({ results: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/staff/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, staff_code, department, role, phone FROM staff WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
    const staff = rows[0];
    const { rows: assignments } = await db.query(`
      SELECT ea.role AS assignment_role, e.id AS exam_id,
        e.course_code, e.course_name, e.exam_date, e.day_name,
        e.session_number, e.start_time, e.end_time, e.venue, e.student_count, e.exam_type,
        f.name AS faculty_name, f.code AS faculty_code
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      JOIN faculties f ON f.id = e.faculty_id
      WHERE ea.staff_id = $1
      ORDER BY e.exam_date, e.session_number`, [staff.id]);

    if (assignments.length) {
      const examIds = assignments.map(a => a.exam_id);
      const { rows: pairs } = await db.query(`
        SELECT ea.exam_id, s.name, s.staff_code, s.phone, ea.role AS assignment_role, s.staff_type
        FROM exam_assignments ea
        JOIN staff s ON s.id = ea.staff_id
        WHERE ea.exam_id = ANY($1) AND ea.staff_id != $2
        ORDER BY s.name`, [examIds, staff.id]);
      const pairMap = {};
      pairs.forEach(p => {
        if (!pairMap[p.exam_id]) pairMap[p.exam_id] = [];
        pairMap[p.exam_id].push(p);
      });
      assignments.forEach(a => { a.paired_staff = pairMap[a.exam_id] || []; });
    }

    res.json({ staff, assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/timetable', async (req, res) => {
  const { date, faculty } = req.query;
  let sql = `
    SELECT e.course_code, e.course_name, e.examiner, e.year_group,
      e.exam_date, e.day_name, e.session_number, e.start_time, e.end_time,
      e.venue, e.student_count, e.exam_type, f.name AS faculty_name, f.code AS faculty_code,
      (SELECT json_agg(json_build_object('name', s.name, 'staff_code', s.staff_code))
       FROM exam_assignments ea JOIN staff s ON s.id = ea.staff_id WHERE ea.exam_id = e.id) AS assigned_staff
    FROM exams e
    JOIN faculties f ON f.id = e.faculty_id
    WHERE 1=1`;
  const params = [];
  if (date) {
    params.push(date);
    sql += ` AND e.exam_date = $${params.length}`;
  }
  if (faculty) {
    params.push(faculty);
    sql += ` AND (f.code = $${params.length} OR f.id::text = $${params.length})`;
  }
  sql += ' ORDER BY e.exam_date, e.session_number, e.course_code';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
