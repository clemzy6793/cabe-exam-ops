const router = require('express').Router();
const db = require('../db');
const { authAdmin } = require('../middleware/auth');

router.get('/', authAdmin, async (req, res) => {
  const { search, action, limit = 100, offset = 0 } = req.query;
  try {
    const conditions = [];
    const params = [];

    if (action) {
      params.push(action);
      conditions.push(`al.action = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(al.details ILIKE $${params.length} OR al.action ILIKE $${params.length} OR a.name ILIKE $${params.length})`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM activity_log al LEFT JOIN admins a ON a.id = al.admin_id ${where}`,
      params);

    const dataParams = [...params];
    dataParams.push(parseInt(limit), parseInt(offset));

    const { rows } = await db.query(
      `SELECT al.id, al.action, al.details, al.created_at,
        a.name AS admin_name, a.email AS admin_email
      FROM activity_log al
      LEFT JOIN admins a ON a.id = al.admin_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams);

    const { rows: actions } = await db.query('SELECT DISTINCT action FROM activity_log ORDER BY action');

    res.json({ logs: rows, total: countResult.rows[0].count, actions: actions.map(a => a.action) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
