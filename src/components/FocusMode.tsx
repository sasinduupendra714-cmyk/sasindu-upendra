import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Zap, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface FocusModeProps {
  subjectName: string;
  onClose: () => void;
}

export default function FocusMode({ subjectName, onClose }: FocusModeProps) {
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((90 * 60 - timeLeft) / (90 * 60)) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#1DB954]/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
      </div>

      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#1DB954] animate-pulse" />
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#1DB954]">Deep Work Session</span>
        </div>
        
        <h2 className="text-4xl md:text-7xl font-black mb-8 md:mb-12 tracking-tight">{subjectName}</h2>

        <div className="relative w-56 h-56 md:w-80 md:h-80 mb-8 md:mb-12">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-white/5"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray="100 100"
              strokeDashoffset={100 - progress}
              pathLength="100"
              className="text-[#1DB954] transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl md:text-8xl font-black tabular-nums tracking-tighter">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">Remaining</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <button 
            onClick={() => setTimeLeft(90 * 60)}
            className="p-4 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-8 h-8" />
          </button>
          
          <button 
            onClick={() => setIsActive(!isActive)}
            className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]"
          >
            {isActive ? (
              <Pause className="w-10 h-10 text-black fill-current" />
            ) : (
              <Play className="w-10 h-10 text-black fill-current ml-2" />
            )}
          </button>

          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-4 text-gray-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
          </button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-12 w-full max-w-md">
          <div className="text-center">
            <p className="text-2xl font-bold">90m</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Goal</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Distractions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">High</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Intensity</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 text-gray-500">
        <Maximize2 className="w-5 h-5" />
        <span className="text-xs font-bold uppercase tracking-widest">Immersive Mode Active</span>
      </div>
    </motion.div>
  );
}
