import React from 'react';
import { Play, MoreHorizontal, CheckCircle2, Clock, Link as LinkIcon } from 'lucide-react';
import { Topic } from '../types';
import { motion } from 'motion/react';

interface TopicCardProps {
  topic: Topic;
  subjectName: string;
  onStartFocus: () => void;
}

export default function TopicCard({ topic, subjectName, onStartFocus }: TopicCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group bg-[#181818] hover:bg-[#282828] p-4 rounded-xl transition-all duration-300 relative hover:shadow-2xl hover:shadow-black/50 border border-transparent hover:border-white/10"
    >
      <div className="relative aspect-square mb-4 rounded-lg overflow-hidden shadow-2xl">
        <img 
          src={topic.image || `https://picsum.photos/seed/${topic.id}/400/400`} 
          alt={topic.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onStartFocus();
          }}
          className="absolute bottom-2 right-2 w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-2xl md:translate-y-12 md:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95 z-10"
        >
          <Play className="w-5 h-5 text-black fill-current ml-1" />
        </button>

        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {topic.mastery >= 80 && (
            <div className="p-1.5 bg-[#1DB954] rounded-full shadow-lg">
              <CheckCircle2 className="w-3 h-3 text-black" />
            </div>
          )}
          {topic.resources && topic.resources.length > 0 && (
            <div className="p-1.5 bg-black/40 backdrop-blur-md rounded-full shadow-lg flex items-center gap-1 px-2">
              <LinkIcon className="w-3 h-3 text-[#1DB954]" />
              <span className="text-[10px] font-bold text-white">{topic.resources.length}</span>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[60px]">
        <h4 className="font-bold text-sm mb-1 line-clamp-1 group-hover:text-[#1DB954] transition-colors">{topic.title}</h4>
        <p className="text-xs text-gray-400 line-clamp-1">{subjectName}</p>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold">
          <span>Mastery</span>
          <span>{topic.mastery}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: `${topic.mastery}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className="h-full bg-[#1DB954]" 
          />
        </div>
      </div>

      <button className="absolute top-4 right-4 p-2 text-white/0 group-hover:text-white transition-colors">
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
