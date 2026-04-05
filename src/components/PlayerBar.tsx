import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Maximize2, Zap, Heart, ListMusic, MonitorSpeaker, Volume1, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PlayerBarProps {
  currentSubject: string;
  progress: number;
  timeElapsed: string;
  totalTime?: string;
  onToggleFocus: () => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

export default function PlayerBar({ 
  currentSubject, 
  progress, 
  timeElapsed, 
  totalTime = '90:00',
  onToggleFocus,
  isPlaying = false,
  onTogglePlay
}: PlayerBarProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 h-20 md:h-24 bg-black/95 backdrop-blur-md border-t border-white/5 px-4 flex items-center justify-between z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
    >
      {/* Subject Info */}
      <div className="flex items-center gap-3 md:gap-4 w-[30%] min-w-0">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-gray-800 to-black rounded-md flex items-center justify-center shadow-2xl overflow-hidden shrink-0 border border-white/10"
        >
          <img 
            src={`https://picsum.photos/seed/${currentSubject}/100/100`} 
            alt={currentSubject}
            className={cn(
              "w-full h-full object-cover transition-all duration-700",
              isPlaying ? "scale-110 opacity-80" : "scale-100 opacity-40 grayscale"
            )}
            referrerPolicy="no-referrer"
          />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm font-bold truncate hover:text-[#1DB954] transition-colors cursor-pointer">
            {currentSubject || 'Select a Subject'}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[10px] md:text-xs text-gray-400 hover:text-white transition-colors cursor-pointer truncate">
              {isPlaying ? 'Deep Focus Session' : 'Paused'}
            </p>
            {isPlaying && (
              <span className="flex gap-0.5 h-2 items-end">
                <motion.span animate={{ height: [2, 8, 4, 8, 2] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-0.5 bg-[#1DB954]" />
                <motion.span animate={{ height: [8, 2, 8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-[#1DB954]" />
                <motion.span animate={{ height: [4, 8, 2, 8, 4] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-[#1DB954]" />
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => setIsLiked(!isLiked)}
          className={cn(
            "transition-all shrink-0 hidden sm:block p-2 hover:scale-110 active:scale-90",
            isLiked ? "text-[#1DB954]" : "text-gray-400 hover:text-white"
          )}
        >
          <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-1.5 md:gap-2 flex-1 max-w-[45%]">
        <div className="flex items-center gap-3 md:gap-6">
          <button className="text-gray-400 hover:text-white transition-colors hidden md:block p-1">
            <Shuffle className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors p-1">
            <SkipBack className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onTogglePlay}
            className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#1DB954] transition-colors group"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5 text-black fill-current group-hover:text-black" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5 text-black fill-current ml-0.5 md:ml-1 group-hover:text-black" />
            )}
          </motion.button>
          <button className="text-gray-400 hover:text-white transition-colors p-1">
            <SkipForward className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors hidden md:block p-1">
            <Repeat className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 w-full">
          <span className="text-[9px] md:text-[10px] text-gray-400 w-8 text-right tabular-nums font-medium">{timeElapsed}</span>
          <div 
            className="flex-1 h-1 bg-white/10 rounded-full group cursor-pointer relative"
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={() => setIsHoveringProgress(false)}
          >
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300 relative",
                isHoveringProgress ? "bg-[#1DB954]" : "bg-white"
              )} 
              style={{ width: `${progress}%` }} 
            />
            {isHoveringProgress && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-xl border border-gray-300 z-10" 
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            )}
          </div>
          <span className="text-[9px] md:text-[10px] text-gray-400 w-8 tabular-nums font-medium">{totalTime}</span>
        </div>
      </div>

      {/* Extra Controls */}
      <div className="flex items-center justify-end gap-1 md:gap-3 w-[25%]">
        <button 
          onClick={onToggleFocus}
          className="p-2 text-gray-400 hover:text-[#1DB954] hover:bg-white/5 rounded-full transition-all hidden sm:flex"
          title="Focus Mode"
        >
          <Zap className="w-4 h-4 md:w-5 h-5" />
        </button>
        <button className="p-2 text-gray-400 hover:text-white transition-colors hidden lg:flex">
          <ListMusic className="w-4 h-4 md:w-5 h-5" />
        </button>
        <button className="p-2 text-gray-400 hover:text-white transition-colors hidden lg:flex">
          <MonitorSpeaker className="w-4 h-4 md:w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2 group/vol min-w-[100px] hidden lg:flex">
          <button onClick={() => setIsMuted(!isMuted)}>
            <VolumeIcon className="w-5 h-5 text-gray-400 group-hover/vol:text-white transition-colors" />
          </button>
          <div className="flex-1 h-1 bg-white/10 rounded-full group/bar cursor-pointer relative">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                isMuted ? "bg-gray-600" : "bg-white group-hover/bar:bg-[#1DB954]"
              )} 
              style={{ width: isMuted ? '0%' : `${volume}%` }} 
            />
          </div>
        </div>
        
        <button className="p-2 text-gray-400 hover:text-white transition-colors hidden md:flex">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
