const router = require('express').Router();
const db = require('../db');
const { authAdmin } = require('../middleware/auth');

router.get('/calculate', authAdmin, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    const { rows: [session] } = await db.query(
      `SELECT es.*, ay.name AS academic_year
       FROM examination_sessions es
       JOIN academic_years ay ON ay.id = es.academic_year_id
       WHERE es.id = $1`, [session_id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { rows: rates } = await db.query('SELECT * FROM payment_rates');
    const rateMap = {};
    rates.forEach(r => {
      const key = `${r.staff_type}:${r.grade}:${r.exam_type}`;
      rateMap[key] = r;
    });

    const getRate = (staffType, grade, examType) => {
      return rateMap[`${staffType}:${grade || 'default'}:${examType || 'mid_semester'}`]
        || rateMap[`${staffType}:default:${examType || 'mid_semester'}`]
        || rateMap[`${staffType}:default:mid_semester`]
        || null;
    };

    const results = [];
    const totals = { gross: 0, byType: {}, byFaculty: {} };

    // --- Exam-based staff (invigilators, IT, biometric) ---
    const { rows: examCheckins } = await db.query(`
      SELECT ec.staff_id,
        COUNT(*) FILTER (WHERE ec.checked_in AND ec.verified) AS verified_sessions,
        COUNT(*) FILTER (WHERE ec.checked_in) AS sessions_present,
        COUNT(*) AS total_assigned
      FROM exam_checkins ec
      WHERE ec.session_id = $1
      GROUP BY ec.staff_id`, [session_id]);

    for (const ec of examCheckins) {
      const { rows: [staff] } = await db.query(`
        SELECT s.id, s.name, s.staff_code, s.department, s.staff_type, s.category,
          s.bank_name, s.bank_branch, s.account_number, s.account_type,
          f.code AS faculty_code, f.name AS faculty_name
        FROM staff s LEFT JOIN faculties f ON f.id = s.faculty_id
        WHERE s.id = $1`, [ec.staff_id]);
      if (!staff) continue;

      const assignRole = staff.staff_type === 'it_staff' ? 'it_staff' : 'invigilator';
      const rate = getRate(assignRole, staff.category, session.exam_type);
      const sessionRate = rate?.hourly_rate || 0;
      const gross = parseFloat(sessionRate) * parseInt(ec.verified_sessions);

      results.push({
        staff_id: ec.staff_id,
        name: staff.name,
        staff_code: staff.staff_code,
        department: staff.department,
        staff_type: assignRole,
        check_in_type: 'exam',
        faculty_code: staff.faculty_code,
        faculty_name: staff.faculty_name,
        bank_name: staff.bank_name,
        bank_branch: staff.bank_branch,
        account_number: staff.account_number,
        account_type: staff.account_type,
        daily_rate: parseFloat(sessionRate),
        verified_days: parseInt(ec.verified_sessions),
        days_present: parseInt(ec.sessions_present),
        total_days: parseInt(ec.total_assigned),
        gross,
      });

      totals.gross += gross;
      if (!totals.byType[assignRole]) totals.byType[assignRole] = { count: 0, gross: 0 };
      totals.byType[assignRole].count++;
      totals.byType[assignRole].gross += gross;
      const fc = staff.faculty_code || 'Unassigned';
      if (!totals.byFaculty[fc]) totals.byFaculty[fc] = { count: 0, gross: 0 };
      totals.byFaculty[fc].count++;
      totals.byFaculty[fc].gross += gross;
    }

    // --- Daily support staff (office, accounts, registrar, etc.) ---
    const { rows: attendanceSummary } = await db.query(`
      SELECT a.staff_id, a.staff_type, a.faculty_id,
        COUNT(CASE WHEN a.present AND a.verified THEN 1 END)::int AS verified_days,
        COUNT(CASE WHEN a.present THEN 1 END)::int AS days_present,
        COUNT(*)::int AS total_days
      FROM attendance a
      WHERE a.session_id = $1
      GROUP BY a.staff_id, a.staff_type, a.faculty_id`, [session_id]);

    const examStaffIds = new Set(examCheckins.map(e => e.staff_id));

    for (const att of attendanceSummary) {
      if (examStaffIds.has(att.staff_id)) continue;

      const { rows: [staff] } = await db.query(`
        SELECT s.id, s.name, s.staff_code, s.department, s.staff_type, s.category,
          s.bank_name, s.bank_branch, s.account_number, s.account_type,
          f.code AS faculty_code, f.name AS faculty_name
        FROM staff s LEFT JOIN faculties f ON f.id = s.faculty_id
        WHERE s.id = $1`, [att.staff_id]);
      if (!staff) continue;

      const rate = getRate(att.staff_type, staff.category, session.exam_type);
      const dailyRate = rate?.daily_rate || rate?.hourly_rate || 0;
      const gross = parseFloat(dailyRate) * att.verified_days;

      results.push({
        staff_id: att.staff_id,
        name: staff.name,
        staff_code: staff.staff_code,
        department: staff.department,
        staff_type: att.staff_type,
        check_in_type: 'daily',
        faculty_code: staff.faculty_code,
        faculty_name: staff.faculty_name,
        bank_name: staff.bank_name,
        bank_branch: staff.bank_branch,
        account_number: staff.account_number,
        account_type: staff.account_type,
        daily_rate: parseFloat(dailyRate),
        verified_days: att.verified_days,
        days_present: att.days_present,
        total_days: att.total_days,
        gross,
      });

      totals.gross += gross;
      if (!totals.byType[att.staff_type]) totals.byType[att.staff_type] = { count: 0, gross: 0 };
      totals.byType[att.staff_type].count++;
      totals.byType[att.staff_type].gross += gross;
      const fc = staff.faculty_code || 'Unassigned';
      if (!totals.byFaculty[fc]) totals.byFaculty[fc] = { count: 0, gross: 0 };
      totals.byFaculty[fc].count++;
      totals.byFaculty[fc].gross += gross;
    }

    results.sort((a, b) => a.staff_type.localeCompare(b.staff_type) || a.name.localeCompare(b.name));

    res.json({ session, staff: results, totals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
