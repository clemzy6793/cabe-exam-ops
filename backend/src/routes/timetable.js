const router = require('express').Router();
const db = require('../db');
const { authAdmin, authEditor } = require('../middleware/auth');

router.get('/exams', async (req, res) => {
  const { date, faculty_id, session, search } = req.query;
  let sql = `
    SELECT e.*, f.name AS faculty_name, f.code AS faculty_code,
      (SELECT json_agg(json_build_object('id', ea.id, 'staff_id', s.id, 'name', s.name, 'staff_code', s.staff_code, 'role', ea.role))
       FROM exam_assignments ea JOIN staff s ON s.id = ea.staff_id WHERE ea.exam_id = e.id) AS assigned_staff
    FROM exams e
    JOIN faculties f ON f.id = e.faculty_id
    WHERE 1=1`;
  const params = [];

  if (date) {
    params.push(date);
    sql += ` AND e.exam_date = $${params.length}`;
  }
  if (faculty_id) {
    params.push(faculty_id);
    sql += ` AND e.faculty_id = $${params.length}`;
  }
  if (session) {
    params.push(session);
    sql += ` AND e.session_number = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (e.course_code ILIKE $${params.length} OR e.course_name ILIKE $${params.length} OR e.examiner ILIKE $${params.length})`;
  }

  sql += ' ORDER BY e.exam_date, e.session_number, e.course_code';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/exams/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.*, f.name AS faculty_name, f.code AS faculty_code
      FROM exams e JOIN faculties f ON f.id = e.faculty_id
      WHERE e.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const { rows: assignments } = await db.query(`
      SELECT ea.*, s.name AS staff_name, s.staff_code, s.phone, s.email AS staff_email
      FROM exam_assignments ea JOIN staff s ON s.id = ea.staff_id
      WHERE ea.exam_id = $1`, [req.params.id]);

    res.json({ ...rows[0], assignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/exams', authEditor, async (req, res) => {
  const { faculty_id, course_code, course_name, examiner, year_group,
    exam_date, day_name, session_number, start_time, end_time,
    venue, student_count, exam_type, notes } = req.body;

  if (!course_code || !exam_date || !session_number)
    return res.status(400).json({ error: 'Course code, date, and session are required' });

  try {
    const { rows: periods } = await db.query('SELECT id FROM exam_periods WHERE is_active=true LIMIT 1');
    const periodId = periods[0]?.id || 1;

    const { rows } = await db.query(
      `INSERT INTO exams (period_id, faculty_id, course_code, course_name, examiner,
        year_group, exam_date, day_name, session_number, start_time, end_time,
        venue, student_count, exam_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [periodId, faculty_id, course_code, course_name, examiner,
       year_group, exam_date, day_name, session_number, start_time, end_time,
       venue, student_count || 0, exam_type || 'written', notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/exams/:id', authEditor, async (req, res) => {
  const { course_code, course_name, examiner, year_group,
    exam_date, day_name, session_number, start_time, end_time,
    venue, student_count, exam_type, notes, faculty_id } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE exams SET course_code=$1, course_name=$2, examiner=$3, year_group=$4,
        exam_date=$5, day_name=$6, session_number=$7, start_time=$8, end_time=$9,
        venue=$10, student_count=$11, exam_type=$12, notes=$13, faculty_id=$14
       WHERE id=$15 RETURNING *`,
      [course_code, course_name, examiner, year_group,
       exam_date, day_name, session_number, start_time, end_time,
       venue, student_count, exam_type, notes, faculty_id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/exams/:id', authEditor, async (req, res) => {
  try {
    await db.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/faculties', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM faculties ORDER BY name');
  res.json(rows);
});

router.get('/periods', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM exam_periods ORDER BY start_date DESC');
  res.json(rows);
});

router.get('/stats', async (req, res) => {
  try {
    const [exams, staff, venues, assignments, byDay, byFaculty, unassigned, byType, recentActivity] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM exams'),
      db.query('SELECT COUNT(*)::int AS count FROM staff'),
      db.query('SELECT COUNT(*)::int AS count FROM venues'),
      db.query('SELECT COUNT(*)::int AS count FROM exam_assignments'),
      db.query(`SELECT exam_date, day_name, COUNT(*)::int AS count
                FROM exams GROUP BY exam_date, day_name ORDER BY exam_date`),
      db.query(`SELECT f.name, f.code, COUNT(e.id)::int AS count
                FROM faculties f LEFT JOIN exams e ON e.faculty_id=f.id
                GROUP BY f.id ORDER BY f.name`),
      db.query(`SELECT COUNT(*)::int AS count FROM exams e
                WHERE NOT EXISTS (SELECT 1 FROM exam_assignments ea WHERE ea.exam_id=e.id)`),
      db.query(`SELECT exam_type, COUNT(*)::int AS count FROM exams GROUP BY exam_type ORDER BY count DESC`),
      db.query(`SELECT al.action, al.details, al.created_at, a.name AS admin_name
                FROM activity_log al LEFT JOIN admins a ON a.id=al.admin_id
                ORDER BY al.created_at DESC LIMIT 8`),
    ]);
    const assignedStaff = await db.query('SELECT COUNT(DISTINCT staff_id)::int AS count FROM exam_assignments');

    const reportStats = await db.query(`
      SELECT f.code AS faculty_code, e.exam_date::text, e.session_number,
        COUNT(DISTINCT e.id)::int AS total_exams,
        COUNT(DISTINCT CASE WHEN br.id IS NOT NULL THEN e.id END)::int AS uploaded
      FROM exams e
      JOIN faculties f ON f.id = e.faculty_id
      LEFT JOIN biometric_reports br ON br.exam_id = e.id
      GROUP BY f.code, e.exam_date, e.session_number
      ORDER BY e.exam_date, e.session_number, f.code`);

    const totalReports = await db.query('SELECT COUNT(*)::int AS count FROM biometric_reports');
    const examsWithReports = await db.query('SELECT COUNT(DISTINCT exam_id)::int AS count FROM biometric_reports');

    res.json({
      total_exams: exams.rows[0].count,
      total_staff: staff.rows[0].count,
      total_venues: venues.rows[0].count,
      total_assignments: assignments.rows[0].count,
      unassigned_exams: unassigned.rows[0].count,
      assigned_staff: assignedStaff.rows[0].count,
      by_day: byDay.rows,
      by_faculty: byFaculty.rows,
      by_type: byType.rows,
      recent_activity: recentActivity.rows,
      report_stats: reportStats.rows,
      total_reports: totalReports.rows[0].count,
      exams_with_reports: examsWithReports.rows[0].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/merge', authAdmin, async (req, res) => {
  const { primary_id, merge_ids } = req.body;
  if (!primary_id || !merge_ids?.length) return res.status(400).json({ error: 'primary_id and merge_ids required' });

  try {
    const allIds = [primary_id, ...merge_ids];
    const { rows: exams } = await db.query('SELECT * FROM exams WHERE id = ANY($1)', [allIds]);
    const primary = exams.find(e => e.id === primary_id);
    if (!primary) return res.status(404).json({ error: 'Primary exam not found' });
    const others = exams.filter(e => e.id !== primary_id);
    if (!others.length) return res.status(400).json({ error: 'No exams to merge' });

    const codes = [primary.course_code, ...others.map(e => e.course_code)];
    const mergedCode = [...new Set(codes)].join(' / ');
    const names = [primary.course_name, ...others.map(e => e.course_name)].filter(Boolean);
    const mergedName = [...new Set(names)].join(' / ');
    const totalStudents = exams.reduce((s, e) => s + (e.student_count || 0), 0);

    await db.query(
      'UPDATE exams SET course_code=$1, course_name=$2, student_count=$3 WHERE id=$4',
      [mergedCode, mergedName, totalStudents, primary_id]);

    for (const other of others) {
      await db.query(
        `UPDATE exam_assignments SET exam_id=$1 WHERE exam_id=$2
         AND staff_id NOT IN (SELECT staff_id FROM exam_assignments WHERE exam_id=$1)`,
        [primary_id, other.id]);
      await db.query('DELETE FROM exam_assignments WHERE exam_id=$1', [other.id]);
      await db.query(
        'UPDATE biometric_reports SET exam_id=$1 WHERE exam_id=$2',
        [primary_id, other.id]);
      await db.query('DELETE FROM exams WHERE id=$1', [other.id]);
    }

    res.json({ message: `Merged ${others.length} exam(s) into ${mergedCode}`, merged_code: mergedCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
