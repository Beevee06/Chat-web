import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
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

  useEffect(() => {
    const newSocket = io('/', {
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
  }, []);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat]);

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFriends(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (friendId) => {
    try {
      const res = await axios.get(`${API_URL}/messages/${friendId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

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
      />
    </div>
  );
};

export default Chat;
