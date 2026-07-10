const jwt = require('jsonwebtoken');

function authAny(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authAdmin(req, res, next) {
  authAny(req, res, () => {
    if (req.admin.role !== 'admin' && req.admin.role !== 'superadmin')
      return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

function authEditor(req, res, next) {
  authAny(req, res, () => {
    if (req.admin.role === 'admin' || req.admin.role === 'superadmin') return next();
    if (req.admin.role === 'reviewer' && req.admin.can_edit) return next();
    return res.status(403).json({ error: 'Editing not enabled for your account' });
  });
}

module.exports = { authAdmin, authEditor, authAny };
