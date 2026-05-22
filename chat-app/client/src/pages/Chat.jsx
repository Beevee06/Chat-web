import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import CallOverlay from '../components/CallOverlay';
import { AnimatePresence } from 'framer-motion';
import { Loader } from 'lucide-react';

const Chat = () => {
  const { user, API_URL } = useAuth();
  const [socket, setSocket] = useState(null);
  const [friends, setFriends] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callMode, setCallMode] = useState(null);
  const [callTarget, setCallTarget] = useState(null);

  const socketUrl = useMemo(() => {
    if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
    return new URL(API_URL, window.location.origin).origin;
  }, [API_URL]);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFriends(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [API_URL]);

  const fetchMessages = useCallback(async (friendId) => {
    try {
      const res = await axios.get(`${API_URL}/messages/${friendId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [API_URL]);

  useEffect(() => {
    const newSocket = io(socketUrl, {
      auth: { token: localStorage.getItem('token') }
    });

    setSocket(newSocket);

    newSocket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('receive_message', (msg) => {
      setMessages((prev) => {
        // Prevent duplicate messages in state
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (activeChat && msg.sender_id === activeChat.id) {
        newSocket.emit('seen_message', { messageId: msg.id, senderId: msg.sender_id });
      }
    });

    newSocket.on('typing', ({ senderId }) => {
      setTypingUser(senderId);
      setIsTyping(true);
    });

    newSocket.on('stop_typing', ({ senderId }) => {
      if (typingUser === senderId) {
        setIsTyping(false);
      }
    });

    newSocket.on('message_seen', ({ messageId }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, seen: 1 } : m));
    });

    return () => newSocket.close();
  }, [socketUrl]);

  useEffect(() => {
    if (!user) return;
    fetchFriends();

    const interval = setInterval(fetchFriends, 5000);
    const handleFocus = () => fetchFriends();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchFriends();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, fetchFriends]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat]);

  useEffect(() => {
    if (!activeChat) return;
    const updated = friends.find((friend) => friend.id === activeChat.id);
    if (updated && updated.status !== activeChat.status) {
      setActiveChat(updated);
    }
  }, [friends, activeChat]);

  const handleSendMessage = (text, imageUrl = null) => {
    if (!socket || (!text.trim() && !imageUrl)) return;
    
    socket.emit('send_message', {
      receiverId: activeChat.id,
      message: text,
      imageUrl
    });
  };

  const handleTyping = (isTypingStatus) => {
    if (!socket || !activeChat) return;
    if (isTypingStatus) {
      socket.emit('typing', { receiverId: activeChat.id });
    } else {
      socket.emit('stop_typing', { receiverId: activeChat.id });
    }
  };

  const handleStartCall = (target, mode) => {
    if (!target) return;
    setActiveChat(target);
    setCallTarget(target);
    setCallMode(mode);
    setIsCallOpen(true);
  };

  const handleStartCallFromChat = (mode) => {
    if (!activeChat) return;
    handleStartCall(activeChat, mode);
  };

  const handleCloseCall = () => {
    setIsCallOpen(false);
    setCallMode(null);
    setCallTarget(null);
  };

  if (!user) return <div className="flex w-full h-full justify-center items-center"><Loader className="animate-spin text-cyber-accent" /></div>;

  return (
    <div className="flex w-full h-full bg-cyber-bg overflow-hidden relative z-0">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-[0.03] z-[-1]"></div>
      
      <Sidebar 
        user={user} 
        friends={friends} 
        onlineUsers={onlineUsers} 
        activeChat={activeChat} 
        setActiveChat={setActiveChat}
        fetchFriends={fetchFriends}
        API_URL={API_URL}
        onStartCall={handleStartCall}
      />
      
      <ChatArea 
        user={user}
        activeChat={activeChat}
        messages={messages}
        onlineUsers={onlineUsers}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        isTyping={isTyping}
        typingUser={typingUser}
        API_URL={API_URL}
        onStartCall={handleStartCallFromChat}
      />

      <AnimatePresence>
        {isCallOpen && callTarget && (
          <CallOverlay
            isOpen={isCallOpen}
            onClose={handleCloseCall}
            mode={callMode || 'voice'}
            contact={callTarget}
            isOnline={onlineUsers.includes(callTarget.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
