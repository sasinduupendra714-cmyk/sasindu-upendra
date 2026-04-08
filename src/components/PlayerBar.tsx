import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Maximize2, Minimize2, Zap, Heart, ListMusic, MonitorSpeaker, Volume1, VolumeX, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

interface PlayerBarProps {
  className?: string;
}

export default React.memo(function PlayerBar({ className }: PlayerBarProps) {
  const activeSession = useAppStore(state => state.activeSession);
  const isPaused = useAppStore(state => state.isPaused);
  const setIsPaused = useAppStore(state => state.setIsPaused);
  const setActiveSession = useAppStore(state => state.setActiveSession);
  const setIsFocusMode = useAppStore(state => state.setIsFocusMode);
  const subjects = useAppStore(state => state.subjects);

  const onTogglePause = () => setIsPaused(!isPaused);
  const onStop = () => {
    setIsFocusMode(false);
    setActiveSession(null);
  };
  const onOpenFocus = () => setIsFocusMode(true);

  const currentSubjectObj = subjects.find(s => s.id === activeSession?.subjectId);
  const currentSubject = currentSubjectObj?.name || 'Select a Subject';
  const currentSubjectImage = currentSubjectObj?.image;
  const progress = activeSession ? (activeSession.elapsedSeconds / activeSession.totalSeconds) * 100 : 0;
  const isPlaying = activeSession && !isPaused;

  const timeElapsed = activeSession ? (() => {
    const mins = Math.floor(activeSession.elapsedSeconds / 60);
    const secs = activeSession.elapsedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  })() : '0:00';

  const timeRemaining = activeSession ? (() => {
    const remaining = Math.max(0, activeSession.totalSeconds - activeSession.elapsedSeconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  })() : '0:00';

  // Notification logic
  useEffect(() => {
    if (activeSession && activeSession.elapsedSeconds >= activeSession.totalSeconds) {
      if (Notification.permission === 'granted') {
        new Notification('StudyFlow', {
          body: 'Focus session complete! Time for a break.',
          icon: '/favicon.ico'
        });
      }
    }
  }, [activeSession?.elapsedSeconds, activeSession?.totalSeconds]);

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));
    setVolume(newVolume);
    if (isMuted) setIsMuted(false);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // In a real app, this would trigger a seek in the audio/timer service
  };

  return (
    <AnimatePresence mode="wait">
      {isCollapsed ? (
        <motion.div
          key="collapsed-player"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={() => setIsCollapsed(false)}
          className={cn("fixed bottom-24 right-6 h-12 px-4 bg-[#1DB954] text-black rounded-full flex items-center gap-3 shadow-[0_10px_30px_rgba(29,185,84,0.3)] z-[110] cursor-pointer hover:scale-105 transition-transform group", className)}
        >
          <div className="relative w-6 h-6">
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div key="playing" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Zap className="w-6 h-6 fill-current animate-pulse" />
                </motion.div>
              ) : (
                <motion.div key="paused" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Pause className="w-6 h-6 fill-current" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-sm font-black tracking-tight whitespace-nowrap">
            {isPlaying ? `Focusing: ${currentSubject}` : 'Paused'}
          </span>
          <ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
        </motion.div>
      ) : !isMinimized ? (
        <motion.div 
          key="full-player"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100, opacity: 0 }}
          layoutId="player-container"
          className={cn("fixed bottom-0 left-0 right-0 h-20 md:h-24 bg-black/95 backdrop-blur-md border-t border-white/5 px-4 flex items-center justify-between z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]", className)}
        >
          {/* Subject Info */}
          <div className="flex items-center gap-3 md:gap-4 w-[30%] min-w-0">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-gray-800 to-black rounded-md flex items-center justify-center shadow-2xl overflow-hidden shrink-0 border border-white/10 relative"
            >
              {!isLoaded && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
              <img 
                src={currentSubjectImage || `https://picsum.photos/seed/${currentSubject}/100/100`} 
                alt={currentSubject}
                onLoad={() => setIsLoaded(true)}
                onError={() => setIsLoaded(true)}
                className={cn(
                  "w-full h-full object-cover transition-all duration-700",
                  isLoaded ? (isPlaying ? "scale-110 opacity-80" : "scale-100 opacity-40 grayscale") : "opacity-0 scale-110"
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
            <div className="flex items-center gap-4 md:gap-6">
              <button className="text-gray-400 hover:text-white transition-colors hidden md:block p-2">
                <Shuffle className="w-4 h-4" />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors p-2 md:p-1">
                <SkipBack className="w-5 h-5 md:w-5 md:h-5 fill-current" />
              </button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onTogglePause}
                className="w-11 h-11 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#1DB954] transition-colors group"
              >
                {!isPaused ? (
                  <Pause className="w-5 h-5 md:w-5 md:h-5 text-black fill-current group-hover:text-black" />
                ) : (
                  <Play className="w-5 h-5 md:w-5 md:h-5 text-black fill-current ml-0.5 md:ml-1 group-hover:text-black" />
                )}
              </motion.button>
              <button className="text-gray-400 hover:text-white transition-colors p-2 md:p-1">
                <SkipForward className="w-5 h-5 md:w-5 md:h-5 fill-current" />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors hidden md:block p-2">
                <Repeat className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 w-full">
              <span className="text-[9px] md:text-[10px] text-gray-400 w-8 text-right tabular-nums font-medium">{timeElapsed}</span>
              <div 
                className="flex-1 h-1 bg-white/10 rounded-full group cursor-pointer relative"
                onMouseEnter={() => setIsHoveringProgress(true)}
                onMouseLeave={() => setIsHoveringProgress(false)}
                onClick={handleProgressClick}
              >
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-300 relative",
                    isHoveringProgress ? "bg-[#1DB954]" : "bg-white"
                  )} 
                  style={{ width: `${progress}%` }} 
                />
                {isHoveringProgress && (
                  <motion.div 
                    layoutId="progress-thumb"
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-xl border border-gray-300 z-10" 
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                )}
              </div>
              <span className="text-[9px] md:text-[10px] text-gray-400 w-8 tabular-nums font-medium">
                {activeSession ? `-${timeRemaining}` : '1:30:00'}
              </span>
            </div>
          </div>

          {/* Extra Controls */}
          <div className="flex items-center justify-end gap-1 md:gap-3 w-[25%]">
            <button 
              onClick={onOpenFocus}
              className="p-2 text-gray-400 hover:text-[#1DB954] hover:bg-white/5 rounded-full transition-all hidden sm:flex"
              title="Focus Mode"
            >
              <Zap className="w-4 h-4 md:w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors hidden lg:flex">
              <ListMusic className="w-4 h-4 md:w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 group/vol min-w-[100px] hidden lg:flex">
              <button onClick={() => setIsMuted(!isMuted)}>
                <VolumeIcon className="w-5 h-5 text-gray-400 group-hover/vol:text-white transition-colors" />
              </button>
              <div 
                className="flex-1 h-1 bg-white/10 rounded-full group/bar cursor-pointer relative"
                onClick={handleVolumeClick}
              >
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    isMuted ? "bg-gray-600" : "bg-white group-hover/bar:bg-[#1DB954]"
                  )} 
                  style={{ width: isMuted ? '0%' : `${volume}%` }} 
                />
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors hidden md:flex"
                title="Mini Player"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsCollapsed(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Collapse"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="mini-player"
          initial={{ scale: 0.8, opacity: 0, x: 100 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0.8, opacity: 0, x: 100 }}
          layoutId="player-container"
          drag
          dragConstraints={{ left: -window.innerWidth + 300, right: 0, top: -window.innerHeight + 200, bottom: 0 }}
          className={cn("fixed bottom-24 right-6 w-64 bg-[#181818] border border-white/10 rounded-2xl p-4 shadow-2xl z-[110] cursor-move group/mini", className)}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-black rounded-lg overflow-hidden shrink-0 border border-white/10 relative">
                {!isLoaded && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
                <img 
                  src={currentSubjectImage || `https://picsum.photos/seed/${currentSubject}/100/100`} 
                  alt={currentSubject}
                  onLoad={() => setIsLoaded(true)}
                  onError={() => setIsLoaded(true)}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-700",
                    isLoaded ? (isPlaying ? "scale-110 opacity-80" : "scale-100 opacity-40 grayscale") : "opacity-0 scale-110"
                  )}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{currentSubject || 'Select a Subject'}</p>
                <p className="text-[10px] text-gray-400 truncate">{isPlaying ? 'Deep Focus Session' : 'Paused'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                title="Collapse"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsMinimized(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                title="Restore"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-6">
              <button className="text-gray-400 hover:text-white transition-colors p-2">
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onTogglePause}
                className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#1DB954] transition-colors group"
              >
                {!isPaused ? (
                  <Pause className="w-5 h-5 text-black fill-current" />
                ) : (
                  <Play className="w-5 h-5 text-black fill-current ml-0.5" />
                )}
              </motion.button>
              <button className="text-gray-400 hover:text-white transition-colors p-2">
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-gray-500 tabular-nums">
                <span>{timeElapsed}</span>
                <span>{activeSession ? `-${timeRemaining}` : '1:30:00'}</span>
              </div>
              <div 
                className="h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-[#1DB954] transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="absolute -top-2 -left-2 opacity-0 group-hover/mini:opacity-100 transition-opacity">
            <div className="bg-[#1DB954] text-black text-[8px] font-bold px-2 py-0.5 rounded-full shadow-lg">
              DRAG ME
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
