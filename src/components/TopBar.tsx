import React, { useState } from 'react';
import { Search, Bell, User, Zap, PlusCircle, X, Star, Flame } from 'lucide-react';

interface TopBarProps {
  onAutoPlan: () => void;
  onLogSession: () => void;
  onStartFocus: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  points: number;
  streak: number;
}

export default function TopBar({ onAutoPlan, onLogSession, onStartFocus, searchQuery, onSearchChange, points, streak }: TopBarProps) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex items-center justify-between p-4 md:p-6 bg-black/40 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        {/* Desktop Search */}
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search for subjects, topics, or papers"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white/10 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#1DB954] transition-all"
          />
        </div>

        {/* Mobile Search Toggle */}
        <div className="md:hidden flex items-center gap-2">
          {!isSearchVisible ? (
            <>
              <h1 className="text-xl font-bold truncate">{greeting()}</h1>
              <button 
                onClick={() => setIsSearchVisible(true)}
                className="p-2 bg-white/5 rounded-full"
              >
                <Search className="w-5 h-5 text-gray-400" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full animate-in slide-in-from-left-2 duration-200">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-white/10 border-none rounded-full py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#1DB954]"
                />
              </div>
              <button onClick={() => setIsSearchVisible(false)} className="p-1">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {!isSearchVisible && (
        <div className="flex items-center gap-2 md:gap-4 ml-2">
          <button
            onClick={onLogSession}
            className="flex items-center justify-center w-9 h-9 md:w-auto md:px-4 md:py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-all"
            title="Log Session"
          >
            <PlusCircle className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden sm:inline ml-2">Log Session</span>
          </button>

          <button
            onClick={onStartFocus}
            className="flex items-center justify-center w-9 h-9 md:w-auto md:px-4 md:py-2 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] rounded-full text-sm font-bold transition-all border border-[#1DB954]/20"
            title="Focus"
          >
            <Zap className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden sm:inline ml-2">Focus</span>
          </button>

          <button
            onClick={onAutoPlan}
            className="px-3 py-1.5 md:px-6 md:py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full text-xs md:text-sm font-bold transition-all transform hover:scale-105 active:scale-95"
          >
            Auto Plan
          </button>

          <div className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[#1DB954] fill-[#1DB954]" />
              <span className="text-sm font-bold">{points}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-sm font-bold">{streak}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-full border border-white/10 shrink-0">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold">
              S
            </div>
            <span className="text-xs md:text-sm font-bold pr-2 hidden md:inline">Sasi</span>
          </div>
        </div>
      )}
    </div>
  );
}
