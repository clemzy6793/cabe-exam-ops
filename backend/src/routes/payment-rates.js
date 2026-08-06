const router = require('express').Router();
const db = require('../db');
const { authAdmin, authAny } = require('../middleware/auth');

router.get('/', authAny, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM payment_rates ORDER BY staff_type, grade, exam_type');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authAdmin, async (req, res) => {
  const { staff_type, grade, exam_type, hourly_rate, daily_rate } = req.body;
  if (!staff_type || !grade || !exam_type || hourly_rate == null)
    return res.status(400).json({ error: 'staff_type, grade, exam_type, and hourly_rate are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO payment_rates (staff_type, grade, exam_type, hourly_rate, daily_rate)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (staff_type, grade, exam_type)
       DO UPDATE SET hourly_rate = $4, daily_rate = $5
       RETURNING *`,
      [staff_type, grade, exam_type, hourly_rate, daily_rate || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authAdmin, async (req, res) => {
  const { staff_type, grade, exam_type, hourly_rate, daily_rate } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE payment_rates SET staff_type=COALESCE($1,staff_type), grade=COALESCE($2,grade),
        exam_type=COALESCE($3,exam_type), hourly_rate=COALESCE($4,hourly_rate), daily_rate=$5
       WHERE id=$6 RETURNING *`,
      [staff_type, grade, exam_type, hourly_rate, daily_rate, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM payment_rates WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seed default CABE rates
router.post('/seed-defaults', authAdmin, async (req, res) => {
  const defaults = [
    ['it_staff', 'default', 'mid_semester', 30, null],
    ['it_staff', 'default', 'end_of_semester', 30, null],
    ['invigilator', 'lecturer', 'mid_semester', 60, null],
    ['invigilator', 'lecturer', 'end_of_semester', 60, null],
    ['invigilator', 'senior_staff', 'mid_semester', 30, null],
    ['invigilator', 'senior_staff', 'end_of_semester', 30, null],
    ['invigilator', 'senior_member', 'mid_semester', 60, null],
    ['invigilator', 'senior_member', 'end_of_semester', 60, null],
    ['office_staff', 'default', 'mid_semester', 30, null],
    ['office_staff', 'default', 'end_of_semester', 30, null],
  ];
  try {
    let inserted = 0;
    for (const [st, gr, et, hr, dr] of defaults) {
      await db.query(
        `INSERT INTO payment_rates (staff_type, grade, exam_type, hourly_rate, daily_rate)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (staff_type, grade, exam_type) DO NOTHING`,
        [st, gr, et, hr, dr]
      );
      inserted++;
    }
    res.json({ message: `Seeded ${inserted} default rates` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
