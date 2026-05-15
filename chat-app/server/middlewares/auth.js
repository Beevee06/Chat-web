const jwt = require('jsonwebtoken');

const JWT_SECRET = 'cyberpunk_chat_secret_key_2026';

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = decoded.id;
    next();
  });
};

module.exports = { verifyToken, JWT_SECRET };
