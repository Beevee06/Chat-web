import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCcw, Image as ImageIcon, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const CameraModal = ({ onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [timecode, setTimecode] = useState('00:00:00:00');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    let frames = 0;
    let seconds = 0;
    let minutes = 0;
    const interval = setInterval(() => {
      frames += 1;
      if (frames > 29) {
        frames = 0;
        seconds += 1;
        if (seconds > 59) {
          seconds = 0;
          minutes += 1;
        }
      }

      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');
      const ff = String(frames).padStart(2, '0');
      setTimecode(`00:${mm}:${ss}:${ff}`);
    }, 1000 / 30);

    return () => clearInterval(interval);
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRestart = () => {
    stopCamera();
    startCamera();
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95"
    >
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-red-300 text-sm">
            {error}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="absolute inset-0 scanlines opacity-40" />

      <div className="absolute inset-4 pointer-events-none border border-cyber-accent/10">
        <div className="absolute top-0 left-0 hud-corner hud-top-left" />
        <div className="absolute top-0 right-0 hud-corner hud-top-right" />
        <div className="absolute bottom-0 left-0 hud-corner hud-bottom-left" />
        <div className="absolute bottom-0 right-0 hud-corner hud-bottom-right" />
      </div>

      <div className="hud-crosshair" />
      <div className="absolute top-1/2 left-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 border border-cyber-accent/80 rounded-full" />

      <div className="relative z-20 flex h-full flex-col">
        <header className="h-16 px-8 flex items-center justify-between bg-black/30 backdrop-blur-2xl border-b border-white/10">
          <div className="flex items-center gap-3 text-cyber-accent uppercase tracking-[0.3em] text-xs">
            <div className="w-2 h-2 rounded-full bg-cyber-accent shadow-[0_0_10px_rgba(0,245,255,0.6)]" />
            NEXUS_OS
            <span className="text-[10px] text-cyber-muted tracking-[0.25em]">v2.4.1</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-full px-3 py-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-record-pulse" />
              <span className="text-[11px] text-red-200 font-semibold tracking-[0.2em]">REC</span>
              <span className="text-[11px] text-cyber-text/80 font-mono">{timecode}</span>
            </div>
            <button
              onClick={handleRestart}
              className="p-2 text-cyber-accent/80 hover:text-cyber-accent transition-colors"
              title="Restart camera"
            >
              <RefreshCcw size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Close camera"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-8 pt-8 pb-10 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-[0.35em] text-cyber-accent/70">Focal Length</div>
              <div className="text-3xl text-cyber-text font-display glow-text">24<span className="text-base ml-1">mm</span></div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyber-muted mt-4">ISO <span className="text-cyber-text ml-1">800</span></div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyber-muted">F-STOP <span className="text-cyber-text ml-1">f/1.8</span></div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyber-muted">SHUTTER <span className="text-cyber-text ml-1">1/120</span></div>
            </div>

            <div className="flex flex-col items-end gap-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.35em] text-cyber-accent/70">Target Lock</div>
              <div className="text-lg text-cyber-secondary glow-text font-display">ACQUIRED</div>
              <div className="mt-3 flex flex-col gap-1">
                {[0, 1].map((row) => (
                  <div key={row} className="flex gap-1 h-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                      const active = row === 0 ? col < 4 : col < 3;
                      return (
                        <div
                          key={col}
                          className={`w-4 rounded-sm ${active ? 'bg-cyber-accent/80' : 'bg-white/10'}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full max-w-3xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between">
            <button
              type="button"
              className="w-12 h-12 rounded-lg bg-black/40 border border-white/15 flex items-center justify-center text-cyber-text/80 hover:text-cyber-accent hover:border-cyber-accent/40 transition-colors"
              title="Open gallery"
            >
              <ImageIcon size={18} />
            </button>

            <button
              type="button"
              onClick={handleCapture}
              className="relative group flex items-center justify-center"
              title="Capture"
            >
              <div className="absolute inset-0 bg-cyber-accent/20 rounded-full blur-xl group-hover:bg-cyber-accent/40 transition-all" />
              <div className="w-20 h-20 rounded-full border-2 border-cyber-accent flex items-center justify-center bg-black/40 backdrop-blur-md">
                <div className="w-14 h-14 rounded-full bg-cyber-accent/80 flex items-center justify-center shadow-[0_0_15px_rgba(0,245,255,0.5)] group-hover:scale-95 transition-transform">
                  <Camera size={26} className="text-black" />
                </div>
              </div>
            </button>

            <button
              type="button"
              className="w-12 h-12 rounded-full bg-black/40 border border-white/15 flex items-center justify-center text-cyber-text/70 hover:text-cyber-accent hover:border-cyber-accent/40 transition-colors"
              title="Settings"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </main>
      </div>
    </motion.div>
  );
};

export default CameraModal;
