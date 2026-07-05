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
    if (!['admin', 'superadmin', 'reviewer'].includes(req.admin.role))
      return res.status(403).json({ error: 'Editor access required' });
    next();
  });
}

module.exports = { authAdmin, authEditor, authAny };
