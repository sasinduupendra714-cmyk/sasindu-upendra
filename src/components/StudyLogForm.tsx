import React, { useState } from 'react';
import { X, Clock, Star, BookOpen, Save, AlertCircle } from 'lucide-react';
import { Subject } from '../types';

interface StudyLogFormProps {
  subjects: Subject[];
  onSave: (log: { subjectId: string, topicId: string, duration: number, focusLevel: number, notes: string }) => void;
  onClose: () => void;
}

export default function StudyLogForm({ subjects, onSave, onClose }: StudyLogFormProps) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [topicId, setTopicId] = useState(subjects[0]?.topics[0]?.id || '');
  const [duration, setDuration] = useState(90);
  const [focusLevel, setFocusLevel] = useState(4);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedSubject = subjects.find(s => s.id === subjectId);

  const handleSave = () => {
    if (!subjectId || !topicId) {
      setError('Please select a subject and topic');
      return;
    }
    if (duration <= 0) {
      setError('Duration must be greater than 0');
      return;
    }
    if (focusLevel < 1 || focusLevel > 5) {
      setError('Focus level must be between 1 and 5');
      return;
    }
    onSave({ subjectId, topicId, duration, focusLevel, notes });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181818] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#1DB954]/10 to-transparent">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1DB954]" />
            Log Study Session
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Subject</label>
              <select 
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  const sub = subjects.find(s => s.id === e.target.value);
                  if (sub) setTopicId(sub.topics[0]?.id || '');
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1DB954] outline-none"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Topic</label>
              <select 
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1DB954] outline-none"
              >
                {selectedSubject?.topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Duration (min)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#1DB954] outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Focus Level (1-5)</label>
              <div className="relative">
                <Star className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="number"
                  min="1"
                  max="5"
                  value={focusLevel}
                  onChange={(e) => setFocusLevel(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#1DB954] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notes / Key Takeaways</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you learn? Any difficult concepts?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-[#1DB954] outline-none resize-none"
            />
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-4 bg-[#1DB954] text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
          >
            <Save className="w-5 h-5" />
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
}
