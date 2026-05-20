import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Smile, Camera, X, Phone, Video, PhoneOff } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import axios from 'axios';
import CameraModal from './CameraModal';

const ChatArea = ({
  user,
  activeChat,
  messages,
  onlineUsers,
  onSendMessage,
  onTyping,
  isTyping,
  typingUser,
  API_URL,
  onStartCall,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  incomingCall,
  incomingCallUser,
  currentCall,
  activeCallUser,
  callStatus,
  callError,
  onDismissCallError,
  localStream,
  remoteStream
}) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const isOnline = activeChat ? onlineUsers.includes(activeChat.id) : false;
  const isCurrentChatOnCall = activeChat && currentCall && currentCall.userId === activeChat.id;
  const canStartCall = activeChat && isOnline && !currentCall && callStatus === 'idle';
  const callStatusText = callStatus === 'outgoing'
    ? 'Dang goi...'
    : callStatus === 'incoming'
      ? 'Cuoc goi den...'
      : callStatus === 'connecting'
        ? 'Dang ket noi...'
        : callStatus === 'connected'
          ? 'Dang trong cuoc goi'
          : '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    
    // Typing indicator logic
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() && !selectedImage) return;

    let imageUrl = null;
    if (selectedImage) {
      const formData = new FormData();
      formData.append('image', selectedImage);
      try {
        const res = await axios.post(`${API_URL}/messages/upload`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}` 
          }
        });
        imageUrl = res.data.imageUrl;
      } catch (err) {
        console.error("Upload failed", err);
        return;
      }
    }

    onSendMessage(text, imageUrl);
    setText('');
    setSelectedImage(null);
    setPreviewUrl(null);
    onTyping(false);
    setShowEmoji(false);
  };

  const handleCapture = (file) => {
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  if (!activeChat) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-cyber-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyber-accent/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
            <Send size={40} className="text-cyber-accent opacity-50 ml-2" />
          </div>
          <h2 className="text-2xl font-bold text-white neon-text mb-2">Welcome to Nexus</h2>
          <p className="text-cyber-muted max-w-sm">Select a contact from the sidebar to establish a secure connection and start communicating.</p>
        </motion.div>

        {incomingCall && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
            <div className="w-full max-w-sm bg-cyber-card border border-cyber-accent/30 rounded-2xl p-6 text-center">
              <p className="text-cyber-muted text-sm mb-2">Incoming {incomingCall.callType} call</p>
              <h3 className="text-xl font-bold text-white mb-6">{incomingCallUser?.username || 'Unknown user'}</h3>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={onRejectCall}
                  className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 flex items-center justify-center"
                >
                  <PhoneOff size={20} />
                </button>
                <button
                  type="button"
                  onClick={onAcceptCall}
                  className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/40 flex items-center justify-center"
                >
                  <Phone size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {callError && (
          <div className="absolute top-4 right-4 left-4 mx-auto max-w-md bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl backdrop-blur-sm z-30 flex items-center justify-between gap-3">
            <span className="text-sm">{callError}</span>
            <button type="button" onClick={onDismissCallError} className="text-red-200 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-black/60 relative">
      {/* Header */}
      <div className="h-16 px-6 border-b border-cyber-accent/20 bg-cyber-bg/80 backdrop-blur-md flex items-center gap-4 shrink-0 z-10">
        <div className="relative w-10 h-10 rounded-full">
          <img 
            src={activeChat.avatar ? activeChat.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${activeChat.username}`} 
            alt="Avatar" 
            className="w-full h-full object-cover rounded-full border border-cyber-muted/30" 
          />
          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${isOnline ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-gray-500'}`}></div>
        </div>
        <div>
          <h2 className="font-bold text-white leading-tight">{activeChat.username}</h2>
          <p className={`text-xs ${isOnline ? 'text-green-400' : 'text-cyber-muted'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isCurrentChatOnCall ? (
            <button
              type="button"
              onClick={onEndCall}
              className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 flex items-center justify-center"
              title="End call"
            >
              <PhoneOff size={18} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onStartCall('audio')}
                disabled={!canStartCall}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  canStartCall ? 'bg-cyber-accent/20 text-cyber-accent hover:bg-cyber-accent/30' : 'bg-white/5 text-cyber-muted cursor-not-allowed'
                }`}
                title="Audio call"
              >
                <Phone size={18} />
              </button>
              <button
                type="button"
                onClick={() => onStartCall('video')}
                disabled={!canStartCall}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  canStartCall ? 'bg-cyber-accent/20 text-cyber-accent hover:bg-cyber-accent/30' : 'bg-white/5 text-cyber-muted cursor-not-allowed'
                }`}
                title="Video call"
              >
                <Video size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-0">
        <AnimatePresence>
          {messages.map((msg, idx) => {
            const isMe = msg.sender_id === user.id;
            const showAvatar = !isMe && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);

            return (
              <motion.div 
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
              >
                {!isMe && (
                  <div className="w-8 shrink-0 mr-2">
                    {showAvatar && (
                      <img 
                        src={activeChat.avatar ? activeChat.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${activeChat.username}`}
                        className="w-8 h-8 rounded-full border border-cyber-muted/30 mt-1"
                        alt="avatar"
                      />
                    )}
                  </div>
                )}
                
                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div 
                    className={`relative px-4 py-2 rounded-2xl ${
                      isMe 
                        ? 'bg-cyber-accent/20 border border-cyber-accent/30 text-white rounded-tr-sm' 
                        : 'bg-white/10 border border-white/10 text-white rounded-tl-sm'
                    }`}
                  >
                    {msg.image_url && (
                      <img 
                        src={msg.image_url} 
                        alt="attachment" 
                        className="rounded-lg mb-2 max-w-full h-auto max-h-60 cursor-pointer object-cover"
                        onClick={() => setFullscreenImage(msg.image_url)}
                      />
                    )}
                    {msg.message && <p className="whitespace-pre-wrap break-words text-[15px]">{msg.message}</p>}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[10px] text-cyber-muted">{moment(msg.created_at).format('HH:mm')}</span>
                    {isMe && (
                      <span className="text-[10px] text-cyber-muted">
                        {msg.seen ? <span className="text-cyber-accent">Seen</span> : 'Sent'}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isTyping && typingUser === activeChat.id && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="w-8 mr-2"></div>
            <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/5 flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-cyber-accent rounded-full typing-dot"></div>
              <div className="w-1.5 h-1.5 bg-cyber-accent rounded-full typing-dot"></div>
              <div className="w-1.5 h-1.5 bg-cyber-accent rounded-full typing-dot"></div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-cyber-bg/90 border-t border-cyber-accent/20 backdrop-blur-md relative z-10">
        <AnimatePresence>
          {previewUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-4 mb-2 p-2 bg-cyber-card rounded-lg border border-cyber-accent/30 flex items-start gap-2 shadow-lg"
            >
              <div className="w-20 h-20 rounded bg-black/50 overflow-hidden relative">
                <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
              <button 
                onClick={() => { setSelectedImage(null); setPreviewUrl(null); }}
                className="p-1 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}

          {showEmoji && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-full right-4 mb-2 z-50 shadow-2xl"
            >
              <EmojiPicker 
                theme="dark" 
                onEmojiClick={handleEmojiClick}
                previewConfig={{ showPreview: false }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-end gap-2 relative">
          <button 
            type="button" 
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-3 text-cyber-muted hover:text-cyber-accent transition-colors shrink-0"
          >
            <Smile size={24} />
          </button>
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-cyber-muted hover:text-cyber-accent transition-colors shrink-0"
          >
            <ImageIcon size={24} />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />

          <button 
            type="button" 
            onClick={() => setIsCameraOpen(true)}
            className="p-3 text-cyber-muted hover:text-cyber-accent transition-colors shrink-0"
          >
            <Camera size={24} />
          </button>

          <div className="flex-1 bg-black/40 border border-cyber-accent/20 rounded-2xl min-h-[48px] max-h-32 flex items-center px-4 relative overflow-hidden focus-within:border-cyber-accent/60 transition-colors">
            <input
              type="text"
              value={text}
              onChange={handleTextChange}
              placeholder="Type a message..."
              className="w-full bg-transparent border-none focus:outline-none text-white py-3"
            />
          </div>

          <button 
            type="submit" 
            disabled={!text.trim() && !selectedImage}
            className={`p-3 rounded-xl shrink-0 transition-all ${
              text.trim() || selectedImage 
                ? 'bg-cyber-accent text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_20px_rgba(0,240,255,0.6)] scale-100' 
                : 'bg-white/5 text-cyber-muted scale-95 cursor-not-allowed'
            }`}
          >
            <Send size={24} className={text.trim() || selectedImage ? 'ml-1' : ''} />
          </button>
        </form>
      </div>

      {currentCall && (
        <div className="absolute top-20 right-6 w-80 bg-black/80 border border-cyber-accent/40 rounded-2xl overflow-hidden z-20 backdrop-blur-md shadow-[0_0_30px_rgba(0,240,255,0.15)]">
          <div className="px-4 py-3 border-b border-cyber-accent/20">
            <p className="text-sm font-semibold text-white">{activeCallUser?.username || activeChat?.username || 'In call'}</p>
            <p className="text-xs text-cyber-muted">{callStatusText || 'Connecting call...'}</p>
          </div>

          <div className="relative bg-black aspect-video flex items-center justify-center">
            {currentCall.callType === 'video' ? (
              <>
                {remoteStream ? (
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="text-cyber-muted text-sm">Waiting for remote video...</div>
                )}
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute bottom-3 right-3 w-28 h-20 bg-black/80 rounded-lg object-cover border border-cyber-accent/30"
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3">
                <audio ref={remoteAudioRef} autoPlay />
                <div className="w-14 h-14 rounded-full overflow-hidden border border-cyber-accent/40">
                  <img
                    src={activeCallUser?.avatar ? activeCallUser.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${activeCallUser?.username || 'caller'}`}
                    alt="Call user"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-cyber-muted">Audio call in progress</p>
              </div>
            )}
          </div>

          <div className="p-4 flex justify-center">
            <button
              type="button"
              onClick={onEndCall}
              className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 flex items-center justify-center"
              title="End call"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="w-full max-w-sm bg-cyber-card border border-cyber-accent/30 rounded-2xl p-6 text-center">
            <p className="text-cyber-muted text-sm mb-2">Incoming {incomingCall.callType} call</p>
            <h3 className="text-xl font-bold text-white mb-6">{incomingCallUser?.username || 'Unknown user'}</h3>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={onRejectCall}
                className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 flex items-center justify-center"
              >
                <PhoneOff size={20} />
              </button>
              <button
                type="button"
                onClick={onAcceptCall}
                className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/40 flex items-center justify-center"
              >
                <Phone size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {callError && (
        <div className="absolute top-4 right-4 left-4 mx-auto max-w-md bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl backdrop-blur-sm z-30 flex items-center justify-between gap-3">
          <span className="text-sm">{callError}</span>
          <button type="button" onClick={onDismissCallError} className="text-red-200 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setFullscreenImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              onClick={() => setFullscreenImage(null)}
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={fullscreenImage} 
              alt="Fullscreen" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Modal */}
      {isCameraOpen && (
        <CameraModal 
          onClose={() => setIsCameraOpen(false)} 
          onCapture={(file) => {
            handleCapture(file);
            setIsCameraOpen(false);
          }} 
        />
      )}
    </div>
  );
};

export default ChatArea;
