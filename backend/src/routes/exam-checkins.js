const router = require('express').Router();
const db = require('../db');
const { authAdmin, authAny } = require('../middleware/auth');

// Get exams for a date with assigned staff and check-in status
router.get('/by-date', authAny, async (req, res) => {
  const { session_id, date, faculty_id } = req.query;
  if (!session_id || !date) return res.status(400).json({ error: 'session_id and date required' });

  let sql = `
    SELECT e.id, e.course_code, e.course_name, e.venue, e.day_name,
      e.session_number, e.exam_date, e.student_count, e.exam_type,
      f.id AS faculty_id, f.code AS faculty_code
    FROM exams e
    JOIN faculties f ON f.id = e.faculty_id
    WHERE e.session_id = $1 AND e.exam_date = $2`;
  const params = [session_id, date];

  if (faculty_id) {
    params.push(faculty_id);
    sql += ` AND f.id = $${params.length}`;
  }
  sql += ' ORDER BY f.code, e.session_number, e.course_code';

  try {
    const { rows: exams } = await db.query(sql, params);

    for (const exam of exams) {
      const { rows: assigned } = await db.query(`
        SELECT ea.id AS assignment_id, s.id AS staff_id, s.name, s.staff_code, s.phone, ea.role,
          ec.id AS checkin_id, COALESCE(ec.checked_in, false) AS checked_in,
          COALESCE(ec.verified, false) AS verified, ec.notes AS checkin_notes
        FROM exam_assignments ea
        JOIN staff s ON s.id = ea.staff_id
        LEFT JOIN exam_checkins ec ON ec.exam_id = ea.exam_id AND ec.staff_id = ea.staff_id
        WHERE ea.exam_id = $1
        ORDER BY ea.role, s.name`, [exam.id]);
      const { rows: extra } = await db.query(`
        SELECT NULL AS assignment_id, s.id AS staff_id, s.name, s.staff_code, s.phone, 'system_analyst' AS role,
          ec.id AS checkin_id, ec.checked_in, COALESCE(ec.verified, false) AS verified, ec.notes AS checkin_notes
        FROM exam_checkins ec
        JOIN staff s ON s.id = ec.staff_id
        WHERE ec.exam_id = $1 AND ec.staff_id NOT IN (SELECT staff_id FROM exam_assignments WHERE exam_id = $1)
        ORDER BY s.name`, [exam.id]);
      exam.staff = [...assigned, ...extra];
    }

    res.json(exams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check in / toggle check-in for a staff member at an exam
router.post('/', authAny, async (req, res) => {
  const { session_id, exam_id, staff_id, checked_in, notes } = req.body;
  if (!session_id || !exam_id || !staff_id)
    return res.status(400).json({ error: 'session_id, exam_id, and staff_id required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO exam_checkins (session_id, exam_id, staff_id, checked_in, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (exam_id, staff_id)
       DO UPDATE SET checked_in = $4, notes = $5
       RETURNING *`,
      [session_id, exam_id, staff_id, checked_in !== false, notes || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk check-in all assigned staff for an exam
router.post('/bulk', authAny, async (req, res) => {
  const { session_id, exam_id, staff_ids } = req.body;
  if (!session_id || !exam_id || !staff_ids?.length)
    return res.status(400).json({ error: 'session_id, exam_id, and staff_ids required' });

  try {
    let count = 0;
    for (const sid of staff_ids) {
      await db.query(
        `INSERT INTO exam_checkins (session_id, exam_id, staff_id, checked_in)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (exam_id, staff_id)
         DO UPDATE SET checked_in = true`,
        [session_id, exam_id, sid]
      );
      count++;
    }
    res.json({ checked_in: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify check-in records
router.put("/verify", authAny, async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'ids required' });
  try {
    const { rowCount } = await db.query(
      'UPDATE exam_checkins SET verified = true, verified_by = $1 WHERE id = ANY($2)',
      [req.admin.id, ids]
    );
    res.json({ verified: rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Summary: count of sessions each staff member checked in for
router.get('/summary', authAny, async (req, res) => {
  const { session_id, faculty_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  let sql = `
    SELECT ec.staff_id, s.name AS staff_name, s.staff_code, s.department,
      CASE
        WHEN MAX(ea.role) IS NULL THEN 'system_analyst'
        WHEN MAX(ea.role) = 'it_support' THEN 'it_support'
        WHEN s.category LIKE 'senior_member%' THEN MAX(ea.role) || '_sm'
        ELSE MAX(ea.role) || '_ss'
      END AS staff_type,
      s.category, f.code AS faculty_code,
      COUNT(*) FILTER (WHERE ec.checked_in) AS sessions_checked_in,
      COUNT(*) FILTER (WHERE ec.checked_in AND ec.verified) AS sessions_verified,
      COUNT(*) AS total_assigned
    FROM exam_checkins ec
    JOIN staff s ON s.id = ec.staff_id
    LEFT JOIN exam_assignments ea ON ea.exam_id = ec.exam_id AND ea.staff_id = ec.staff_id
    LEFT JOIN faculties f ON f.id = s.faculty_id
    WHERE ec.session_id = $1`;
  const params = [session_id];

  if (faculty_id) {
    params.push(faculty_id);
    sql += ` AND s.faculty_id = $${params.length}`;
  }

  sql += ` GROUP BY ec.staff_id, s.name, s.staff_code, s.department, s.category, f.code
           ORDER BY s.name`;

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get exam dates that have exams for a session
router.get('/dates', authAny, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  try {
    const { rows } = await db.query(`
      SELECT e.exam_date::text AS date, e.day_name,
        COUNT(DISTINCT e.id)::int AS exam_count,
        COUNT(DISTINCT ea.staff_id)::int AS staff_count
      FROM exams e
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      WHERE e.session_id = $1
      GROUP BY e.exam_date, e.day_name
      ORDER BY e.exam_date`, [session_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invigilation report from system check-in data (replaces Excel upload)
router.get('/invigilation-report', authAny, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    // Session metadata
    const { rows: [sessionMeta] } = await db.query(
      `SELECT es.*, ay.name AS academic_year
       FROM examination_sessions es
       JOIN academic_years ay ON ay.id = es.academic_year_id
       WHERE es.id = $1`, [session_id]);

    // Get exam dates for day columns
    const { rows: examDates } = await db.query(`
      SELECT exam_date::text AS date, MIN(day_name) AS day_name
      FROM exams WHERE session_id = $1
      GROUP BY exam_date
      ORDER BY exam_date`, [session_id]);

    const days = examDates.map(r => {
      const d = new Date(r.date + 'T12:00:00');
      return {
        key: r.date,
        label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      };
    });

    // Faculties list for filter
    const { rows: faculties } = await db.query('SELECT id, name, code FROM faculties ORDER BY name');

    // Invigilators: checked in, grouped by exam's faculty (same staff can appear in multiple faculties)
    const { rows: invRows } = await db.query(`
      SELECT s.id, s.staff_code, s.name, s.department, s.category,
        TO_CHAR(e.exam_date, 'YYYY-MM-DD') AS exam_date,
        f.code AS faculty_code, f.name AS faculty_name
      FROM exam_checkins ec
      JOIN staff s ON s.id = ec.staff_id
      JOIN exams e ON e.id = ec.exam_id
      JOIN faculties f ON f.id = e.faculty_id
      JOIN exam_assignments ea ON ea.exam_id = ec.exam_id AND ea.staff_id = ec.staff_id
      WHERE ec.session_id = $1 AND ec.checked_in = true AND ea.role = 'invigilator'
      ORDER BY s.name, e.exam_date`, [session_id]);

    const invMap = {};
    invRows.forEach(r => {
      const key = `${r.id}_${r.faculty_code}`;
      if (!invMap[key]) {
        invMap[key] = {
          staffId: r.staff_code,
          fullName: r.name,
          department: r.department || '',
          designation: '',
          staffType: r.category?.startsWith('senior_member') ? 'Senior Member' : 'Senior Staff',
          faculty_code: r.faculty_code,
          faculty_name: r.faculty_name,
          breakdown: {},
        };
      }
      invMap[key].breakdown[r.exam_date] = (invMap[key].breakdown[r.exam_date] || 0) + 1;
    });

    // Office staff: anyone checked in via attendance who isn't IT/systems staff
    const { rows: offRows } = await db.query(`
      SELECT s.id, s.staff_code, s.name, s.department, s.category,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS att_date,
        f.code AS faculty_code, f.name AS faculty_name
      FROM attendance a
      JOIN staff s ON s.id = a.staff_id
      LEFT JOIN faculties f ON f.id = a.faculty_id
      WHERE a.session_id = $1 AND a.present = true
        AND a.staff_type NOT IN ('system_analyst', 'it_support', 'it_staff')
      ORDER BY s.name, a.attendance_date`, [session_id]);

    const offMap = {};
    offRows.forEach(r => {
      const key = `${r.id}_${r.faculty_code || 'general'}`;
      if (!offMap[key]) {
        offMap[key] = {
          staffId: r.staff_code,
          fullName: r.name,
          department: r.department || '',
          designation: '',
          staffType: r.category?.startsWith('senior_member') ? 'Senior Member' : 'Senior Staff',
          faculty_code: r.faculty_code || 'general',
          faculty_name: r.faculty_name || 'General / Central',
          breakdown: {},
        };
      }
      offMap[key].breakdown[r.att_date] = (offMap[key].breakdown[r.att_date] || 0) + 1;
    });

    // Office days from attendance records
    const { rows: attDates } = await db.query(`
      SELECT TO_CHAR(attendance_date, 'YYYY-MM-DD') AS date
      FROM attendance WHERE session_id = $1
        AND staff_type NOT IN ('system_analyst', 'it_support', 'it_staff')
      GROUP BY attendance_date ORDER BY attendance_date`, [session_id]);

    const officeDays = attDates.map(r => {
      const d = new Date(r.date + 'T12:00:00');
      return {
        key: r.date,
        label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      };
    });

    res.json({
      session: sessionMeta,
      invigilators: Object.values(invMap),
      officeStaff: Object.values(offMap),
      days,
      officeDays,
      faculties,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
