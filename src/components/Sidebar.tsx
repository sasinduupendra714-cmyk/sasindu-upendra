import React, { useState, useCallback } from 'react';
import { Home, BarChart2, Calendar, AlertCircle, Library, Plus, Search, Settings, Trophy, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';

import { Subject } from '../types';
import Logo from './Logo';
import ImageWithFallback from './ImageWithFallback';

interface SidebarProps {
  subjects: Subject[];
  onSubjectClick: (id: string) => void;
}

const SubjectItem = React.memo(({ subject, isCollapsed, onClick }: { subject: Subject, isCollapsed: boolean, onClick: (id: string) => void }) => {
  return (
    <motion.div 
      whileHover={{ x: isCollapsed ? 0 : 4, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(subject.id)}
      className={cn(
        "flex items-center gap-3 group cursor-pointer p-1.5 rounded-xl hover:bg-white/10 transition-all border border-transparent", 
        isCollapsed && "justify-center p-0 w-14 h-14 hover:border-[#1DB954]/50 hover:shadow-[0_0_15px_rgba(29,185,84,0.3)]"
      )}
      title={isCollapsed ? subject.name : undefined}
    >
      <div className={cn(
        "rounded-xl flex items-center justify-center text-xs font-black text-white transition-all shadow-lg shrink-0 overflow-hidden relative",
        isCollapsed ? "w-14 h-14" : "w-10 h-10"
      )}>
        <ImageWithFallback
          src={subject.image}
          alt={subject.name}
          containerClassName="w-full h-full"
          className="group-hover:scale-110 transition-transform duration-500"
          fallbackGradient={subject.gradient}
          fallbackText={subject.name[0]}
          showBlur={false}
        />
      </div>
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate group-hover:text-[#1DB954] transition-colors">{subject.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">{subject.topics.length} Topics</span>
            <span className="w-1 h-1 bg-gray-700 rounded-full" />
            <span className={cn(
              "text-[9px] font-bold",
              subject.readiness > 70 ? "text-[#1DB954]" : "text-yellow-500"
            )}>{subject.readiness}% Ready</span>
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default React.memo(function Sidebar({ subjects, onSubjectClick }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics', path: '/analytics' },
    { id: 'schedule', icon: Calendar, label: 'Schedule', path: '/schedule' },
    { id: 'syllabus', icon: Library, label: 'Syllabus', path: '/syllabus' },
    { id: 'practice', icon: BookOpen, label: 'Practice', path: '/practice' },
    { id: 'weak-areas', icon: AlertCircle, label: 'Weak Areas', path: '/weak-areas' },
    { id: 'achievements', icon: Trophy, label: 'Achievements', path: '/achievements' },
    { id: 'manage', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = useCallback((path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  }, [location.pathname]);

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className={cn(
          "hidden md:flex flex-col bg-black border-r border-white/10 h-full shrink-0 transition-all duration-500 ease-in-out relative group/sidebar overflow-y-auto scrollbar-hide",
          isCollapsed ? "w-20 p-3" : "w-64 p-4"
        )}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center text-black shadow-xl opacity-0 group-hover/sidebar:opacity-100 transition-opacity z-50 hover:scale-110 active:scale-90"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <motion.div variants={itemVariants} className={cn("flex items-center gap-3 mb-8 px-2", isCollapsed && "justify-center px-0")}>
          <div className="w-11 h-11 bg-[#1DB954] rounded-full flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(29,185,84,0.3)] group-hover/sidebar:shadow-[0_0_40px_rgba(29,185,84,0.6)] transition-all duration-700 hover:scale-110 active:scale-95 cursor-pointer">
            <Logo className="w-7 h-7 text-black" />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent"
            >
              StudyFlow
            </motion.span>
          )}
        </motion.div>

        <nav className="space-y-1.5 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group relative",
                isActive(item.path)
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-gray-400 hover:text-white"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {isActive(item.path) && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-[#1DB954] rounded-r-full shadow-[0_0_10px_rgba(29,185,84,0.5)]"
                >
                  <motion.div 
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-[#1DB954] blur-sm rounded-r-full"
                  />
                </motion.div>
              )}
              <item.icon className={cn(
                "w-5 h-5 shrink-0 transition-colors duration-300",
                isActive(item.path) ? "text-[#1DB954]" : "group-hover:text-[#1DB954]"
              )} />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={cn(
                      "font-bold text-sm tracking-tight whitespace-nowrap",
                      isActive(item.path) ? "text-white" : "text-gray-400"
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          ))}
        </nav>

        <motion.div variants={itemVariants} className="mt-auto pt-4 border-t border-white/10">
          <div className={cn(
            "bg-white/5 rounded-2xl transition-all duration-300", 
            isCollapsed ? "p-2" : "p-4"
          )}>
            {!isCollapsed && (
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Library className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Your Library</span>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                </motion.button>
              </div>
            )}
            <div className={cn("space-y-1", isCollapsed && "space-y-4 flex flex-col items-center")}>
              {subjects.map((subject) => (
                <SubjectItem 
                  key={subject.id} 
                  subject={subject} 
                  isCollapsed={isCollapsed} 
                  onClick={onSubjectClick} 
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-white/5 px-1 py-1 flex items-center overflow-x-auto scrollbar-hide z-[60] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-around min-w-full gap-1">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 px-1 min-w-[68px] transition-all duration-500 shrink-0 relative rounded-xl",
                isActive(item.path) ? "text-white" : "text-gray-500 active:bg-white/5"
              )}
            >
              {isActive(item.path) && (
                <motion.div 
                  layoutId="mobile-active-indicator"
                  className="absolute inset-0 bg-white/10 rounded-xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn(
                "w-5 h-5 transition-all duration-500",
                isActive(item.path) ? "text-[#1DB954] scale-110 drop-shadow-[0_0_8px_rgba(29,185,84,0.5)]" : "group-active:scale-90"
              )} />
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-500",
                isActive(item.path) ? "opacity-100 translate-y-0 text-[#1DB954]" : "opacity-40"
              )}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  );
});
