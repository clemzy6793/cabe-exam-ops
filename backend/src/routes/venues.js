const router = require('express').Router();
const db = require('../db');
const { authAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*, f.name AS faculty_name, f.code AS faculty_code
      FROM venues v
      LEFT JOIN faculties f ON f.id = v.faculty_id
      ORDER BY v.faculty_id NULLS LAST, v.name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authAdmin, async (req, res) => {
  const { name, capacity, faculty_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Venue name is required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO venues (name, capacity, faculty_id) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), capacity || 0, faculty_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Venue already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authAdmin, async (req, res) => {
  const { name, capacity, faculty_id } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE venues SET name=$1, capacity=$2, faculty_id=$3 WHERE id=$4 RETURNING *',
      [name?.trim(), capacity || 0, faculty_id || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Venue name already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM venues WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
