import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import { Loader } from 'lucide-react';

const CALL_STATUS = {
  IDLE: 'idle',
  OUTGOING: 'outgoing',
  INCOMING: 'incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected'
};

const STUN_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const Chat = () => {
  const { user, API_URL } = useAuth();
  const [friends, setFriends] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callStatus, setCallStatus] = useState(CALL_STATUS.IDLE);
  const [callError, setCallError] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socketRef = useRef(null);
  const activeChatRef = useRef(null);
  const typingUserRef = useRef(null);
  const incomingCallRef = useRef(null);
  const callStatusRef = useRef(CALL_STATUS.IDLE);
  const currentCallRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    typingUserRef.current = typingUser;
  }, [typingUser]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  const stopStreamTracks = useCallback((stream) => {
    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => track.stop());
  }, []);

  const closePeerConnection = useCallback(() => {
    if (!peerConnectionRef.current) {
      return;
    }

    peerConnectionRef.current.onicecandidate = null;
    peerConnectionRef.current.ontrack = null;
    peerConnectionRef.current.onconnectionstatechange = null;
    peerConnectionRef.current.close();
    peerConnectionRef.current = null;
  }, []);

  const cleanupCall = useCallback((shouldNotify = false) => {
    const activeCall = currentCallRef.current;
    const currentSocket = socketRef.current;

    if (shouldNotify && activeCall && currentSocket) {
      currentSocket.emit('call:end', { toUserId: activeCall.userId });
    }

    closePeerConnection();
    stopStreamTracks(localStreamRef.current);
    stopStreamTracks(remoteStreamRef.current);
    pendingIceCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setCurrentCall(null);
    setCallStatus(CALL_STATUS.IDLE);
  }, [closePeerConnection, stopStreamTracks]);

  const createPeerConnection = useCallback((targetUserId) => {
    closePeerConnection();
    const peerConnection = new RTCPeerConnection(STUN_CONFIG);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('call:ice-candidate', {
          toUserId: targetUserId,
          candidate: event.candidate
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        setCallStatus(CALL_STATUS.CONNECTED);
      }

      if (peerConnection.connectionState === 'failed') {
        setCallError('Ket noi cuoc goi that bai.');
        cleanupCall(false);
      }

      if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'closed') {
        cleanupCall(false);
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [cleanupCall, closePeerConnection]);

  const drainPendingIceCandidates = useCallback(async (peerConnection) => {
    if (!peerConnection || pendingIceCandidatesRef.current.length === 0) {
      return;
    }

    const candidates = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(candidate);
    }
  }, []);

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
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat, fetchMessages]);

  useEffect(() => {
    const newSocket = io('/', {
      auth: { token: localStorage.getItem('token') }
    });

    socketRef.current = newSocket;
    newSocket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('receive_message', (msg) => {
      setMessages((prev) => {
        // Prevent duplicate messages in state
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (activeChatRef.current && msg.sender_id === activeChatRef.current.id) {
        newSocket.emit('seen_message', { messageId: msg.id, senderId: msg.sender_id });
      }
    });

    newSocket.on('typing', ({ senderId }) => {
      setTypingUser(senderId);
      setIsTyping(true);
    });

    newSocket.on('stop_typing', ({ senderId }) => {
      if (typingUserRef.current === senderId) {
        setIsTyping(false);
      }
    });

    newSocket.on('message_seen', ({ messageId }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, seen: 1 } : m));
    });

    newSocket.on('call:incoming', ({ fromUserId, callType }) => {
      if (callStatusRef.current !== CALL_STATUS.IDLE) {
        newSocket.emit('call:reject', { toUserId: fromUserId, reason: 'busy' });
        return;
      }

      setCallError('');
      setIncomingCall({
        fromUserId,
        callType: callType === 'video' ? 'video' : 'audio'
      });
      setCallStatus(CALL_STATUS.INCOMING);
    });

    newSocket.on('call:accepted', ({ fromUserId }) => {
      const activeCall = currentCallRef.current;
      const peerConnection = peerConnectionRef.current;

      if (!activeCall || activeCall.userId !== fromUserId || !peerConnection) {
        return;
      }

      setCallStatus(CALL_STATUS.CONNECTING);
      setCallError('');

      (async () => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        newSocket.emit('call:offer', {
          toUserId: fromUserId,
          offer,
          callType: activeCall.callType
        });
      })().catch((error) => {
        console.error(error);
        setCallError('Khong the thiet lap cuoc goi.');
        cleanupCall(false);
      });
    });

    newSocket.on('call:rejected', ({ fromUserId, reason }) => {
      const activeCall = currentCallRef.current;
      if (!activeCall || activeCall.userId !== fromUserId) {
        return;
      }

      if (reason === 'busy') {
        setCallError('Nguoi dung dang trong cuoc goi khac.');
      } else if (reason === 'unavailable') {
        setCallError('Nguoi dung hien tai khong kha dung.');
      } else {
        setCallError('Nguoi dung da tu choi cuoc goi.');
      }
      cleanupCall(false);
    });

    newSocket.on('call:offer', ({ fromUserId, offer }) => {
      const activeCall = currentCallRef.current;
      const peerConnection = peerConnectionRef.current;

      if (!activeCall || activeCall.userId !== fromUserId || !peerConnection) {
        return;
      }

      (async () => {
        await peerConnection.setRemoteDescription(offer);
        await drainPendingIceCandidates(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        newSocket.emit('call:answer', { toUserId: fromUserId, answer });
      })().catch((error) => {
        console.error(error);
        setCallError('Khong the xu ly yeu cau cuoc goi.');
        cleanupCall(false);
      });
    });

    newSocket.on('call:answer', ({ fromUserId, answer }) => {
      const activeCall = currentCallRef.current;
      const peerConnection = peerConnectionRef.current;

      if (!activeCall || activeCall.userId !== fromUserId || !peerConnection) {
        return;
      }

      (async () => {
        await peerConnection.setRemoteDescription(answer);
        await drainPendingIceCandidates(peerConnection);
      })().catch((error) => {
        console.error(error);
        setCallError('Khong the ket noi cuoc goi.');
        cleanupCall(false);
      });
    });

    newSocket.on('call:ice-candidate', ({ fromUserId, candidate }) => {
      const activeCall = currentCallRef.current;
      const peerConnection = peerConnectionRef.current;

      if (!activeCall || activeCall.userId !== fromUserId || !peerConnection || !candidate) {
        return;
      }

      (async () => {
        if (!peerConnection.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        await peerConnection.addIceCandidate(candidate);
      })().catch((error) => {
        console.error(error);
      });
    });

    newSocket.on('call:ended', ({ fromUserId }) => {
      const activeCall = currentCallRef.current;
      const pendingIncomingCall = incomingCallRef.current;

      if (activeCall && activeCall.userId === fromUserId) {
        setCallError('Cuoc goi da ket thuc.');
        cleanupCall(false);
        return;
      }

      if (pendingIncomingCall && pendingIncomingCall.fromUserId === fromUserId) {
        setIncomingCall(null);
        setCallStatus(CALL_STATUS.IDLE);
      }
    });

    return () => {
      cleanupCall(false);
      socketRef.current = null;
      newSocket.removeAllListeners();
      newSocket.close();
    };
  }, [cleanupCall, drainPendingIceCandidates]);

  const handleSendMessage = useCallback((text, imageUrl = null) => {
    if (!socketRef.current || (!text.trim() && !imageUrl) || !activeChatRef.current) return;
    
    socketRef.current.emit('send_message', {
      receiverId: activeChatRef.current.id,
      message: text,
      imageUrl
    });
  }, []);

  const handleTyping = useCallback((isTypingStatus) => {
    if (!socketRef.current || !activeChatRef.current) return;
    if (isTypingStatus) {
      socketRef.current.emit('typing', { receiverId: activeChatRef.current.id });
    } else {
      socketRef.current.emit('stop_typing', { receiverId: activeChatRef.current.id });
    }
  }, []);

  const handleStartCall = useCallback(async (callType) => {
    if (!socketRef.current || !activeChat) {
      return;
    }

    if (callStatusRef.current !== CALL_STATUS.IDLE) {
      setCallError('Ban dang trong mot cuoc goi khac.');
      return;
    }

    if (!onlineUsers.includes(activeChat.id)) {
      setCallError('Nguoi dung dang offline.');
      return;
    }

    const normalizedCallType = callType === 'video' ? 'video' : 'audio';
    setCallError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: normalizedCallType === 'video'
      });

      const peerConnection = createPeerConnection(activeChat.id);
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      setLocalStream(stream);
      setRemoteStream(null);
      pendingIceCandidatesRef.current = [];
      setCurrentCall({
        userId: activeChat.id,
        callType: normalizedCallType,
        direction: 'outgoing'
      });
      setCallStatus(CALL_STATUS.OUTGOING);
      socketRef.current.emit('call:invite', {
        toUserId: activeChat.id,
        callType: normalizedCallType
      });
    } catch (error) {
      console.error(error);
      setCallError('Khong the truy cap microphone/camera.');
      cleanupCall(false);
    }
  }, [activeChat, cleanupCall, createPeerConnection, onlineUsers]);

  const handleAcceptCall = useCallback(async () => {
    if (!socketRef.current || !incomingCall) {
      return;
    }

    const caller = friends.find((friend) => friend.id === incomingCall.fromUserId);
    if (caller) {
      setActiveChat(caller);
    }

    setCallError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'video'
      });

      const peerConnection = createPeerConnection(incomingCall.fromUserId);
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      setLocalStream(stream);
      setRemoteStream(null);
      pendingIceCandidatesRef.current = [];
      setCurrentCall({
        userId: incomingCall.fromUserId,
        callType: incomingCall.callType,
        direction: 'incoming'
      });
      setIncomingCall(null);
      setCallStatus(CALL_STATUS.CONNECTING);
      socketRef.current.emit('call:accept', {
        toUserId: incomingCall.fromUserId,
        callType: incomingCall.callType
      });
    } catch (error) {
      console.error(error);
      setCallError('Khong the bat microphone/camera de nhan cuoc goi.');
      socketRef.current.emit('call:reject', {
        toUserId: incomingCall.fromUserId,
        reason: 'media_error'
      });
      cleanupCall(false);
    }
  }, [cleanupCall, createPeerConnection, friends, incomingCall]);

  const handleRejectCall = useCallback(() => {
    if (!socketRef.current || !incomingCall) {
      return;
    }

    socketRef.current.emit('call:reject', {
      toUserId: incomingCall.fromUserId,
      reason: 'rejected'
    });
    setIncomingCall(null);
    setCallStatus(CALL_STATUS.IDLE);
  }, [incomingCall]);

  const handleEndCall = useCallback(() => {
    cleanupCall(true);
  }, [cleanupCall]);

  const incomingCallUser = incomingCall
    ? friends.find((friend) => friend.id === incomingCall.fromUserId)
    : null;

  const activeCallUser = currentCall
    ? (friends.find((friend) => friend.id === currentCall.userId) || (activeChat?.id === currentCall.userId ? activeChat : null))
    : null;

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
        onStartCall={handleStartCall}
        onAcceptCall={handleAcceptCall}
        onRejectCall={handleRejectCall}
        onEndCall={handleEndCall}
        incomingCall={incomingCall}
        incomingCallUser={incomingCallUser}
        currentCall={currentCall}
        activeCallUser={activeCallUser}
        callStatus={callStatus}
        callError={callError}
        onDismissCallError={() => setCallError('')}
        localStream={localStream}
        remoteStream={remoteStream}
      />
    </div>
  );
};

export default Chat;
