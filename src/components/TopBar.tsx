import React, { useState } from 'react';
import { Search, Bell, User, Zap, PlusCircle, X, Star, Flame, LogOut, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';

interface TopBarProps {
  onAutoPlan: () => void;
  onLogSession: () => void;
  onStartFocus: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  points: number;
  streak: number;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function TopBar({ onAutoPlan, onLogSession, onStartFocus, searchQuery, onSearchChange, points, streak, user, onLogin, onLogout }: TopBarProps) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSearchVisible(true)}
                className="p-2 bg-white/5 rounded-full"
              >
                <Search className="w-5 h-5 text-gray-400" />
              </motion.button>
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
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={() => setIsSearchVisible(false)} 
                className="p-1"
              >
                <X className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {!isSearchVisible && (
        <div className="flex items-center gap-1.5 md:gap-4 ml-2">
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogSession}
            className="flex items-center justify-center w-8 h-8 md:w-auto md:px-4 md:py-2 bg-white/10 rounded-full text-sm font-bold transition-all"
            title="Log Session"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden lg:inline ml-2">Log Session</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(29, 185, 84, 0.15)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartFocus}
            className="flex items-center justify-center w-8 h-8 md:w-auto md:px-4 md:py-2 bg-[#1DB954]/10 text-[#1DB954] rounded-full text-sm font-bold transition-all border border-[#1DB954]/20"
            title="Focus"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden lg:inline ml-2">Focus</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#1ed760' }}
            whileTap={{ scale: 0.95 }}
            onClick={onAutoPlan}
            className="px-3 py-1.5 md:px-6 md:py-2 bg-[#1DB954] text-black rounded-full text-[10px] md:text-sm font-bold transition-all transform whitespace-nowrap"
          >
            Auto Plan
          </motion.button>

          <motion.div 
            whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            className="hidden sm:flex items-center gap-2 md:gap-3 bg-white/5 border border-white/10 rounded-full px-2 md:px-4 py-1.5 transition-colors"
          >
            <div className="flex items-center gap-1 md:gap-1.5">
              <Star className="w-3 h-3 md:w-4 md:h-4 text-[#1DB954] fill-[#1DB954]" />
              <motion.span 
                key={points}
                initial={{ scale: 1.2, color: '#1DB954' }}
                animate={{ scale: 1, color: '#fff' }}
                className="text-[10px] md:text-sm font-bold"
              >
                {points}
              </motion.span>
            </div>
            <div className="w-px h-3 md:h-4 bg-white/10" />
            <div className="flex items-center gap-1 md:gap-1.5">
              <Flame className="w-3 h-3 md:w-4 md:h-4 text-orange-500 fill-orange-500" />
              <motion.span 
                key={streak}
                initial={{ scale: 1.2, color: '#f97316' }}
                animate={{ scale: 1, color: '#fff' }}
                className="text-[10px] md:text-sm font-bold"
              >
                {streak}
              </motion.span>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <div className="relative">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 bg-black/40 p-0.5 md:p-1 rounded-full border border-white/10 shrink-0 hover:border-[#1DB954]/50 transition-all"
                >
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[8px] md:text-xs font-bold">{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-bold pr-2 hidden xl:inline truncate max-w-[100px]">
                    {user.displayName?.split(' ')[0] || 'User'}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 bg-[#282828] rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-3 border-b border-white/5">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                          <p className="text-sm font-bold truncate">{user.displayName || user.email}</p>
                        </div>
                        <motion.button 
                          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                          onClick={() => {
                            onLogout();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full p-3 flex items-center gap-3 text-sm font-bold text-red-400 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </motion.button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogin}
                className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] text-black rounded-full text-xs md:text-sm font-bold transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
