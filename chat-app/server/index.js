require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('./database');
const { verifyToken, JWT_SECRET } = require('./middlewares/auth');
const { verifyAdminToken, ADMIN_JWT_SECRET } = require('./middlewares/admin');
const { setupSocket, getOnlineUsersCount } = require('./socket');
const fs = require('fs');
const { backupDatabase } = require('./backup');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILES = {
  combined: path.join(LOG_DIR, 'combined.log'),
  error: path.join(LOG_DIR, 'error.log')
};

const readLogLines = (filePath, maxLines = 200) => {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines);
};

// Helper to generate Friend Code
const generateFriendCode = (username) => {
  const code = Math.floor(10000 + Math.random() * 90000);
  return `${username.toUpperCase().slice(0, 5)}-${code}`;
};

// --- AUTH ROUTES ---
app.post('/api/register', upload.single('avatar'), (req, res) => {
  const { username, password } = req.body;
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Error hashing password' });

    const friendCode = generateFriendCode(username);

    db.run(
      `INSERT INTO users (username, password, avatar, friend_code) VALUES (?, ?, ?, ?)`,
      [username, hash, avatarUrl, friendCode],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'User registered successfully', friendCode });
      }
    );
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ error: 'Error comparing password' });
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const { password, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    });
  });
});

app.get('/api/me', verifyToken, (req, res) => {
  db.get(`SELECT id, username, avatar, friend_code FROM users WHERE id = ?`, [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

// --- ADMIN ROUTES ---
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin credentials not configured' });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = jwt.sign({ role: 'admin', username }, ADMIN_JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, admin: { username } });
});

app.get('/api/admin/stats', verifyAdminToken, (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    stats.users = row.count || 0;

    db.get('SELECT COUNT(*) AS count FROM messages', (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      stats.messages = row.count || 0;

      db.get("SELECT COUNT(*) AS count FROM friends WHERE status = 'pending'", (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        stats.pendingRequests = row.count || 0;

        db.get("SELECT COUNT(*) AS count FROM friends WHERE status = 'accepted'", (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          stats.acceptedFriends = row.count || 0;

          const uploadsDir = path.join(__dirname, 'uploads');
          let uploadsSize = 0;
          let uploadsCount = 0;
          if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            files.forEach((file) => {
              const fullPath = path.join(uploadsDir, file);
              const fileStat = fs.statSync(fullPath);
              if (fileStat.isFile()) {
                uploadsSize += fileStat.size;
                uploadsCount += 1;
              }
            });
          }

          const dbPath = path.join(__dirname, 'database.sqlite');
          const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

          stats.onlineUsers = getOnlineUsersCount();
          stats.uploadsCount = uploadsCount;

          stats.storage = {
            uploadsBytes: uploadsSize,
            databaseBytes: dbSize
          };

          res.json(stats);
        });
      });
    });
  });
});

app.get('/api/admin/users', verifyAdminToken, (req, res) => {
  db.all('SELECT id, username, avatar, friend_code, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.delete('/api/admin/users/:id', verifyAdminToken, (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ error: 'Invalid user id' });

  db.serialize(() => {
    db.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
    db.run('DELETE FROM friends WHERE requester_id = ? OR receiver_id = ?', [userId, userId]);
    db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'User deleted' });
    });
  });
});

app.post('/api/admin/backup', verifyAdminToken, (req, res) => {
  backupDatabase();
  res.json({ message: 'Backup started' });
});

app.get('/api/admin/logs', verifyAdminToken, (req, res) => {
  const type = (req.query.type || 'combined').toString();
  const maxLines = Math.min(Number(req.query.lines) || 200, 1000);

  if (!LOG_FILES[type]) {
    return res.status(400).json({ error: 'Invalid log type' });
  }

  const lines = readLogLines(LOG_FILES[type], maxLines);
  res.json({ type, lines });
});

// --- FRIEND ROUTES ---
app.post('/api/friends/add', verifyToken, (req, res) => {
  const { friendCode } = req.body;
  const requesterId = req.userId;

  db.get(`SELECT id FROM users WHERE friend_code = ?`, [friendCode], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'Friend code not found' });
    if (user.id === requesterId) return res.status(400).json({ error: 'Cannot add yourself' });

    const receiverId = user.id;

    db.get(`SELECT * FROM friends WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,
      [requesterId, receiverId, receiverId, requesterId], (err, friend) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (friend) return res.status(400).json({ error: 'Friend request already sent or are already friends' });

        db.run(`INSERT INTO friends (requester_id, receiver_id, status) VALUES (?, ?, 'pending')`,
          [requesterId, receiverId], function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Friend request sent' });
          });
      });
  });
});

app.get('/api/friends', verifyToken, (req, res) => {
  const userId = req.userId;
  const query = `
    SELECT f.id as friendship_id, f.status, f.requester_id, f.receiver_id, 
           u.id, u.username, u.avatar, u.friend_code 
    FROM friends f
    JOIN users u ON (u.id = f.requester_id OR u.id = f.receiver_id)
    WHERE (f.requester_id = ? OR f.receiver_id = ?) AND u.id != ?
  `;
  
  db.all(query, [userId, userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/api/friends/accept', verifyToken, (req, res) => {
  const { friendshipId } = req.body;
  const userId = req.userId;

  db.run(`UPDATE friends SET status = 'accepted' WHERE id = ? AND receiver_id = ?`,
    [friendshipId, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Friend request not found or not yours' });
      res.json({ message: 'Friend request accepted' });
    });
});

// --- MESSAGES ROUTES ---
app.get('/api/messages/:friendId', verifyToken, (req, res) => {
  const userId = req.userId;
  const friendId = req.params.friendId;

  db.all(`SELECT * FROM messages WHERE 
    (sender_id = ? AND receiver_id = ?) OR 
    (sender_id = ? AND receiver_id = ?) 
    ORDER BY created_at ASC`,
    [userId, friendId, friendId, userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    });
});

app.post('/api/messages/upload', verifyToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

setupSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access on your local network using your machine's IP address (e.g. http://192.168.x.x:${PORT})`);
});
