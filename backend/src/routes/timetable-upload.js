const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');
const { authAny, authAdmin } = require('../middleware/auth');
const { parseFile, applyDateMap, detectVenueClashes, validateVenues, buildDateMap, SESSION_TIMES } = require('../lib/smart-parser');

const ALLOWED_EXTS = /\.(xlsx?|pdf|docx?)$/i;
const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXTS.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, Word, or Excel files allowed'));
  },
});

router.get('/template/:facultyId', authAny, async (req, res) => {
  try {
    const fid = parseInt(req.params.facultyId);
    const { rows: [fac] } = await db.query('SELECT id, name, code FROM faculties WHERE id=$1', [fid]);
    if (!fac) return res.status(404).json({ error: 'Faculty not found' });

    const { rows: venues } = await db.query(
      'SELECT name, capacity FROM venues WHERE faculty_id=$1 OR faculty_id IS NULL ORDER BY faculty_id NULLS LAST, name', [fid]);

    const headers = ['Day', 'Session', 'Course Code', 'Course Name', 'Venue', 'Students', 'Exam Type'];
    const example = [
      ['Monday', 1, 'CM 164', 'Soils and Foundation System', venues[0]?.name || 'Venue Name', 130, 'Written'],
      ['Monday', 2, 'SP 258', 'Housing Policy and Strategy', 'NCB TF EXH 1', 130, 'CBE'],
    ];

    const wb = XLSX.utils.book_new();
    const wsData = [headers, ...example];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Timetable');

    const venueData = [['Venue', 'Capacity', 'Type']];
    venues.forEach(v => {
      venueData.push([v.name, v.capacity, v.faculty_id ? 'Faculty' : 'Shared']);
    });
    const wsVenues = XLSX.utils.aoa_to_sheet(venueData);
    wsVenues['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsVenues, 'Available Venues');

    const refData = [
      ['Field', 'Valid Values'],
      ['Day', 'Monday, Tuesday, Wednesday, Thursday, Friday'],
      ['Session', '1, 2, 3, 4, 5, 6'],
      ['Exam Type', 'Written, CBE, BYOD'],
      ['', ''],
      ['Session Times', ''],
      ['Session 1', '8:15 - 9:15 AM'],
      ['Session 2', '10:00 - 11:00 AM'],
      ['Session 3', '11:45 - 12:45 PM'],
      ['Session 4', '1:30 - 2:30 PM'],
      ['Session 5', '3:15 - 4:15 PM'],
      ['Session 6', '5:00 - 6:00 PM'],
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    wsRef['!cols'] = [{ wch: 15 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Reference');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fac.code}_timetable_template.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/parse', authAny, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const facultyId = parseInt(req.body.faculty_id);
  if (!facultyId) return res.status(400).json({ error: 'Faculty is required' });
  if (req.admin.role === 'exam_officer' && req.admin.faculty_id !== facultyId)
    return res.status(403).json({ error: 'You can only upload for your assigned faculty' });

  try {
    const { rows: venues } = await db.query(
      'SELECT name FROM venues WHERE faculty_id=$1 OR faculty_id IS NULL', [facultyId]);
    const venueNames = venues.map(v => v.name);

    const sessionId = parseInt(req.body.session_id) || null;
    let dateMap = {};
    if (sessionId) {
      const { rows: [session] } = await db.query(
        'SELECT start_date, end_date FROM examination_sessions WHERE id=$1', [sessionId]);
      if (session?.start_date && session?.end_date) {
        const sd = typeof session.start_date === 'string' ? session.start_date : session.start_date.toISOString().slice(0, 10);
        const ed = typeof session.end_date === 'string' ? session.end_date : session.end_date.toISOString().slice(0, 10);
        dateMap = buildDateMap(sd, ed);
      }
    }

    const result = await parseFile(req.file.buffer, req.file.originalname);

    if (Object.keys(dateMap).length) {
      applyDateMap(result.exams, dateMap);
    }

    const venueWarnings = validateVenues(result.exams, venueNames);
    const allWarnings = [...result.warnings, ...venueWarnings];

    for (const e of result.exams) {
      if (!e.student_count) {
        allWarnings.push({ row: e.row, msg: `Missing student count for ${e.course_code}` });
      }
    }

    const clashes = detectVenueClashes(result.exams);

    res.json({
      exams: result.exams,
      warnings: allWarnings,
      clashes,
      total: result.exams.length,
      format: result.format,
    });
  } catch (err) {
    console.error('Parse error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/confirm', authAny, async (req, res) => {
  const { faculty_id, exams, replace, session_id } = req.body;
  if (!faculty_id || !exams?.length) return res.status(400).json({ error: 'Faculty and exams required' });
  if (req.admin.role === 'exam_officer' && req.admin.faculty_id !== faculty_id)
    return res.status(403).json({ error: 'You can only upload for your assigned faculty' });

  try {
    const { rows: [period] } = await db.query('SELECT id FROM exam_periods WHERE is_active=true LIMIT 1');
    const periodId = period?.id;

    if (replace) {
      if (session_id) {
        await db.query('DELETE FROM exams WHERE faculty_id=$1 AND session_id=$2', [faculty_id, session_id]);
      } else {
        await db.query('DELETE FROM exams WHERE faculty_id=$1 AND period_id=$2', [faculty_id, periodId]);
      }
    }

    let inserted = 0;
    for (const e of exams) {
      await db.query(
        `INSERT INTO exams (period_id, faculty_id, course_code, course_name, exam_date, day_name,
          session_number, start_time, end_time, venue, student_count, exam_type, session_id, examiner, year_group)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [periodId, faculty_id, e.course_code, e.course_name, e.exam_date, e.day_name,
         e.session_number, e.start_time, e.end_time, e.venue, e.student_count || 0, e.exam_type || 'written',
         session_id || null, e.examiner || null, e.year_group || null]
      );
      inserted++;
    }

    res.json({ inserted, faculty_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
