const router = require('express').Router();
const db = require('../db');

async function getPublishedSessionIds() {
  const { rows } = await db.query("SELECT id FROM examination_sessions WHERE published=true");
  return rows.map(r => r.id);
}

router.get('/info', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT es.id, es.name, es.exam_type, es.semester, es.start_date, es.end_date,
        ay.name AS academic_year
      FROM examination_sessions es
      JOIN academic_years ay ON ay.id = es.academic_year_id
      WHERE es.published = true
      ORDER BY es.created_at DESC`);
    if (!rows.length) return res.json({ published: false, sessions: [] });
    const { rows: dates } = await db.query(`
      SELECT DISTINCT e.exam_date, e.day_name
      FROM exams e WHERE e.session_id = ANY($1)
      ORDER BY e.exam_date`, [rows.map(r => r.id)]);
    res.json({ published: true, sessions: rows, exam_dates: dates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/staff', async (req, res) => {
  const { name, code } = req.query;
  const publishedIds = await getPublishedSessionIds();
  const hasPublished = publishedIds.length > 0;

  if (code) {
    try {
      const { rows } = await db.query(
        'SELECT id, name, staff_code, department, role FROM staff WHERE UPPER(staff_code)=UPPER($1)',
        [code.trim()]
      );
      if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
      const staff = rows[0];
      if (!hasPublished) return res.json({ staff, assignments: [] });

      const { rows: assignments } = await db.query(`
        SELECT ea.role AS assignment_role,
          e.course_code, e.course_name, e.exam_date, e.day_name,
          e.session_number, e.start_time, e.end_time, e.venue, e.student_count, e.exam_type,
          f.name AS faculty_name, f.code AS faculty_code
        FROM exam_assignments ea
        JOIN exams e ON e.id = ea.exam_id
        JOIN faculties f ON f.id = e.faculty_id
        WHERE ea.staff_id = $1 AND e.session_id = ANY($2)
        ORDER BY e.exam_date, e.session_number`, [staff.id, publishedIds]);

      const { rows: fRoles } = await db.query(`
        SELECT fs.role, f.name AS faculty_name, f.code AS faculty_code, f.id AS faculty_id
        FROM faculty_staff fs JOIN faculties f ON f.id=fs.faculty_id
        WHERE fs.staff_id=$1`, [staff.id]);
      if (fRoles.length) {
        for (const fr of fRoles) {
          const { rows: sessions } = await db.query(`
            SELECT e.exam_date, e.day_name, e.session_number, MIN(e.start_time) AS start_time, MAX(e.end_time) AS end_time
            FROM exams e WHERE e.faculty_id=$1 AND e.session_id = ANY($2)
            GROUP BY e.exam_date, e.day_name, e.session_number
            ORDER BY e.exam_date, e.session_number`, [fr.faculty_id, publishedIds]);
          for (const s of sessions) {
            const already = assignments.some(a => a.exam_date === s.exam_date && a.session_number === s.session_number && a.faculty_code === fr.faculty_code);
            if (!already) {
              assignments.push({
                assignment_role: fr.role,
                course_code: fr.role.toUpperCase(),
                course_name: `${fr.faculty_name} — ${fr.role} duty`,
                exam_date: s.exam_date, day_name: s.day_name,
                session_number: s.session_number, start_time: s.start_time, end_time: s.end_time,
                venue: fr.faculty_code, student_count: 0, exam_type: null,
                faculty_name: fr.faculty_name, faculty_code: fr.faculty_code,
              });
            }
          }
        }
        assignments.sort((a, b) => (a.exam_date + a.session_number) > (b.exam_date + b.session_number) ? 1 : -1);
      }

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
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/staff/:id', async (req, res) => {
  try {
    const publishedIds = await getPublishedSessionIds();
    const hasPublished = publishedIds.length > 0;
    const { rows } = await db.query(
      'SELECT id, name, staff_code, department, role, phone FROM staff WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
    const staff = rows[0];
    if (!hasPublished) return res.json({ staff, assignments: [] });

    const { rows: assignments } = await db.query(`
      SELECT ea.role AS assignment_role, e.id AS exam_id,
        e.course_code, e.course_name, e.exam_date, e.day_name,
        e.session_number, e.start_time, e.end_time, e.venue, e.student_count, e.exam_type,
        f.name AS faculty_name, f.code AS faculty_code
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      JOIN faculties f ON f.id = e.faculty_id
      WHERE ea.staff_id = $1 AND e.session_id = ANY($2)
      ORDER BY e.exam_date, e.session_number`, [staff.id, publishedIds]);

    if (assignments.length) {
      const examIds = assignments.map(a => a.exam_id).filter(Boolean);
      if (examIds.length) {
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
    }

    const { rows: fRoles } = await db.query(`
      SELECT fs.role, f.name AS faculty_name, f.code AS faculty_code, f.id AS faculty_id
      FROM faculty_staff fs JOIN faculties f ON f.id=fs.faculty_id
      WHERE fs.staff_id=$1`, [staff.id]);
    if (fRoles.length) {
      for (const fr of fRoles) {
        const { rows: sessions } = await db.query(`
          SELECT e.exam_date, e.day_name, e.session_number, MIN(e.start_time) AS start_time, MAX(e.end_time) AS end_time
          FROM exams e WHERE e.faculty_id=$1 AND e.session_id = ANY($2)
          GROUP BY e.exam_date, e.day_name, e.session_number
          ORDER BY e.exam_date, e.session_number`, [fr.faculty_id, publishedIds]);
        for (const s of sessions) {
          const already = assignments.some(a => a.exam_date === s.exam_date && a.session_number === s.session_number && a.faculty_code === fr.faculty_code);
          if (!already) {
            assignments.push({
              assignment_role: fr.role, exam_id: null,
              course_code: fr.role.toUpperCase(),
              course_name: `${fr.faculty_name} — ${fr.role} duty`,
              exam_date: s.exam_date, day_name: s.day_name,
              session_number: s.session_number, start_time: s.start_time, end_time: s.end_time,
              venue: fr.faculty_code, student_count: 0, exam_type: null,
              faculty_name: fr.faculty_name, faculty_code: fr.faculty_code,
              paired_staff: [],
            });
          }
        }
      }
      assignments.sort((a, b) => (a.exam_date + a.session_number) > (b.exam_date + b.session_number) ? 1 : -1);
    }

    res.json({ staff, assignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/timetable', async (req, res) => {
  const { date, faculty } = req.query;
  const publishedIds = await getPublishedSessionIds();
  if (!publishedIds.length) return res.json([]);

  let sql = `
    SELECT e.course_code, e.course_name, e.examiner, e.year_group,
      e.exam_date, e.day_name, e.session_number, e.start_time, e.end_time,
      e.venue, e.student_count, e.exam_type, f.name AS faculty_name, f.code AS faculty_code,
      (SELECT json_agg(json_build_object('name', s.name, 'staff_code', s.staff_code))
       FROM exam_assignments ea JOIN staff s ON s.id = ea.staff_id WHERE ea.exam_id = e.id) AS assigned_staff
    FROM exams e
    JOIN faculties f ON f.id = e.faculty_id
    WHERE e.session_id = ANY($1)`;
  const params = [publishedIds];
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
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
