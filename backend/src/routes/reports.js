const router = require('express').Router();
const multer = require('multer');
const db = require('../db');
const { authAdmin } = require('../middleware/auth');

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

router.post('/upload', authAdmin, upload.single('file'), async (req, res) => {
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM biometric_reports WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
