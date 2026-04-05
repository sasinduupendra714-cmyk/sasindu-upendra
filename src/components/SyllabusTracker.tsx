import React from 'react';
import { CheckCircle2, Circle, BookOpen, TrendingUp, Target, AlertCircle, ExternalLink, Video, FileText, Link as LinkIcon, X } from 'lucide-react';
import { Subject, Resource, Topic } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SyllabusTrackerProps {
  subjects: Subject[];
  onUpdateMastery: (subjectId: string, topicId: string, mastery: number) => void;
}

export default function SyllabusTracker({ subjects, onUpdateMastery }: SyllabusTrackerProps) {
  const [selectedTopic, setSelectedTopic] = React.useState<{ subject: Subject, topic: Topic } | null>(null);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Syllabus Tracker</h2>
          <p className="text-gray-400">Track your progress across the A/L Physical Science stream.</p>
        </div>
        <div className="flex items-center gap-4 bg-[#181818] p-4 rounded-2xl border border-white/5">
          <div className="text-center px-4 border-r border-white/10">
            <p className="text-2xl font-bold text-[#1DB954]">
              {subjects.length > 0 ? Math.round(subjects.reduce((acc, s) => acc + s.readiness, 0) / subjects.length) : 0}%
            </p>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Overall Readiness</p>
          </div>
          <div className="text-center px-4">
            <p className="text-2xl font-bold text-blue-500">
              {subjects.reduce((acc, s) => acc + s.topics.filter(t => t.mastery >= 80).length, 0)}
            </p>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Topics Mastered</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-[#181818] rounded-3xl border border-white/5 overflow-hidden">
            <div className={cn("p-6 flex items-center justify-between bg-gradient-to-r", subject.gradient)}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{subject.name}</h3>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{subject.topics.length} Topics Total</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{Math.round(subject.readiness)}%</p>
                <p className="text-[10px] font-bold text-white/60 uppercase">Subject Mastery</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subject.topics.map((topic) => (
                <div 
                  key={topic.id}
                  className="group bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-sm leading-tight flex-1 pr-4">{topic.title}</h4>
                    <div className="flex items-center gap-2">
                      {topic.resources && topic.resources.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded text-[8px] font-bold text-gray-500">
                          <div className="flex items-center -space-x-0.5">
                            {Array.from(new Set(topic.resources.map(r => r.type))).map(type => (
                              <div key={type} className="p-0.5">
                                {type === 'video' ? <Video className="w-2 h-2 text-red-500" /> :
                                 type === 'pdf' ? <FileText className="w-2 h-2 text-blue-500" /> :
                                 <LinkIcon className="w-2 h-2 text-[#1DB954]" />}
                              </div>
                            ))}
                          </div>
                          <span>{topic.resources.length}</span>
                        </div>
                      )}
                      {topic.mastery >= 80 ? (
                        <CheckCircle2 className="w-5 h-5 text-[#1DB954]" />
                      ) : topic.mastery >= 50 ? (
                        <TrendingUp className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase">
                      <span>Mastery Level</span>
                      <span className={cn(
                        topic.mastery >= 80 ? "text-[#1DB954]" : topic.mastery >= 50 ? "text-yellow-500" : "text-red-500"
                      )}>{topic.mastery}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={topic.mastery}
                      onChange={(e) => onUpdateMastery(subject.id, topic.id, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#1DB954]"
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedTopic({ subject, topic })}
                      className="text-[10px] font-bold text-[#1DB954] hover:underline uppercase tracking-widest"
                    >
                      View Resources
                    </button>
                    <span className="text-gray-700">•</span>
                    <button className="text-[10px] font-bold text-[#1DB954] hover:underline uppercase tracking-widest">Past Papers</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Resources Modal */}
      <AnimatePresence>
        {selectedTopic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTopic(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#181818] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className={cn("p-8 bg-gradient-to-r relative", selectedTopic.subject.gradient)}>
                <button 
                  onClick={() => setSelectedTopic(null)}
                  className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">{selectedTopic.subject.name}</p>
                    <h3 className="text-2xl font-bold">{selectedTopic.topic.title}</h3>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Study Resources</h4>
                  {(!selectedTopic.topic.resources || selectedTopic.topic.resources.length === 0) ? (
                    <div className="bg-white/5 rounded-2xl p-8 text-center border border-dashed border-white/10">
                      <LinkIcon className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No resources added for this topic yet.</p>
                      <p className="text-xs text-gray-600 mt-1">Add links, videos, or PDFs in the Manage tab.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedTopic.topic.resources.map(resource => (
                        <a 
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border transition-all group",
                            resource.type === 'video' ? "border-red-500/10 hover:border-red-500/20" :
                            resource.type === 'pdf' ? "border-blue-500/10 hover:border-blue-500/20" :
                            "border-[#1DB954]/10 hover:border-[#1DB954]/20"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                            resource.type === 'video' ? "bg-red-500/10 text-red-500" :
                            resource.type === 'pdf' ? "bg-blue-500/10 text-blue-500" :
                            "bg-[#1DB954]/10 text-[#1DB954]"
                          )}>
                            {resource.type === 'video' ? <Video className="w-5 h-5" /> :
                             resource.type === 'pdf' ? <FileText className="w-5 h-5" /> :
                             <LinkIcon className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{resource.title}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">{resource.type}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Topic Mastery</h4>
                    <span className="text-sm font-bold text-[#1DB954]">{selectedTopic.topic.mastery}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedTopic.topic.mastery}%` }}
                      className="h-full bg-[#1DB954]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
