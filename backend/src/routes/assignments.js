const router = require('express').Router();
const db = require('../db');
const { authAdmin } = require('../middleware/auth');

router.post('/', authAdmin, async (req, res) => {
  const { exam_id, staff_id, role } = req.body;
  if (!exam_id || !staff_id) return res.status(400).json({ error: 'Exam and staff are required' });

  try {
    const { rows: conflicts } = await db.query(`
      SELECT ea.id, e.course_code, e.venue, e.faculty_id, f.code AS faculty_code, f.name AS faculty_name
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      JOIN faculties f ON f.id = e.faculty_id
      WHERE ea.staff_id = $1
        AND e.exam_date = (SELECT exam_date FROM exams WHERE id = $2)
        AND e.session_number = (SELECT session_number FROM exams WHERE id = $2)
        AND e.faculty_id != (SELECT faculty_id FROM exams WHERE id = $2)`,
      [staff_id, exam_id]
    );
    if (conflicts.length) {
      const c = conflicts[0];
      return res.status(409).json({
        error: `Already assigned to ${c.course_code} at ${c.venue} (${c.faculty_code}) in this session`,
        conflict: c,
      });
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
    const { rows: [exam] } = await db.query('SELECT exam_date, session_number, course_code, faculty_id FROM exams WHERE id=$1', [exam_id]);
    if (!exam) continue;

    for (const staff_id of staff_ids) {
      const { rows: existing } = await db.query(
        'SELECT 1 FROM exam_assignments WHERE exam_id=$1 AND staff_id=$2', [exam_id, staff_id]);
      if (existing.length) { skipped++; continue; }

      const { rows: conflict } = await db.query(`
        SELECT e.course_code, f.code AS faculty_code FROM exam_assignments ea
        JOIN exams e ON e.id = ea.exam_id
        JOIN faculties f ON f.id = e.faculty_id
        WHERE ea.staff_id=$1 AND e.exam_date=$2 AND e.session_number=$3 AND e.faculty_id!=$4`,
        [staff_id, exam.exam_date, exam.session_number, exam.faculty_id]);
      if (conflict.length) {
        conflicts.push({ staff_id, exam_id, reason: `Already in ${conflict[0].course_code} (${conflict[0].faculty_code})` });
        continue;
      }

      await db.query(
        'INSERT INTO exam_assignments (exam_id, staff_id, role, assigned_by) VALUES ($1,$2,$3,$4)',
        [exam_id, staff_id, 'it_support', req.admin.id]);
      assigned++;
    }
  }
  res.json({ assigned, skipped, conflicts });
});

router.post('/replace', authAdmin, async (req, res) => {
  const { old_staff_id, new_staff_id, assignment_ids } = req.body;
  if (!old_staff_id || !new_staff_id) return res.status(400).json({ error: 'Both staff members required' });
  if (old_staff_id === new_staff_id) return res.status(400).json({ error: 'Cannot replace with the same person' });

  try {
    let filter = 'WHERE ea.staff_id = $1';
    const params = [old_staff_id];
    if (assignment_ids?.length) {
      params.push(assignment_ids);
      filter += ` AND ea.id = ANY($${params.length})`;
    }

    const { rows: assignments } = await db.query(`
      SELECT ea.id, ea.exam_id, e.exam_date, e.session_number, e.course_code, e.faculty_id
      FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id ${filter}
      ORDER BY e.exam_date, e.session_number`, params);

    if (!assignments.length) return res.status(404).json({ error: 'No assignments found for this staff' });

    const { rows: [newStaff] } = await db.query('SELECT id, name FROM staff WHERE id=$1', [new_staff_id]);
    if (!newStaff) return res.status(404).json({ error: 'Replacement staff not found' });

    let replaced = 0, skipped = 0;
    const conflicts = [];

    for (const a of assignments) {
      const { rows: dup } = await db.query(
        'SELECT 1 FROM exam_assignments WHERE exam_id=$1 AND staff_id=$2', [a.exam_id, new_staff_id]);
      if (dup.length) {
        skipped++;
        conflicts.push({ exam: a.course_code, reason: `${newStaff.name} already assigned` });
        continue;
      }

      const { rows: clash } = await db.query(`
        SELECT e.course_code, f.code AS faculty_code FROM exam_assignments ea
        JOIN exams e ON e.id=ea.exam_id JOIN faculties f ON f.id=e.faculty_id
        WHERE ea.staff_id=$1 AND e.exam_date=$2 AND e.session_number=$3 AND e.faculty_id!=$4`,
        [new_staff_id, a.exam_date, a.session_number, a.faculty_id]);
      if (clash.length) {
        skipped++;
        conflicts.push({ exam: a.course_code, reason: `${newStaff.name} busy with ${clash[0].course_code} (${clash[0].faculty_code})` });
        continue;
      }

      await db.query('UPDATE exam_assignments SET staff_id=$1 WHERE id=$2', [new_staff_id, a.id]);
      replaced++;
    }

    res.json({ replaced, skipped, conflicts, total: assignments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

router.delete('/faculty/:facultyId/date/:date', authAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM exam_assignments WHERE exam_id IN (
        SELECT e.id FROM exams e WHERE e.faculty_id = $1 AND e.exam_date = $2
      )`, [req.params.facultyId, req.params.date]
    );
    res.json({ removed: rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-date/:date', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ea.*, s.name AS staff_name, s.staff_code,
        e.course_code, e.course_name, e.exam_date, e.session_number,
        e.start_time, e.end_time, e.venue, e.faculty_id AS exam_faculty_id, f.name AS faculty_name
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

router.get('/it-report', async (req, res) => {
  try {
    // IT staff with exam assignments
    const { rows } = await db.query(`
      SELECT s.id, s.name, s.staff_code, s.phone,
        e.day_name, e.exam_date, e.session_number, e.course_code, e.venue, f.code AS faculty_code
      FROM staff s
      LEFT JOIN exam_assignments ea ON ea.staff_id = s.id
      LEFT JOIN exams e ON e.id = ea.exam_id
      LEFT JOIN faculties f ON f.id = e.faculty_id
      WHERE s.staff_type = 'it_staff'
      ORDER BY s.name, e.exam_date, e.session_number
    `);

    const staffMap = {};
    rows.forEach(r => {
      if (!staffMap[r.id]) {
        staffMap[r.id] = { id: r.id, name: r.name, staff_code: r.staff_code, phone: r.phone, days: {}, faculty_roles: [] };
      }
      if (r.day_name) {
        if (!staffMap[r.id].days[r.day_name]) staffMap[r.id].days[r.day_name] = [];
        staffMap[r.id].days[r.day_name].push({
          session: r.session_number, course_code: r.course_code,
          venue: r.venue, faculty_code: r.faculty_code, exam_date: r.exam_date
        });
      }
    });

    // Faculty-level roles (printing/biometric) — count sessions per day for their faculty
    const { rows: fRoles } = await db.query(`
      SELECT fs.role, fs.staff_id, f.code AS faculty_code, f.id AS faculty_id,
        s.id, s.name, s.staff_code, s.phone
      FROM faculty_staff fs
      JOIN staff s ON s.id = fs.staff_id
      JOIN faculties f ON f.id = fs.faculty_id
    `);

    // Get unique sessions per faculty per day
    const { rows: facSessions } = await db.query(`
      SELECT f.id AS faculty_id, e.day_name, e.session_number
      FROM exams e JOIN faculties f ON f.id = e.faculty_id
      GROUP BY f.id, e.day_name, e.session_number
      ORDER BY e.day_name, e.session_number
    `);

    const facDaySessions = {};
    facSessions.forEach(r => {
      const k = `${r.faculty_id}_${r.day_name}`;
      if (!facDaySessions[k]) facDaySessions[k] = [];
      facDaySessions[k].push(r.session_number);
    });

    fRoles.forEach(fr => {
      if (!staffMap[fr.staff_id]) {
        staffMap[fr.staff_id] = { id: fr.staff_id, name: fr.name, staff_code: fr.staff_code, phone: fr.phone, days: {}, faculty_roles: [] };
      }
      staffMap[fr.staff_id].faculty_roles.push({ role: fr.role, faculty_code: fr.faculty_code });

      // Add every session for their faculty (printing happens every session)
      const days = ['monday','tuesday','wednesday','thursday','friday'];
      days.forEach(day => {
        const sessions = facDaySessions[`${fr.faculty_id}_${day}`] || [];
        if (!staffMap[fr.staff_id].days[day]) staffMap[fr.staff_id].days[day] = [];
        sessions.forEach(sn => {
          const already = staffMap[fr.staff_id].days[day].some(a => a.session === sn && a.faculty_code === fr.faculty_code);
          if (!already) {
            staffMap[fr.staff_id].days[day].push({
              session: sn, course_code: fr.role.toUpperCase(),
              venue: fr.faculty_code, faculty_code: fr.faculty_code
            });
          }
        });
      });
    });

    res.json(Object.values(staffMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty-level staff roles (printing, biometric)
router.get('/faculty-staff', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT fs.id, fs.role, fs.faculty_id,
        f.name AS faculty_name, f.code AS faculty_code,
        s.id AS staff_id, s.name AS staff_name, s.staff_code, s.phone
      FROM faculty_staff fs
      JOIN faculties f ON f.id = fs.faculty_id
      JOIN staff s ON s.id = fs.staff_id
      ORDER BY f.code, fs.role, s.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/faculty-staff', authAdmin, async (req, res) => {
  const { faculty_id, staff_id, role } = req.body;
  if (!faculty_id || !staff_id || !role) return res.status(400).json({ error: 'Faculty, staff, and role are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO faculty_staff (faculty_id, staff_id, role) VALUES ($1,$2,$3) RETURNING *`,
      [faculty_id, staff_id, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already assigned' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/faculty-staff/:id', authAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM faculty_staff WHERE id=$1', [req.params.id]);
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
