import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const CameraModal = ({ onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
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

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      // Mirror the image horizontally if it's a front camera
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
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl"
    >
      <div className="w-full max-w-3xl glass-panel rounded-2xl overflow-hidden relative border border-cyber-accent/30 shadow-[0_0_50px_rgba(0,240,255,0.1)]">
        
        {/* Header */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10">
          <h3 className="text-white font-bold flex items-center gap-2 text-lg">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            NEXUS OPTICS
          </h3>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center w-full">
          {error ? (
            <p className="text-red-400 font-medium">{error}</p>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Crosshairs Overlay */}
          <div className="absolute inset-0 pointer-events-none border-[1px] border-cyber-accent/20 m-8 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyber-accent"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyber-accent"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyber-accent"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyber-accent"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-cyber-accent/50 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-cyber-accent rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="h-24 bg-black/80 flex items-center justify-center gap-8 relative">
          <button 
            onClick={() => { stopCamera(); startCamera(); }}
            className="p-3 text-cyber-muted hover:text-white transition-colors absolute left-8"
          >
            <RefreshCcw size={24} />
          </button>

          <button 
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-cyber-accent/50 flex items-center justify-center group"
          >
            <div className="w-12 h-12 bg-white rounded-full transition-transform group-hover:scale-90 group-active:scale-75 shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CameraModal;
