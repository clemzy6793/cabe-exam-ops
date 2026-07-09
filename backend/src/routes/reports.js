const router = require('express').Router();
const multer = require('multer');
const db = require('../db');
const { authAdmin, authAny } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xls, .xlsx) are allowed'));
    }
  },
});

router.post('/upload', authAny, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { exam_id, staff_code } = req.body;
  if (!exam_id) return res.status(400).json({ error: 'Exam is required' });

  try {
    let uploaderId = null;
    if (staff_code) {
      const { rows } = await db.query('SELECT id FROM staff WHERE staff_code=$1', [staff_code]);
      if (rows.length) uploaderId = rows[0].id;
    }

    const { rows } = await db.query(
      `INSERT INTO biometric_reports (exam_id, uploader_id, filename, file_data, file_size)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, exam_id, filename, file_size, uploaded_at`,
      [exam_id, uploaderId, req.file.originalname, req.file.buffer, req.file.size]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/public-upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { exam_id, staff_id } = req.body;
  if (!exam_id || !staff_id) return res.status(400).json({ error: 'Exam and staff_id are required' });

  try {
    const { rows: [staff] } = await db.query('SELECT id FROM staff WHERE id=$1', [staff_id]);
    if (!staff) return res.status(403).json({ error: 'Invalid staff' });

    const { rows: [assignment] } = await db.query(
      'SELECT 1 FROM exam_assignments ea JOIN exams e ON e.id=ea.exam_id WHERE ea.staff_id=$1 AND ea.exam_id=$2',
      [staff_id, exam_id]);
    const { rows: [fRole] } = !assignment ? await db.query(
      `SELECT 1 FROM faculty_staff fs JOIN exams e ON e.faculty_id=fs.faculty_id WHERE fs.staff_id=$1 AND e.id=$2`,
      [staff_id, exam_id]) : { rows: [true] };
    if (!assignment && !fRole) return res.status(403).json({ error: 'You are not assigned to this exam' });

    const { rows } = await db.query(
      `INSERT INTO biometric_reports (exam_id, uploader_id, filename, file_data, file_size)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, exam_id, filename, file_size, uploaded_at`,
      [exam_id, staff_id, req.file.originalname, req.file.buffer, req.file.size]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/by-staff/:staffId', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT br.id, br.exam_id, br.filename, br.file_size, br.uploaded_at
      FROM biometric_reports br WHERE br.uploader_id=$1
      ORDER BY br.uploaded_at DESC`, [req.params.staffId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/session-status', async (req, res) => {
  const { faculty_code, date, session } = req.query;
  if (!faculty_code || !date || !session) return res.status(400).json({ error: 'faculty_code, date, session required' });
  try {
    const { rows: exams } = await db.query(`
      SELECT e.id, e.course_code, e.course_name, e.venue, e.student_count, e.exam_type,
        f.code AS faculty_code
      FROM exams e JOIN faculties f ON f.id=e.faculty_id
      WHERE f.code=$1 AND e.exam_date=$2 AND e.session_number=$3
      ORDER BY e.course_code`, [faculty_code, date, parseInt(session)]);

    for (const exam of exams) {
      const { rows: staff } = await db.query(`
        SELECT s.id, s.name, s.staff_code, s.phone, ea.role
        FROM exam_assignments ea JOIN staff s ON s.id=ea.staff_id
        WHERE ea.exam_id=$1 ORDER BY s.name`, [exam.id]);
      exam.assigned_staff = staff;

      const { rows: reports } = await db.query(`
        SELECT br.id, br.filename, br.file_size, br.uploaded_at, s.name AS uploader_name, s.staff_code AS uploader_code
        FROM biometric_reports br LEFT JOIN staff s ON s.id=br.uploader_id
        WHERE br.exam_id=$1 ORDER BY br.uploaded_at DESC`, [exam.id]);
      exam.reports = reports;
    }

    res.json(exams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my-exams/:query', async (req, res) => {
  try {
    const q = req.params.query.trim();
    let staff;
    const { rows: byCode } = await db.query('SELECT id, name, staff_code, phone FROM staff WHERE staff_code ILIKE $1', [q]);
    if (byCode.length) {
      staff = byCode[0];
    } else {
      const { rows: byName } = await db.query('SELECT id, name, staff_code, phone FROM staff WHERE name ILIKE $1', [`%${q}%`]);
      if (byName.length === 1) staff = byName[0];
      else if (byName.length > 1) return res.json({ matches: byName });
      else return res.status(404).json({ error: 'Staff not found' });
    }

    const { rows: exams } = await db.query(`
      SELECT e.id, e.course_code, e.course_name, e.venue, e.day_name, e.session_number,
        e.exam_date, e.student_count, e.exam_type, f.code AS faculty_code, f.id AS faculty_id
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      JOIN faculties f ON f.id = e.faculty_id
      WHERE ea.staff_id = $1
      ORDER BY e.day_name, e.session_number, e.course_code`, [staff.id]);

    const facultyIds = [...new Set(exams.map(e => e.faculty_id))];
    res.json({ staff, exams, facultyIds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  const { faculty_id, day } = req.query;
  let sql = `
    SELECT br.id, br.filename, br.file_size, br.uploaded_at,
      e.course_code, e.course_name, e.venue, e.day_name, e.session_number, e.exam_date,
      f.code AS faculty_code, f.id AS faculty_id,
      s.name AS uploader_name, s.staff_code AS uploader_code
    FROM biometric_reports br
    JOIN exams e ON e.id = br.exam_id
    JOIN faculties f ON f.id = e.faculty_id
    LEFT JOIN staff s ON s.id = br.uploader_id
    WHERE 1=1`;
  const params = [];

  if (faculty_id) {
    params.push(faculty_id);
    sql += ` AND f.id = $${params.length}`;
  }
  if (day) {
    params.push(day);
    sql += ` AND e.day_name = $${params.length}`;
  }
  sql += ' ORDER BY f.code, e.day_name, e.session_number, e.course_code';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT filename, file_data FROM biometric_reports WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Disposition', `attachment; filename="${rows[0].filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(rows[0].file_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM biometric_reports WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/public-delete/:id', async (req, res) => {
  const { staff_id, staff_code } = req.query;
  if (!staff_id || !staff_code) return res.status(400).json({ error: 'staff_id and staff_code required' });
  try {
    const { rows: staffRows } = await db.query('SELECT id FROM staff WHERE id=$1 AND staff_code=$2', [staff_id, staff_code]);
    if (!staffRows.length) return res.status(403).json({ error: 'Invalid staff credentials' });
    const { rows } = await db.query('SELECT id FROM biometric_reports WHERE id=$1 AND uploader_id=$2', [req.params.id, staff_id]);
    if (!rows.length) return res.status(403).json({ error: 'You can only delete your own uploads' });
    await db.query('DELETE FROM biometric_reports WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
