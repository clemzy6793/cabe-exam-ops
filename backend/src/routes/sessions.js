const router = require('express').Router();
const db = require('../db');
const { authAdmin, authAny } = require('../middleware/auth');

// ── Academic Years ───────────────────────────────────────────

router.get('/years', authAny, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ay.*,
        (SELECT COUNT(*)::int FROM examination_sessions es WHERE es.academic_year_id = ay.id) AS session_count
       FROM academic_years ay ORDER BY ay.name DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/years', authAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name || !/^\d{4}\/\d{4}$/.test(name))
    return res.status(400).json({ error: 'Format: YYYY/YYYY (e.g. 2025/2026)' });
  try {
    const { rows } = await db.query(
      'INSERT INTO academic_years (name) VALUES ($1) RETURNING *', [name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Academic year already exists' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/years/:id/current', authAdmin, async (req, res) => {
  try {
    await db.query('UPDATE academic_years SET is_current = false');
    const { rows } = await db.query(
      'UPDATE academic_years SET is_current = true WHERE id = $1 RETURNING *', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/years/:id', authAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS cnt FROM examination_sessions WHERE academic_year_id = $1', [req.params.id]
    );
    if (rows[0].cnt > 0)
      return res.status(400).json({ error: 'Cannot delete: has examination sessions' });
    await db.query('DELETE FROM academic_years WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Examination Sessions ─────────────────────────────────────

router.get('/', authAny, async (req, res) => {
  const { year_id, status } = req.query;
  let sql = `
    SELECT es.*, ay.name AS academic_year,
      (SELECT COUNT(*)::int FROM exams e WHERE e.session_id = es.id) AS exam_count
    FROM examination_sessions es
    JOIN academic_years ay ON ay.id = es.academic_year_id
    WHERE 1=1`;
  const params = [];
  if (year_id) { params.push(year_id); sql += ` AND es.academic_year_id = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND es.status = $${params.length}`; }
  sql += ' ORDER BY ay.name DESC, es.name';
  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT es.*, ay.name AS academic_year
      FROM examination_sessions es
      JOIN academic_years ay ON ay.id = es.academic_year_id
      WHERE es.status = 'active' AND es.published = true
      ORDER BY es.created_at DESC LIMIT 1`
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authAdmin, async (req, res) => {
  const { academic_year_id, name, exam_type, semester, start_date, end_date } = req.body;
  if (!academic_year_id || !name || !exam_type)
    return res.status(400).json({ error: 'Academic year, name, and exam type are required' });
  if (!['mid_semester', 'end_of_semester'].includes(exam_type))
    return res.status(400).json({ error: 'exam_type must be mid_semester or end_of_semester' });
  try {
    const { rows } = await db.query(
      `INSERT INTO examination_sessions (academic_year_id, name, exam_type, semester, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [academic_year_id, name, exam_type, semester || 'first', start_date || null, end_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Session name already exists for this year' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authAdmin, async (req, res) => {
  const { name, exam_type, start_date, end_date } = req.body;
  try {
    const { rows: [existing] } = await db.query('SELECT status FROM examination_sessions WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status === 'archived')
      return res.status(400).json({ error: 'Cannot edit archived sessions' });

    const { semester } = req.body;
    const { rows } = await db.query(
      `UPDATE examination_sessions SET name=COALESCE($1,name), exam_type=COALESCE($2,exam_type),
        start_date=COALESCE($3,start_date), end_date=COALESCE($4,end_date), semester=COALESCE($5,semester)
       WHERE id=$6 RETURNING *`,
      [name, exam_type, start_date, end_date, semester, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Status transitions: draft → active → closed → archived
const VALID_TRANSITIONS = {
  draft: ['active'],
  active: ['closed'],
  closed: ['archived', 'active'],
  archived: [],
};

router.put('/:id/status', authAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const { rows: [session] } = await db.query('SELECT * FROM examination_sessions WHERE id=$1', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Not found' });

    const allowed = VALID_TRANSITIONS[session.status] || [];
    if (!allowed.includes(status))
      return res.status(400).json({ error: `Cannot change from ${session.status} to ${status}` });

    // Only one active session at a time
    if (status === 'active') {
      await db.query("UPDATE examination_sessions SET status = 'closed' WHERE status = 'active'");
    }

    const { rows } = await db.query(
      'UPDATE examination_sessions SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );

    await db.query(
      'INSERT INTO activity_log (admin_id, action, details) VALUES ($1, $2, $3)',
      [req.admin.id, 'session_status', `${session.name}: ${session.status} → ${status}`]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lock/unlock assignments
router.put('/:id/lock', authAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE examination_sessions SET assignments_locked = NOT assignments_locked WHERE id=$1 RETURNING id, assignments_locked',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    await db.query(
      'INSERT INTO activity_log (admin_id, action, details) VALUES ($1, $2, $3)',
      [req.admin.id, 'assignments_lock', rows[0].assignments_locked ? 'Locked' : 'Unlocked']
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Publish/unpublish toggle
router.put('/:id/publish', authAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE examination_sessions SET published = NOT published WHERE id=$1 RETURNING id, name, published',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    await db.query(
      'INSERT INTO activity_log (admin_id, action, details) VALUES ($1, $2, $3)',
      [req.admin.id, rows[0].published ? 'session_published' : 'session_unpublished', rows[0].name]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const { rows: [session] } = await db.query('SELECT status FROM examination_sessions WHERE id=$1', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Not found' });
    if (session.status !== 'draft')
      return res.status(400).json({ error: 'Only draft sessions can be deleted' });
    await db.query('DELETE FROM examination_sessions WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
