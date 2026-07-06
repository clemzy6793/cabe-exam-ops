const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');
const { authAny, authAdmin } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.xlsx?$/i)) cb(null, true);
    else cb(new Error('Only Excel files allowed'));
  },
});

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const SESSION_TIMES = {
  1: { start: '08:15', end: '09:15' }, 2: { start: '10:00', end: '11:00' },
  3: { start: '11:45', end: '12:45' }, 4: { start: '13:30', end: '14:30' },
  5: { start: '15:15', end: '16:15' }, 6: { start: '17:00', end: '18:00' },
};
const EXAM_DATES = {
  monday: '2026-07-06', tuesday: '2026-07-07', wednesday: '2026-07-08',
  thursday: '2026-07-09', friday: '2026-07-10',
};

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
    const venueNames = new Set(venues.map(v => v.name.toLowerCase()));

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const exams = [];
    const warnings = [];

    raw.forEach((row, i) => {
      const rowNum = i + 2;
      const dayRaw = String(row['Day'] || row['day'] || '').trim().toLowerCase();
      const sessionRaw = parseInt(row['Session'] || row['session']);
      const code = String(row['Course Code'] || row['course_code'] || row['Course code'] || '').trim();
      const name = String(row['Course Name'] || row['course_name'] || row['Course name'] || '').trim();
      const venue = String(row['Venue'] || row['venue'] || '').trim();
      const students = parseInt(row['Students'] || row['students'] || row['Student Count'] || 0) || 0;
      const typeRaw = String(row['Exam Type'] || row['exam_type'] || row['Type'] || 'written').trim();

      if (!code && !name) return;
      if (!code) { warnings.push({ row: rowNum, msg: 'Missing course code' }); return; }

      const day = DAYS.find(d => d.startsWith(dayRaw.slice(0, 3)));
      if (!day) { warnings.push({ row: rowNum, msg: `Invalid day: "${row['Day'] || ''}"` }); return; }
      if (!sessionRaw || sessionRaw < 1 || sessionRaw > 6) {
        warnings.push({ row: rowNum, msg: `Invalid session: "${row['Session'] || ''}"` }); return;
      }

      let examType = 'written';
      if (/cbe/i.test(typeRaw)) examType = 'CBE';
      else if (/byod/i.test(typeRaw)) examType = 'BYOD';

      if (venue && !venueNames.has(venue.toLowerCase())) {
        warnings.push({ row: rowNum, msg: `Unknown venue: "${venue}" (not in faculty/shared list)` });
      }
      if (!students) {
        warnings.push({ row: rowNum, msg: `Missing student count for ${code}` });
      }

      exams.push({
        row: rowNum, day_name: day, session_number: sessionRaw,
        course_code: code.toUpperCase(), course_name: name, venue,
        student_count: students, exam_type: examType,
        exam_date: EXAM_DATES[day],
        start_time: SESSION_TIMES[sessionRaw].start,
        end_time: SESSION_TIMES[sessionRaw].end,
      });
    });

    const clashes = [];
    for (let i = 0; i < exams.length; i++) {
      for (let j = i + 1; j < exams.length; j++) {
        if (exams[i].venue && exams[i].venue === exams[j].venue &&
            exams[i].day_name === exams[j].day_name &&
            exams[i].session_number === exams[j].session_number) {
          clashes.push({
            venue: exams[i].venue, day: exams[i].day_name, session: exams[i].session_number,
            courses: [exams[i].course_code, exams[j].course_code],
          });
        }
      }
    }

    res.json({ exams, warnings, clashes, total: exams.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/confirm', authAny, async (req, res) => {
  const { faculty_id, exams, replace } = req.body;
  if (!faculty_id || !exams?.length) return res.status(400).json({ error: 'Faculty and exams required' });
  if (req.admin.role === 'exam_officer' && req.admin.faculty_id !== faculty_id)
    return res.status(403).json({ error: 'You can only upload for your assigned faculty' });

  try {
    const { rows: [period] } = await db.query('SELECT id FROM exam_periods WHERE is_active=true LIMIT 1');
    const periodId = period?.id;

    if (replace) {
      await db.query('DELETE FROM exams WHERE faculty_id=$1 AND period_id=$2', [faculty_id, periodId]);
    }

    let inserted = 0;
    for (const e of exams) {
      await db.query(
        `INSERT INTO exams (period_id, faculty_id, course_code, course_name, exam_date, day_name,
          session_number, start_time, end_time, venue, student_count, exam_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [periodId, faculty_id, e.course_code, e.course_name, e.exam_date, e.day_name,
         e.session_number, e.start_time, e.end_time, e.venue, e.student_count || 0, e.exam_type || 'written']
      );
      inserted++;
    }

    res.json({ inserted, faculty_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
