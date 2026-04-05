import React from 'react';
import { Zap, Clock, Target, BookOpen, CheckCircle2, ChevronRight, Play, Calendar } from 'lucide-react';
import { Subject, Activity } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface PlannerProps {
  prioritySubject: Subject | null;
  dailyPlan: Activity[];
  onStartFocus: (subjectId: string) => void;
  onViewFullSchedule: () => void;
}

export default function Planner({ prioritySubject, dailyPlan, onStartFocus, onViewFullSchedule }: PlannerProps) {
  const studyBlocks = dailyPlan.filter(a => a.type === 'study');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* AI Planner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1DB954] to-[#191414] p-8 shadow-2xl group">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Zap className="w-48 h-48 text-white" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-white">
              AI Study Planner
            </div>
            {prioritySubject && (
              <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-white">
                Priority: {prioritySubject.name}
              </div>
            )}
          </div>

          <h2 className="text-4xl font-black mb-4 tracking-tight">Your Daily Focus Plan</h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl">
            Based on your weekly schedule and current mastery, we've optimized your blocks for maximum retention.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Deep Work', 'Weak Topic', 'Timed Practice', 'Revision'].map((label, i) => (
              <div key={label} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/20 transition-all cursor-default">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-white/60">Block {i + 1}</span>
                  <Clock className="w-3 h-3 text-white/60" />
                </div>
                <p className="font-bold text-lg">{label}</p>
                <p className="text-xs text-white/60 mt-1">90 Min Sprint</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Schedule List */}
      <div className="bg-[#181818] rounded-3xl p-8 border border-white/5">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold">Today's Schedule</h3>
          <div className="flex items-center gap-4">
            <button 
              onClick={onViewFullSchedule}
              className="text-xs font-bold text-[#1DB954] hover:underline"
            >
              View Full Schedule
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {dailyPlan.map((activity, index) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={activity.id}
              className={cn(
                "group flex items-center gap-6 p-4 rounded-2xl transition-all duration-300",
                activity.type === 'study' ? "bg-white/5 hover:bg-white/10" : "opacity-60 hover:opacity-100"
              )}
            >
              <div className="w-24 text-sm font-bold text-gray-500 tabular-nums">
                {activity.time.split(' – ')[0]}
              </div>
              
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                activity.type === 'study' ? "bg-[#1DB954]/20 text-[#1DB954]" :
                activity.type === 'tuition' ? "bg-blue-500/20 text-blue-500" :
                activity.type === 'break' ? "bg-yellow-500/20 text-yellow-500" :
                "bg-gray-500/20 text-gray-500"
              )}>
                {activity.type === 'study' ? <BookOpen className="w-6 h-6" /> :
                 activity.type === 'tuition' ? <Zap className="w-6 h-6" /> :
                 activity.type === 'break' ? <Clock className="w-6 h-6" /> :
                 <CheckCircle2 className="w-6 h-6" />}
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-lg">{activity.description}</h4>
                <p className="text-sm text-gray-500 capitalize">{activity.type}</p>
              </div>

              {activity.type === 'study' && (
                <button 
                  onClick={() => onStartFocus(prioritySubject?.id || '')}
                  className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-all transform md:translate-x-4 group-hover:translate-x-0 shrink-0"
                >
                  <Play className="w-4 h-4 text-black fill-current ml-0.5" />
                </button>
              )}
              
              <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-gray-400 transition-colors" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
