import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
};

const CallOverlay = ({ isOpen, onClose, mode = 'voice', contact, isOnline }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(mode === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    setIsCameraOn(mode === 'video');
  }, [mode]);

  const displayName = contact?.username || 'Unknown User';
  const avatarUrl = useMemo(() => {
    if (contact?.avatar) return contact.avatar;
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${displayName}`;
  }, [contact, displayName]);

  const statusText = isOnline
    ? mode === 'video'
      ? 'Ringing... video channel warming up'
      : 'Ringing... voice channel warming up'
    : 'User is offline. Call will connect when available.';

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-bg via-black to-cyber-bg/70" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:24px_24px]" />

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        className="relative w-full h-full flex flex-col"
      >
        <header className="h-16 px-6 flex items-center justify-between border-b border-cyber-accent/20 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse" />
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyber-muted">Secure Line</div>
              <div className="text-sm text-white font-semibold">
                {mode === 'video' ? 'Nexus FaceTime' : 'Nexus Voice Call'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-cyber-muted">
            <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">{formatTime(elapsed)}</span>
            <span className="uppercase tracking-[0.18em]">Encrypted</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {mode === 'video' ? (
            <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border border-cyber-accent/20 shadow-[0_0_60px_rgba(0,240,255,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-cyber-bg/70 to-black/80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-cyber-muted text-sm uppercase tracking-[0.35em]">Nexus Stream</div>
              </div>
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-white">
                {displayName}
              </div>
              <div className="absolute bottom-4 right-4 w-44 aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/60">
                <img src={avatarUrl} alt="You" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-[0.2em] text-white/70">You</div>
                {!isCameraOn && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs text-cyber-muted">
                    Camera Off
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute -inset-8 rounded-full border border-cyber-accent/30 animate-ping" />
              <div className="absolute -inset-4 rounded-full border border-cyber-accent/30" />
              <div className="w-32 h-32 rounded-full overflow-hidden border border-cyber-accent/40 bg-black/60 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <div className="text-2xl font-bold text-white">{displayName}</div>
            <div className="text-sm text-cyber-muted mt-1">{statusText}</div>
          </div>
        </div>

        <div className="pb-10 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className={`h-12 w-12 rounded-full border transition-colors ${
              isMuted
                ? 'bg-red-500/20 border-red-500/40 text-red-300'
                : 'bg-white/5 border-white/10 text-cyber-muted hover:text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            type="button"
            onClick={() => mode === 'video' && setIsCameraOn((prev) => !prev)}
            className={`h-12 w-12 rounded-full border transition-colors ${
              mode !== 'video'
                ? 'bg-white/5 border-white/10 text-cyber-muted/40 cursor-not-allowed'
                : isCameraOn
                  ? 'bg-white/5 border-white/10 text-cyber-muted hover:text-white'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            }`}
            title={mode === 'video' ? (isCameraOn ? 'Disable camera' : 'Enable camera') : 'Camera unavailable'}
            disabled={mode !== 'video'}
          >
            {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-14 w-14 rounded-full bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_28px_rgba(239,68,68,0.7)] transition-all"
            title="End call"
          >
            <PhoneOff size={22} />
          </button>

          <button
            type="button"
            onClick={() => setIsSpeakerOn((prev) => !prev)}
            className={`h-12 w-12 rounded-full border transition-colors ${
              isSpeakerOn
                ? 'bg-white/5 border-white/10 text-cyber-muted hover:text-white'
                : 'bg-cyber-accent/20 border-cyber-accent/40 text-cyber-accent'
            }`}
            title={isSpeakerOn ? 'Speaker on' : 'Speaker off'}
          >
            {isSpeakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CallOverlay;
