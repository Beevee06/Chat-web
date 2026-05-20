const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middlewares/auth');
const db = require('./database');

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const onlineUsers = new Map(); // Map user_id to socket_id
  const normalizeUserId = (userId) => {
    const parsed = Number(userId);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const emitToUser = (userId, event, payload) => {
    const normalizedUserId = normalizeUserId(userId);
    if (normalizedUserId === null) {
      return false;
    }

    const socketId = onlineUsers.get(normalizedUserId);
    if (!socketId) {
      return false;
    }

    io.to(socketId).emit(event, payload);
    return true;
  };

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.userId = decoded.id;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.id})`);
    
    // Add to online users
    onlineUsers.set(socket.userId, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));

    socket.on('send_message', (data) => {
      const { receiverId, message, imageUrl } = data;
      const senderId = socket.userId;
      const normalizedReceiverId = normalizeUserId(receiverId);

      if (normalizedReceiverId === null) {
        return;
      }

      db.run(`INSERT INTO messages (sender_id, receiver_id, message, image_url) VALUES (?, ?, ?, ?)`,
        [senderId, normalizedReceiverId, message, imageUrl],
        function (err) {
          if (err) return console.error('Error saving message:', err);
          
          db.get(`SELECT * FROM messages WHERE id = ?`, [this.lastID], (err, msg) => {
            if (err) return console.error('Error retrieving message:', err);
            
            // Emit to sender
            socket.emit('receive_message', msg);
            
            // Emit to receiver if online
            const receiverSocketId = onlineUsers.get(normalizedReceiverId);
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('receive_message', msg);
            }
          });
        });
    });

    socket.on('typing', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(normalizeUserId(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', { senderId: socket.userId });
      }
    });

    socket.on('stop_typing', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(normalizeUserId(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('stop_typing', { senderId: socket.userId });
      }
    });

    socket.on('seen_message', ({ messageId, senderId }) => {
      db.run(`UPDATE messages SET seen = 1 WHERE id = ?`, [messageId], (err) => {
        if (!err) {
          const senderSocketId = onlineUsers.get(normalizeUserId(senderId));
          if (senderSocketId) {
            io.to(senderSocketId).emit('message_seen', { messageId });
          }
        }
      });
    });

    socket.on('call:invite', ({ toUserId, callType }) => {
      const delivered = emitToUser(toUserId, 'call:incoming', {
        fromUserId: socket.userId,
        callType: callType === 'video' ? 'video' : 'audio'
      });

      if (!delivered) {
        socket.emit('call:rejected', {
          fromUserId: normalizeUserId(toUserId),
          reason: 'unavailable'
        });
      }
    });

    socket.on('call:accept', ({ toUserId, callType }) => {
      emitToUser(toUserId, 'call:accepted', {
        fromUserId: socket.userId,
        callType: callType === 'video' ? 'video' : 'audio'
      });
    });

    socket.on('call:reject', ({ toUserId, reason }) => {
      emitToUser(toUserId, 'call:rejected', {
        fromUserId: socket.userId,
        reason: reason || 'rejected'
      });
    });

    socket.on('call:offer', ({ toUserId, offer, callType }) => {
      emitToUser(toUserId, 'call:offer', {
        fromUserId: socket.userId,
        offer,
        callType: callType === 'video' ? 'video' : 'audio'
      });
    });

    socket.on('call:answer', ({ toUserId, answer }) => {
      emitToUser(toUserId, 'call:answer', {
        fromUserId: socket.userId,
        answer
      });
    });

    socket.on('call:ice-candidate', ({ toUserId, candidate }) => {
      emitToUser(toUserId, 'call:ice-candidate', {
        fromUserId: socket.userId,
        candidate
      });
    });

    socket.on('call:end', ({ toUserId }) => {
      emitToUser(toUserId, 'call:ended', {
        fromUserId: socket.userId
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });
  });
};

module.exports = setupSocket;
