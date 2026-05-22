const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin_secret_change_me';

const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(403).json({ error: 'No admin token provided' });
  }

  jwt.verify(token, ADMIN_JWT_SECRET, (err, decoded) => {
    if (err || decoded?.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.admin = decoded;
    next();
  });
};

module.exports = { verifyAdminToken, ADMIN_JWT_SECRET };
