const router = require('express').Router();
const db = require('../db');
const { authAny } = require('../middleware/auth');

router.get('/alerts', authAny, async (req, res) => {
  const { session_id } = req.query;
  try {
    const alerts = [];

    if (session_id) {
      const { rows: [unassigned] } = await db.query(
        `SELECT COUNT(*)::int AS count FROM exams e
         WHERE e.session_id = $1
           AND NOT EXISTS (SELECT 1 FROM exam_assignments ea WHERE ea.exam_id = e.id)`, [session_id]);
      if (unassigned.count > 0) {
        alerts.push({ type: 'warning', key: 'unassigned', message: `${unassigned.count} exam(s) have no staff assigned`, count: unassigned.count });
      }

      const { rows: [session] } = await db.query('SELECT * FROM examination_sessions WHERE id=$1', [session_id]);
      if (session?.assignments_locked) {
        alerts.push({ type: 'info', key: 'locked', message: 'Assignments are locked for this session' });
      }

      const { rows: attendanceDates } = await db.query(
        `SELECT COUNT(DISTINCT attendance_date)::int AS total,
           COUNT(DISTINCT CASE WHEN NOT verified THEN attendance_date END)::int AS unverified
         FROM attendance WHERE session_id = $1 AND present = true`, [session_id]);
      if (attendanceDates[0]?.unverified > 0) {
        alerts.push({ type: 'warning', key: 'unverified_attendance', message: `${attendanceDates[0].unverified} attendance day(s) have unverified records` });
      }

      const { rows: [examCount] } = await db.query('SELECT COUNT(*)::int AS count FROM exams WHERE session_id=$1', [session_id]);
      const { rows: [reportCount] } = await db.query(
        'SELECT COUNT(DISTINCT br.exam_id)::int AS count FROM biometric_reports br JOIN exams e ON e.id=br.exam_id WHERE e.session_id=$1', [session_id]);
      const missing = examCount.count - reportCount.count;
      if (missing > 0) {
        alerts.push({ type: 'info', key: 'missing_reports', message: `${missing} exam(s) missing biometric reports`, count: missing });
      }
    }

    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Faculty summary for dashboard
router.get('/faculty-summary', authAny, async (req, res) => {
  const { session_id } = req.query;
  const sf = session_id ? ' AND e.session_id = $1' : '';
  const sp = session_id ? [session_id] : [];

  try {
    const { rows } = await db.query(`
      SELECT f.id, f.name, f.code,
        COUNT(DISTINCT e.id)::int AS total_exams,
        COUNT(DISTINCT ea.staff_id)::int AS assigned_staff,
        COUNT(DISTINCT CASE WHEN NOT EXISTS (
          SELECT 1 FROM exam_assignments ea2 WHERE ea2.exam_id = e.id
        ) THEN e.id END)::int AS unassigned_exams,
        COUNT(DISTINCT CASE WHEN br.id IS NOT NULL THEN e.id END)::int AS exams_with_reports
      FROM faculties f
      LEFT JOIN exams e ON e.faculty_id = f.id${sf}
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      LEFT JOIN biometric_reports br ON br.exam_id = e.id
      GROUP BY f.id ORDER BY f.name`, sp);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
