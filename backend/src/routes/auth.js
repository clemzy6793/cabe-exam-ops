const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authAdmin } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await db.query('SELECT * FROM admins WHERE LOWER(email)=LOWER($1)', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    if (!await bcrypt.compare(password, rows[0].password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });
    const admin = rows[0];
    const token = jwt.sign(
      { id: admin.id, role: admin.role, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/change-password', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Current and new password required' });
    if (new_password.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const { rows } = await db.query('SELECT * FROM admins WHERE id=$1', [decoded.id]);
    if (!rows.length) return res.status(404).json({ error: 'Admin not found' });
    if (!await bcrypt.compare(current_password, rows[0].password_hash))
      return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE admins SET password_hash=$1 WHERE id=$2', [hash, decoded.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/accounts', authAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, role, created_at FROM admins ORDER BY role, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accounts', authAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (!['admin', 'reviewer'].includes(role)) return res.status(400).json({ error: 'Role must be admin or reviewer' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO admins (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role',
      [name, email, hash, role]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/accounts/from-staff', authAdmin, async (req, res) => {
  const { staff_ids, password } = req.body;
  if (!staff_ids?.length || !password) return res.status(400).json({ error: 'Staff and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Minimum 6 characters' });

  const hash = await bcrypt.hash(password, 10);
  let created = 0, skipped = 0;
  for (const sid of staff_ids) {
    const { rows: [staff] } = await db.query('SELECT name, email, phone FROM staff WHERE id=$1', [sid]);
    if (!staff) continue;
    const loginEmail = staff.email || `${staff.phone}@staff.cabe`;
    const { rows: existing } = await db.query('SELECT 1 FROM admins WHERE LOWER(email)=LOWER($1)', [loginEmail]);
    if (existing.length) { skipped++; continue; }
    await db.query(
      'INSERT INTO admins (name, email, password_hash, role) VALUES ($1,$2,$3,$4)',
      [staff.name, loginEmail, hash, 'reviewer']);
    created++;
  }
  res.json({ created, skipped });
});

router.delete('/accounts/:id', authAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT role FROM admins WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' });
    await db.query('DELETE FROM admins WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const { rows } = await db.query(
      'UPDATE admins SET name=$1, email=$2 WHERE id=$3 RETURNING id, name, email, role',
      [name.trim(), email.trim(), decoded.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const admin = rows[0];
    const newToken = jwt.sign(
      { id: admin.id, role: admin.role, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ admin, token: newToken });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query('SELECT id, name, email, role FROM admins WHERE id=$1', [decoded.id]);
    if (!rows.length) return res.status(401).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
