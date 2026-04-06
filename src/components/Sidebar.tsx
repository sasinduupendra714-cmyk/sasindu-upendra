import React from 'react';
import { Home, BarChart2, Calendar, AlertCircle, Library, Plus, Search, Settings, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics' },
    { id: 'schedule', icon: Calendar, label: 'Schedule' },
    { id: 'syllabus', icon: Library, label: 'Syllabus' },
    { id: 'weak-areas', icon: AlertCircle, label: 'Weak Areas' },
    { id: 'achievements', icon: Trophy, label: 'Achievements' },
    { id: 'manage', icon: Settings, label: 'Manage' },
  ];

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
        className="hidden md:flex flex-col w-64 bg-black border-r border-white/10 h-full p-4 shrink-0"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-[#1DB954] rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full" />
          </div>
          <span className="text-xl font-bold tracking-tight">StudyFlow</span>
        </motion.div>

        <nav className="space-y-2 flex-1">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              variants={itemVariants}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group",
                activeTab === item.id
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "text-[#1DB954]" : "group-hover:text-[#1DB954]"
              )} />
              <span className="font-medium">{item.label}</span>
            </motion.button>
          ))}
        </nav>

        <motion.div variants={itemVariants} className="mt-auto pt-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Your Library</span>
              <Plus className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
            </div>
            <div className="space-y-3">
              {['Combined Maths', 'Physics', 'Chemistry'].map((subject) => (
                <motion.div 
                  key={subject} 
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                    {subject[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-white transition-colors">{subject}</p>
                    <p className="text-xs text-gray-500">Playlist • Sasi</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-white/10 px-2 py-1 flex items-center overflow-x-auto scrollbar-hide z-[60] pb-safe"
      >
        <div className="flex items-center justify-around min-w-full">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[72px] transition-colors shrink-0",
                activeTab === item.id ? "text-white" : "text-gray-500"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "text-[#1DB954]" : ""
              )} />
              <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </>
  );
}
