import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Save, X, Calendar, Clock, 
  BookOpen, Coffee, Zap, Moon, ChevronRight, ChevronDown, 
  ChevronUp, BarChart2, History, AlertCircle, GripVertical, CheckSquare, Square, User, Trophy, Star, Link as LinkIcon, FileText, Video, Search
} from 'lucide-react';
import { Subject, WeeklySchedule, Activity, StudyLog, Topic, ExamRecord, Resource } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ConfirmationModal from './ConfirmationModal';

interface ManageDataProps {
  subjects: Subject[];
  schedule: WeeklySchedule;
  studyLogs: StudyLog[];
  onUpdateSchedule: (day: keyof WeeklySchedule, activities: Activity[]) => void;
  onDeleteLog: (id: string) => void;
  onClearLogs: () => void;
  onAddLog: (log: { subjectId: string, topicId: string, duration: number, focusLevel: number, notes: string }) => void;
  // Existing subject handlers
  onAddSubject: (name: string, image?: string) => void;
  onEditSubject: (id: string, name: string, image?: string) => void;
  onDeleteSubject: (id: string) => void;
  onAddTopic: (subjectId: string, title: string, image?: string) => void;
  onEditTopic: (subjectId: string, topicId: string, title: string, mastery: number, image?: string, resources?: Resource[]) => void;
  onDeleteTopic: (subjectId: string, topicId: string) => void;
  onUpdateResources: (subjectId: string, topicId: string, resources: Resource[]) => void;
  onResetSyllabus: () => void;
  onResetProfile: () => void;
  exams: ExamRecord[];
  onAddExam: (exam: Omit<ExamRecord, 'id'>) => void;
  onEditExam: (id: string, updatedExam: Partial<ExamRecord>) => void;
  onDeleteExam: (id: string) => void;
}

type ManageTab = 'syllabus' | 'schedule' | 'logs' | 'profile' | 'exams';

export default function ManageData({
  subjects,
  schedule,
  studyLogs,
  onUpdateSchedule,
  onDeleteLog,
  onClearLogs,
  onAddLog,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onUpdateResources,
  onResetSyllabus,
  onResetProfile,
  exams,
  onAddExam,
  onEditExam,
  onDeleteExam
}: ManageDataProps) {
  const [activeSubTab, setActiveSubTab] = useState<ManageTab>('syllabus');
  const [expandedDay, setExpandedDay] = useState<keyof WeeklySchedule | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ subjectId: string, topicId: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicImage, setEditTopicImage] = useState('');
  const [editTopicMastery, setEditTopicMastery] = useState(0);
  const [editTopicResources, setEditTopicResources] = useState<Resource[]>([]);
  const [newResource, setNewResource] = useState<{ title: string, url: string, type: Resource['type'] }>({ title: '', url: '', type: 'link' });
  
  // Resource Modal State
  const [resourceModal, setResourceModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    topicId: string;
    topicTitle: string;
    resources: Resource[];
  } | null>(null);
  
  // Search State
  const [syllabusSearch, setSyllabusSearch] = useState('');
  const [logsSearch, setLogsSearch] = useState('');
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Bulk Selection State
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  
  // Error State
  const [error, setError] = useState<string | null>(null);

  // Exam Form State
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [examMarks, setExamMarks] = useState<{ subjectId: string, score: number }[]>([]);
  const [examRank, setExamRank] = useState<string>('');
  const [examNotes, setExamNotes] = useState('');
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Load draft notes on mount
  useEffect(() => {
    const draft = localStorage.getItem('studyflow_exam_notes_draft');
    setHasDraft(!!draft);
  }, []);

  const handleSaveDraft = () => {
    localStorage.setItem('studyflow_exam_notes_draft', examNotes);
    setIsDraftSaved(true);
    setHasDraft(true);
    setTimeout(() => setIsDraftSaved(false), 2000);
  };

  const handleLoadDraft = () => {
    const draft = localStorage.getItem('studyflow_exam_notes_draft');
    if (draft) {
      setExamNotes(draft);
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('studyflow_exam_notes_draft');
    setHasDraft(false);
  };

  const resetExamForm = () => {
    setIsAddingExam(false);
    setEditingExamId(null);
    setExamTitle('');
    setExamDate(new Date().toISOString().split('T')[0]);
    setExamMarks(subjects.map(s => ({ subjectId: s.id, score: 0 })));
    setExamRank('');
    setExamNotes('');
    setError(null);
  };

  const handleSaveExam = () => {
    setError(null);

    if (!examTitle.trim()) {
      setError("Exam title is required.");
      return;
    }

    if (!examDate) {
      setError("Exam date is required.");
      return;
    }

    // Validate marks
    const invalidMark = examMarks.find(m => m.score < 0 || m.score > 100);
    if (invalidMark) {
      const subject = subjects.find(s => s.id === invalidMark.subjectId);
      setError(`Invalid score for ${subject?.name}. Must be between 0 and 100.`);
      return;
    }

    // Validate rank
    if (examRank && (isNaN(parseInt(examRank)) || parseInt(examRank) <= 0)) {
      setError("Rank must be a positive number.");
      return;
    }

    const totalScore = examMarks.reduce((acc, m) => acc + m.score, 0);
    const averageScore = examMarks.length > 0 ? totalScore / examMarks.length : 0;

    const examData = {
      title: examTitle,
      date: examDate,
      marks: examMarks,
      totalScore,
      averageScore,
      rank: examRank ? parseInt(examRank) : undefined,
      notes: examNotes
    };

    if (editingExamId) {
      onEditExam(editingExamId, examData);
    } else {
      onAddExam(examData);
    }

    resetExamForm();
    setError(null);
    localStorage.removeItem('studyflow_exam_notes_draft');
    setHasDraft(false);
  };

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, day: keyof WeeklySchedule) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = schedule[day].findIndex(a => a.id === active.id);
      const newIndex = schedule[day].findIndex(a => a.id === over.id);
      onUpdateSchedule(day, arrayMove(schedule[day], oldIndex, newIndex));
    }
  };

  // Schedule Editing State
  const [editingActivity, setEditingActivity] = useState<{day: keyof WeeklySchedule, id: string} | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<Activity['type']>('study');

  const [isAddingActivity, setIsAddingActivity] = useState<keyof WeeklySchedule | null>(null);
  const [newTime, setNewTime] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<Activity['type']>('study');

  const days: (keyof WeeklySchedule)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleAddActivity = (day: keyof WeeklySchedule) => {
    if (!newTime || !newDesc) {
      setError("Time and description are required.");
      return;
    }
    
    // Basic time format validation (e.g. 08:00 AM - 10:00 AM)
    const timeRegex = /^\d{1,2}:\d{2}\s*(?:AM|PM)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM)$/i;
    if (!timeRegex.test(newTime)) {
      setError("Invalid time format. Use '08:00 AM – 10:00 AM'.");
      return;
    }

    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      time: newTime,
      description: newDesc,
      type: newType
    };
    onUpdateSchedule(day, [...schedule[day], newActivity]);
    setIsAddingActivity(null);
    setNewTime('');
    setNewDesc('');
    setError(null);
  };

  const handleCopyDay = (from: keyof WeeklySchedule, to: keyof WeeklySchedule) => {
    setConfirmModal({
      isOpen: true,
      title: 'Copy Schedule',
      message: `Copy all activities from ${from} to ${to}? This will overwrite ${to}'s current schedule.`,
      onConfirm: () => {
        const copied = schedule[from].map(a => ({ ...a, id: Math.random().toString(36).substr(2, 9) }));
        onUpdateSchedule(to, copied);
      },
      variant: 'warning'
    });
  };

  const handleSaveActivity = (day: keyof WeeklySchedule, id: string) => {
    const timeRegex = /^\d{1,2}:\d{2}\s*(?:AM|PM)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM)$/i;
    if (!timeRegex.test(editTime)) {
      setError("Invalid time format. Use '08:00 AM – 10:00 AM'.");
      return;
    }

    const updated = schedule[day].map(a => 
      a.id === id ? { ...a, time: editTime, description: editDesc, type: editType } : a
    );
    onUpdateSchedule(day, updated);
    setEditingActivity(null);
    setError(null);
  };

  const handleDeleteActivity = (day: keyof WeeklySchedule, id: string) => {
    onUpdateSchedule(day, schedule[day].filter(a => a.id !== id));
  };

  const handleAddSubject = (name: string, img?: string) => {
    if (!name.trim()) {
      setError("Subject name cannot be empty.");
      return;
    }
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      setError(`Subject "${name}" already exists.`);
      return;
    }
    onAddSubject(name, img);
    setError(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 text-sm font-bold"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-white"><X className="w-4 h-4" /></button>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black mb-2 tracking-tight">Data Control Center</h2>
          <p className="text-gray-400">Fine-tune your syllabus, weekly schedule, and study history.</p>
        </div>
        
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto scrollbar-hide">
          {(['syllabus', 'schedule', 'logs', 'exams', 'profile'] as ManageTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all capitalize whitespace-nowrap",
                activeSubTab === tab ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
              )}
            >
              {tab === 'profile' ? 'Profile' : tab === 'exams' ? 'Exams' : tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'syllabus' && (
          <motion.div
            key="syllabus"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Reusing existing syllabus logic but styled for this view */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#1DB954]" />
                  Subject & Topic Management
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text"
                      placeholder="Search subjects or topics..."
                      value={syllabusSearch}
                      onChange={(e) => setSyllabusSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1DB954] transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Reset Syllabus',
                      message: 'Are you sure you want to reset the syllabus to defaults? This will erase your current progress.',
                      onConfirm: onResetSyllabus
                    })} 
                    className="text-xs font-bold text-red-500 hover:underline whitespace-nowrap"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
              
              {/* Add Subject UI */}
              <div className="bg-[#181818] p-6 rounded-2xl border border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    id="new-subject-name"
                    type="text" 
                    placeholder="New Subject Name" 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:ring-1 focus:ring-[#1DB954]"
                  />
                  <input 
                    id="new-subject-image"
                    type="text" 
                    placeholder="Image URL (Optional)" 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:ring-1 focus:ring-[#1DB954]"
                  />
                  <button 
                    onClick={() => {
                      const name = (document.getElementById('new-subject-name') as HTMLInputElement).value;
                      const img = (document.getElementById('new-subject-image') as HTMLInputElement).value;
                      handleAddSubject(name, img);
                      if (name) {
                        (document.getElementById('new-subject-name') as HTMLInputElement).value = '';
                        (document.getElementById('new-subject-image') as HTMLInputElement).value = '';
                      }
                    }}
                    className="bg-[#1DB954] text-black font-bold rounded-xl py-2 hover:scale-105 transition-transform"
                  >
                    Add Subject
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {subjects
                  .filter(s => {
                    const searchLower = syllabusSearch.toLowerCase();
                    const subjectMatch = s.name.toLowerCase().includes(searchLower);
                    const topicMatch = s.topics.some(t => t.title.toLowerCase().includes(searchLower));
                    return subjectMatch || topicMatch;
                  })
                  .map(s => (
                  <div key={s.id} className="bg-[#181818] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden">
                          <img src={s.image || `https://picsum.photos/seed/${s.id}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        {editingSubject === s.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                            />
                            <input 
                              type="text" 
                              value={editImage} 
                              onChange={(e) => setEditImage(e.target.value)}
                              placeholder="Image URL"
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                            />
                            <button 
                              onClick={() => {
                                onEditSubject(s.id, editName, editImage);
                                setEditingSubject(null);
                              }}
                              className="p-1 text-[#1DB954] hover:bg-white/5 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingSubject(null)}
                              className="p-1 text-red-500 hover:bg-white/5 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold">{s.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingSubject(s.id);
                            setEditName(s.name);
                            setEditImage(s.image || '');
                          }}
                          className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setExpandedSubject(expandedSubject === s.id ? null : s.id)}
                          className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                          {expandedSubject === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: 'Delete Subject',
                            message: `Are you sure you want to delete "${s.name}"? All associated topics and progress will be lost.`,
                            onConfirm: () => onDeleteSubject(s.id)
                          })} 
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedSubject === s.id && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="border-t border-white/5 overflow-hidden"
                        >
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 gap-2">
                              {s.topics.map(topic => (
                                <div key={topic.id} className="flex flex-col p-3 bg-white/5 rounded-xl gap-3">
                                  <div className="flex items-center justify-between">
                                    {editingTopic?.topicId === topic.id ? (
                                      <div className="flex flex-col gap-2 flex-1 mr-4">
                                        <input 
                                          type="text" 
                                          value={editTopicTitle} 
                                          onChange={(e) => setEditTopicTitle(e.target.value)}
                                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                                        />
                                        <input 
                                          type="text" 
                                          value={editTopicImage} 
                                          onChange={(e) => setEditTopicImage(e.target.value)}
                                          placeholder="Topic Image URL"
                                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                                        />
                                        <div className="mt-2 space-y-2">
                                          <p className="text-[10px] font-bold text-gray-500 uppercase">Resources</p>
                                          <div className="space-y-1">
                                            {editTopicResources.map(res => (
                                              <div key={res.id} className="flex items-center justify-between p-2 bg-black/20 rounded-lg group/res">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                  {res.type === 'video' ? <Video className="w-3 h-3 text-red-500" /> : 
                                                   res.type === 'pdf' ? <FileText className="w-3 h-3 text-blue-500" /> : 
                                                   <LinkIcon className="w-3 h-3 text-[#1DB954]" />}
                                                  <span className="text-xs truncate">{res.title}</span>
                                                </div>
                                                <button 
                                                  onClick={() => setEditTopicResources(editTopicResources.filter(r => r.id !== res.id))}
                                                  className="p-1 text-gray-500 hover:text-red-500 opacity-0 group-hover/res:opacity-100 transition-opacity"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex flex-col gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                                            <div className="flex gap-2">
                                              <input 
                                                type="text" 
                                                placeholder="Resource Title"
                                                value={newResource.title}
                                                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                                                className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-[#1DB954]"
                                              />
                                              <select 
                                                value={newResource.type}
                                                onChange={(e) => setNewResource({ ...newResource, type: e.target.value as Resource['type'] })}
                                                className="bg-black/40 border border-white/10 rounded px-1 py-1 text-[10px] outline-none focus:ring-1 focus:ring-[#1DB954]"
                                              >
                                                <option value="link">Link</option>
                                                <option value="video">Video</option>
                                                <option value="pdf">PDF</option>
                                                <option value="other">Other</option>
                                              </select>
                                            </div>
                                            <div className="flex gap-2">
                                              <input 
                                                type="text" 
                                                placeholder="URL"
                                                value={newResource.url}
                                                onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                                                className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-[#1DB954]"
                                              />
                                              <button 
                                                onClick={() => {
                                                  if (newResource.title && newResource.url) {
                                                    setEditTopicResources([...editTopicResources, { ...newResource, id: Math.random().toString(36).substr(2, 9) }]);
                                                    setNewResource({ title: '', url: '', type: 'link' });
                                                  }
                                                }}
                                                className="p-1 bg-[#1DB954] text-black rounded hover:scale-105 transition-transform"
                                              >
                                                <Plus className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3">
                                        {topic.image && (
                                          <img src={topic.image} alt="" className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                                        )}
                                        <p className="text-sm font-bold">{topic.title}</p>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      {editingTopic?.topicId === topic.id ? (
                                        <>
                                          <button 
                                            onClick={() => {
                                              onEditTopic(s.id, topic.id, editTopicTitle, editTopicMastery, editTopicImage, editTopicResources);
                                              setEditingTopic(null);
                                            }}
                                            className="p-1 text-[#1DB954] hover:bg-white/5 rounded"
                                          >
                                            <Save className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => setEditingTopic(null)}
                                            className="p-1 text-red-500 hover:bg-white/5 rounded"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <button 
                                          onClick={() => {
                                            setEditingTopic({ subjectId: s.id, topicId: topic.id });
                                            setEditTopicTitle(topic.title);
                                            setEditTopicImage(topic.image || '');
                                            setEditTopicMastery(topic.mastery);
                                            setEditTopicResources(topic.resources || []);
                                          }}
                                          className="p-1 text-gray-500 hover:text-white"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                      )}
                                      {!editingTopic && (
                                        <button 
                                          onClick={() => setResourceModal({
                                            isOpen: true,
                                            subjectId: s.id,
                                            topicId: topic.id,
                                            topicTitle: topic.title,
                                            resources: topic.resources || []
                                          })}
                                          className="p-1 text-gray-500 hover:text-[#1DB954] transition-colors"
                                          title="Manage Resources"
                                        >
                                          <LinkIcon className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => setConfirmModal({
                                          isOpen: true,
                                          title: 'Delete Topic',
                                          message: `Are you sure you want to delete "${topic.title}"?`,
                                          onConfirm: () => onDeleteTopic(s.id, topic.id)
                                        })}
                                        className="p-1 text-gray-500 hover:text-red-500"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={editingTopic?.topicId === topic.id ? editTopicMastery : topic.mastery}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (editingTopic?.topicId === topic.id) {
                                          setEditTopicMastery(val);
                                        } else {
                                          onEditTopic(s.id, topic.id, topic.title, val, topic.image);
                                        }
                                      }}
                                      className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#1DB954]"
                                    />
                                    <span className="text-[10px] font-bold text-[#1DB954] w-8">
                                      {editingTopic?.topicId === topic.id ? editTopicMastery : topic.mastery}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="bg-white/5 p-4 rounded-xl border border-dashed border-white/10">
                              <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <input 
                                    id={`new-topic-title-${s.id}`}
                                    type="text" 
                                    placeholder="New Topic Title" 
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                                  />
                                  <input 
                                    id={`new-topic-image-${s.id}`}
                                    type="text" 
                                    placeholder="Topic Image URL (Optional)" 
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                                  />
                                </div>
                                <button 
                                  onClick={() => {
                                    const titleInput = document.getElementById(`new-topic-title-${s.id}`) as HTMLInputElement;
                                    const imgInput = document.getElementById(`new-topic-image-${s.id}`) as HTMLInputElement;
                                    if (titleInput.value) {
                                      onAddTopic(s.id, titleInput.value, imgInput.value);
                                      titleInput.value = '';
                                      imgInput.value = '';
                                    } else {
                                      setError('Topic title is required');
                                    }
                                  }}
                                  className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Topic
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1DB954]" />
                Weekly Time Table
              </h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">7 Days Configured</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {days.map(day => (
                <div key={day} className="bg-[#181818] rounded-2xl border border-white/5 overflow-hidden">
                  <button 
                    onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                    className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-lg">{day}</h4>
                        <p className="text-xs text-gray-500 font-bold uppercase">{schedule[day].length} Activities</p>
                      </div>
                    </div>
                    {expandedDay === day ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </button>

                  <AnimatePresence>
                    {expandedDay === day && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="border-t border-white/5 overflow-hidden"
                      >
                        <div className="p-6 space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Daily Schedule</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 uppercase font-bold">Copy to:</span>
                              <select 
                                onChange={(e) => handleCopyDay(day, e.target.value as any)}
                                className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] outline-none"
                                defaultValue=""
                              >
                                <option value="" disabled>Select Day</option>
                                {days.filter(d => d !== day).map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, day)}
                          >
                            <SortableContext 
                              items={schedule[day].map(a => a.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-4">
                                {schedule[day].map(activity => (
                                  <SortableActivityItem 
                                    key={activity.id}
                                    activity={activity}
                                    day={day}
                                    editingActivity={editingActivity}
                                    setEditingActivity={setEditingActivity}
                                    editTime={editTime}
                                    setEditTime={setEditTime}
                                    editDesc={editDesc}
                                    setEditDesc={setEditDesc}
                                    editType={editType}
                                    setEditType={setEditType}
                                    handleSaveActivity={handleSaveActivity}
                                    handleDeleteActivity={(d, id) => setConfirmModal({
                                      isOpen: true,
                                      title: 'Delete Activity',
                                      message: 'Are you sure you want to remove this activity from your schedule?',
                                      onConfirm: () => handleDeleteActivity(d, id)
                                    })}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>

                          {isAddingActivity === day ? (
                            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input 
                                  placeholder="Time (e.g. 04:30 AM – 06:30 AM)" 
                                  value={newTime}
                                  onChange={e => setNewTime(e.target.value)}
                                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm"
                                />
                                <input 
                                  placeholder="Description" 
                                  value={newDesc}
                                  onChange={e => setNewDesc(e.target.value)}
                                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm"
                                />
                                <select 
                                  value={newType}
                                  onChange={e => setNewType(e.target.value as any)}
                                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm"
                                >
                                  <option value="study">Study</option>
                                  <option value="tuition">Tuition</option>
                                  <option value="break">Break</option>
                                  <option value="rest">Rest</option>
                                </select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setIsAddingActivity(null)} className="px-4 py-2 text-gray-500 font-bold text-sm">Cancel</button>
                                <button onClick={() => handleAddActivity(day)} className="px-6 py-2 bg-[#1DB954] text-black rounded-lg font-bold text-sm">Add Activity</button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setIsAddingActivity(day)}
                              className="w-full py-3 border border-dashed border-white/10 rounded-xl text-xs font-bold text-gray-500 hover:text-white hover:border-[#1DB954] transition-all"
                            >
                              + Add Activity to {day}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-[#1DB954]" />
                Study History Logs
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    placeholder="Search logs..."
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1DB954] transition-all"
                  />
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Logged</p>
                  <p className="text-lg font-bold">
                    {Math.floor(studyLogs.reduce((acc, l) => acc + l.duration, 0) / 60)}h {studyLogs.reduce((acc, l) => acc + l.duration, 0) % 60}m
                  </p>
                </div>
                {selectedLogs.length > 0 && (
                  <button 
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Delete Selected Logs',
                      message: `Are you sure you want to delete ${selectedLogs.length} selected logs?`,
                      onConfirm: () => {
                        selectedLogs.forEach(id => onDeleteLog(id));
                        setSelectedLogs([]);
                      }
                    })}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:scale-105 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedLogs.length})
                  </button>
                )}
                <button 
                  onClick={() => setConfirmModal({
                    isOpen: true,
                    title: 'Clear All History',
                    message: 'Are you sure you want to clear all history? This cannot be undone.',
                    onConfirm: onClearLogs
                  })}
                  className="text-xs font-bold text-red-500 hover:underline whitespace-nowrap"
                >
                  Clear All History
                </button>
              </div>
            </div>

            {/* Quick Log Form */}
            <div className="bg-[#181818] p-6 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-sm font-bold uppercase text-gray-500 tracking-widest">Quick Log Entry</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select id="log-subject" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]">
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input id="log-duration" type="number" placeholder="Duration (min)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]" />
                <input id="log-focus" type="number" min="1" max="5" placeholder="Focus (1-5)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1DB954]" />
                <button 
                  onClick={() => {
                    const sId = (document.getElementById('log-subject') as HTMLSelectElement).value;
                    const durInput = document.getElementById('log-duration') as HTMLInputElement;
                    const focInput = document.getElementById('log-focus') as HTMLInputElement;
                    const dur = parseInt(durInput.value);
                    const foc = parseInt(focInput.value);
                    
                    if (!sId) {
                      setError("Please select a subject.");
                      return;
                    }
                    if (isNaN(dur) || dur <= 0) {
                      setError("Duration must be a positive number.");
                      return;
                    }
                    if (isNaN(foc) || foc < 1 || foc > 5) {
                      setError("Focus level must be between 1 and 5.");
                      return;
                    }

                    const sub = subjects.find(s => s.id === sId);
                    onAddLog({
                      subjectId: sId,
                      topicId: sub?.topics[0]?.id || '',
                      duration: dur,
                      focusLevel: foc,
                      notes: 'Manual entry'
                    });
                    durInput.value = '';
                    focInput.value = '';
                    setError(null);
                  }}
                  className="bg-[#1DB954] text-black font-bold rounded-xl py-2 hover:scale-105 transition-transform"
                >
                  Log Session
                </button>
              </div>
              <p className="text-[10px] text-gray-500 italic">Note: Quick log uses the first topic of the subject by default.</p>
            </div>

            {studyLogs.length === 0 ? (
              <div className="bg-[#181818] rounded-3xl p-12 text-center border border-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-600" />
                </div>
                <h4 className="text-xl font-bold mb-2">No logs found</h4>
                <p className="text-gray-500 max-w-xs mx-auto">Start a focus session or manually log your study time to see data here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => {
                      const filteredLogs = studyLogs.filter(log => {
                        const subject = subjects.find(s => s.id === log.subjectId);
                        const topic = subject?.topics.find(t => t.id === log.topicId);
                        const searchLower = logsSearch.toLowerCase();
                        return (
                          subject?.name.toLowerCase().includes(searchLower) ||
                          topic?.title.toLowerCase().includes(searchLower) ||
                          log.notes.toLowerCase().includes(searchLower)
                        );
                      });
                      if (selectedLogs.length === filteredLogs.length) setSelectedLogs([]);
                      else setSelectedLogs(filteredLogs.map(l => l.id));
                    }}
                    className="text-[10px] font-bold text-gray-500 uppercase hover:text-white transition-colors"
                  >
                    {selectedLogs.length === studyLogs.filter(log => {
                      const subject = subjects.find(s => s.id === log.subjectId);
                      const topic = subject?.topics.find(t => t.id === log.topicId);
                      const searchLower = logsSearch.toLowerCase();
                      return (
                        subject?.name.toLowerCase().includes(searchLower) ||
                        topic?.title.toLowerCase().includes(searchLower) ||
                        log.notes.toLowerCase().includes(searchLower)
                      );
                    }).length && selectedLogs.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {studyLogs
                  .filter(log => {
                    const subject = subjects.find(s => s.id === log.subjectId);
                    const topic = subject?.topics.find(t => t.id === log.topicId);
                    const searchLower = logsSearch.toLowerCase();
                    return (
                      subject?.name.toLowerCase().includes(searchLower) ||
                      topic?.title.toLowerCase().includes(searchLower) ||
                      log.notes.toLowerCase().includes(searchLower)
                    );
                  })
                  .slice().reverse().map(log => {
                  const subject = subjects.find(s => s.id === log.subjectId);
                  const topic = subject?.topics.find(t => t.id === log.topicId);
                  const isSelected = selectedLogs.includes(log.id);
                  return (
                    <div 
                      key={log.id} 
                      className={cn(
                        "bg-[#181818] p-6 rounded-2xl border transition-all flex items-center justify-between group",
                        isSelected ? "border-[#1DB954] bg-[#1DB954]/5" : "border-white/5"
                      )}
                    >
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => {
                            if (isSelected) setSelectedLogs(selectedLogs.filter(id => id !== log.id));
                            else setSelectedLogs([...selectedLogs, log.id]);
                          }}
                          className={cn(
                            "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                            isSelected ? "bg-[#1DB954] border-[#1DB954] text-black" : "border-white/10 text-transparent"
                          )}
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold">
                          {subject?.name[0] || '?'}
                        </div>
                        <div>
                          <h4 className="font-bold">{subject?.name} • {topic?.title || 'General'}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {log.duration} min
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-yellow-500" /> Focus: {log.focusLevel}/5
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          {log.notes && <p className="text-xs text-gray-400 mt-2 italic">"{log.notes}"</p>}
                        </div>
                      </div>
                      <button 
                        onClick={() => setConfirmModal({
                          isOpen: true,
                          title: 'Delete Log',
                          message: 'Are you sure you want to delete this study log?',
                          onConfirm: () => onDeleteLog(log.id)
                        })}
                        className="p-3 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'exams' && (
          <motion.div
            key="exams"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Exam Performance Tracker
              </h3>
              <button 
                onClick={() => {
                  resetExamForm();
                  setIsAddingExam(true);
                  setExamMarks(subjects.map(s => ({ subjectId: s.id, score: 0 })));
                }}
                className="px-4 py-2 bg-[#1DB954] text-black rounded-xl text-sm font-bold hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Exam Result
              </button>
            </div>

            {/* Exam Form */}
            <AnimatePresence>
              {(isAddingExam || editingExamId) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[#181818] p-6 rounded-2xl border border-[#1DB954]/30 space-y-6 mb-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-lg">{editingExamId ? 'Edit Exam Result' : 'New Exam Result'}</h4>
                      <button onClick={resetExamForm} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Exam Title</label>
                          <input 
                            type="text" 
                            value={examTitle}
                            onChange={(e) => setExamTitle(e.target.value)}
                            placeholder="e.g. Term Test 1, Unit Test"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[#1DB954]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Date</label>
                            <input 
                              type="date" 
                              value={examDate}
                              onChange={(e) => setExamDate(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[#1DB954]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Rank (Optional)</label>
                            <input 
                              type="number" 
                              min="1"
                              value={examRank}
                              onChange={(e) => setExamRank(e.target.value)}
                              placeholder="e.g. 5"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[#1DB954]"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-gray-500 uppercase block">Notes</label>
                            <div className="flex items-center gap-2">
                              {hasDraft && (
                                <>
                                  <button 
                                    onClick={handleLoadDraft}
                                    className="text-[10px] font-bold text-[#1DB954] hover:underline"
                                  >
                                    Load Draft
                                  </button>
                                  <span className="text-gray-600">|</span>
                                  <button 
                                    onClick={handleClearDraft}
                                    className="text-[10px] font-bold text-red-500/60 hover:text-red-500 transition-colors"
                                  >
                                    Clear
                                  </button>
                                </>
                              )}
                              {!hasDraft && (
                                <button 
                                  onClick={handleSaveDraft}
                                  className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                                >
                                  {isDraftSaved ? 'Draft Saved!' : 'Save Draft'}
                                </button>
                              )}
                              {hasDraft && !isDraftSaved && (
                                <button 
                                  onClick={handleSaveDraft}
                                  className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                                >
                                  Update Draft
                                </button>
                              )}
                              {isDraftSaved && (
                                <span className="text-[10px] font-bold text-[#1DB954]">Draft Saved!</span>
                              )}
                            </div>
                          </div>
                          <textarea 
                            value={examNotes}
                            onChange={(e) => setExamNotes(e.target.value)}
                            placeholder="How did it go? What needs improvement?"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[#1DB954] h-24 resize-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Subject Marks</label>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                          {subjects.map(subject => {
                            const mark = examMarks.find(m => m.subjectId === subject.id);
                            return (
                              <div key={subject.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-sm font-medium">{subject.name}</span>
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    value={mark?.score || 0}
                                    onChange={(e) => {
                                      const score = parseInt(e.target.value) || 0;
                                      setExamMarks(examMarks.map(m => m.subjectId === subject.id ? { ...m, score } : m));
                                    }}
                                    className="w-20 bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-right outline-none focus:ring-1 focus:ring-[#1DB954]"
                                  />
                                  <span className="text-xs text-gray-500">/ 100</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div className="flex-1">
                        {error && (
                          <motion.p 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-red-500 text-xs font-bold"
                          >
                            {error}
                          </motion.p>
                        )}
                      </div>
                      <button 
                        onClick={handleSaveExam}
                        className="px-8 py-3 bg-[#1DB954] text-black font-bold rounded-xl hover:scale-105 transition-transform"
                      >
                        {editingExamId ? 'Update Result' : 'Save Exam Result'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Exam List */}
            <div className="space-y-4">
              {exams.length === 0 ? (
                <div className="bg-[#181818] rounded-3xl p-12 text-center border border-white/5">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-gray-600" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">No exam records yet</h4>
                  <p className="text-gray-500 max-w-xs mx-auto">Track your progress by adding your term tests and unit exam results.</p>
                </div>
              ) : (
                exams.slice().reverse().map(exam => (
                  <div key={exam.id} className="bg-[#181818] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                          <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{exam.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(exam.date).toLocaleDateString()}</span>
                            {exam.rank && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> Rank: {exam.rank}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Average</p>
                          <p className="text-2xl font-black text-[#1DB954]">{exam.averageScore.toFixed(1)}%</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingExamId(exam.id);
                              setExamTitle(exam.title);
                              setExamDate(exam.date);
                              setExamMarks(exam.marks);
                              setExamRank(exam.rank?.toString() || '');
                              setExamNotes(exam.notes || '');
                              setIsAddingExam(false);
                            }}
                            className="p-2 text-gray-500 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              title: 'Delete Exam Record',
                              message: `Are you sure you want to delete "${exam.title}"?`,
                              onConfirm: () => onDeleteExam(exam.id),
                              variant: 'danger'
                            })}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {exam.marks.map(mark => {
                        const subject = subjects.find(s => s.id === mark.subjectId);
                        return (
                          <div key={mark.subjectId} className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase truncate mb-1">{subject?.name || 'Unknown'}</p>
                            <p className="text-sm font-bold">{mark.score}</p>
                          </div>
                        );
                      })}
                    </div>
                    {exam.notes && (
                      <div className="mt-4 p-3 bg-black/20 rounded-xl text-xs text-gray-400 italic">
                        "{exam.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="bg-[#181818] p-8 rounded-3xl border border-white/5 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center text-2xl font-bold text-black">
                  S
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Sasi Upendra</h3>
                  <p className="text-gray-400 text-sm">A/L Student • Combined Maths Stream</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">Account Actions</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setConfirmModal({
                        isOpen: true,
                        title: 'Reset All Progress',
                        message: 'This will reset your points, streak, and badges. Your study logs and syllabus will remain. Continue?',
                        onConfirm: onResetProfile,
                        variant: 'danger'
                      })}
                      className="w-full text-left px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-bold transition-all flex items-center justify-between group"
                    >
                      Reset Gamification Data
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setConfirmModal({
                        isOpen: true,
                        title: 'Reset Syllabus',
                        message: 'This will reset all subjects and topics to default. Your study logs and profile will remain. Continue?',
                        onConfirm: onResetSyllabus,
                        variant: 'danger'
                      })}
                      className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-between group"
                    >
                      Reset Syllabus to Default
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">App Preferences</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl text-sm font-bold text-gray-400">
                      Dark Mode (Always On)
                      <div className="w-10 h-5 bg-[#1DB954] rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl text-sm font-bold text-gray-400">
                      AI Insights
                      <div className="w-10 h-5 bg-[#1DB954] rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#1DB954]/10 to-transparent p-8 rounded-3xl border border-[#1DB954]/20 text-center">
              <Zap className="w-12 h-12 text-[#1DB954] mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">StudyFlow Premium</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                Get advanced AI analytics, unlimited subjects, and cloud sync. (Coming Soon)
              </p>
              <button className="px-8 py-3 bg-[#1DB954] text-black font-bold rounded-full hover:scale-105 transition-transform">
                Join Waitlist
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resource Modal */}
      <AnimatePresence>
        {resourceModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="text-lg md:text-xl font-bold">Manage Resources</h3>
                  <p className="text-[10px] md:text-xs text-gray-400 mt-1">{resourceModal.topicTitle}</p>
                </div>
                <button 
                  onClick={() => setResourceModal(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {/* Add New Resource */}
                <div className="space-y-3 bg-white/5 p-3 md:p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] md:text-[10px] font-bold text-[#1DB954] uppercase tracking-widest">Add New Resource</p>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Resource Title (e.g. Video Tutorial)"
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs md:text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                    />
                    <div className="flex gap-2">
                      <select 
                        value={newResource.type}
                        onChange={(e) => setNewResource({ ...newResource, type: e.target.value as Resource['type'] })}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                      >
                        <option value="link">Link</option>
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="other">Other</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="URL"
                        value={newResource.url}
                        onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs md:text-sm outline-none focus:ring-1 focus:ring-[#1DB954]"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (newResource.title && newResource.url && resourceModal) {
                          const updatedResources = [...resourceModal.resources, { ...newResource, id: Math.random().toString(36).substr(2, 9) }];
                          setResourceModal({ ...resourceModal, resources: updatedResources });
                          setNewResource({ title: '', url: '', type: 'link' });
                        }
                      }}
                      className="w-full bg-[#1DB954] text-black font-bold py-2 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 text-xs md:text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Resource
                    </button>
                  </div>
                </div>

                {/* Resource List */}
                <div className="space-y-2">
                  <p className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Current Resources ({resourceModal.resources.length})</p>
                  {resourceModal.resources.length === 0 ? (
                    <div className="text-center py-6 md:py-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
                      <LinkIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs md:text-sm text-gray-500">No resources added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resourceModal.resources.map(res => (
                        <div key={res.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              res.type === 'video' ? "bg-red-500/10 text-red-500" : 
                              res.type === 'pdf' ? "bg-blue-500/10 text-blue-500" : 
                              "bg-[#1DB954]/10 text-[#1DB954]"
                            )}>
                              {res.type === 'video' ? <Video className="w-4 h-4" /> : 
                               res.type === 'pdf' ? <FileText className="w-4 h-4" /> : 
                               <LinkIcon className="w-4 h-4" />}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs md:text-sm font-medium truncate">{res.title}</p>
                              <p className="text-[8px] md:text-[10px] text-gray-500 truncate">{res.url}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const updatedResources = resourceModal.resources.filter(r => r.id !== res.id);
                              setResourceModal({ ...resourceModal, resources: updatedResources });
                            }}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-6 bg-white/5 border-t border-white/10 flex gap-3">
                <button 
                  onClick={() => setResourceModal(null)}
                  className="flex-1 px-4 py-2 md:py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs md:text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (resourceModal) {
                      onUpdateResources(resourceModal.subjectId, resourceModal.topicId, resourceModal.resources);
                      setResourceModal(null);
                    }
                  }}
                  className="flex-1 px-4 py-2 md:py-3 bg-[#1DB954] text-black rounded-xl text-xs md:text-sm font-bold hover:scale-[1.02] transition-transform"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        variant={confirmModal.variant}
      />
    </div>
  );
}

interface SortableActivityItemProps {
  activity: Activity;
  day: keyof WeeklySchedule;
  editingActivity: {day: keyof WeeklySchedule, id: string} | null;
  setEditingActivity: (val: {day: keyof WeeklySchedule, id: string} | null) => void;
  editTime: string;
  setEditTime: (val: string) => void;
  editDesc: string;
  setEditDesc: (val: string) => void;
  editType: Activity['type'];
  setEditType: (val: Activity['type']) => void;
  handleSaveActivity: (day: keyof WeeklySchedule, id: string) => void;
  handleDeleteActivity: (day: keyof WeeklySchedule, id: string) => void;
}

function SortableActivityItem({
  activity,
  day,
  editingActivity,
  setEditingActivity,
  editTime,
  setEditTime,
  editDesc,
  setEditDesc,
  editType,
  setEditType,
  handleSaveActivity,
  handleDeleteActivity
}: SortableActivityItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "flex items-center gap-4 p-3 bg-white/5 rounded-xl group transition-all",
        isDragging && "shadow-2xl ring-2 ring-[#1DB954]/50"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-600 hover:text-gray-400">
        <GripVertical className="w-4 h-4" />
      </div>

      {editingActivity?.id === activity.id ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input 
            type="text" 
            value={editTime} 
            onChange={e => setEditTime(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-sm"
          />
          <input 
            type="text" 
            value={editDesc} 
            onChange={e => setEditDesc(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-sm"
          />
          <select 
            value={editType} 
            onChange={e => setEditType(e.target.value as any)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-sm"
          >
            <option value="study">Study</option>
            <option value="tuition">Tuition</option>
            <option value="break">Break</option>
            <option value="rest">Rest</option>
          </select>
        </div>
      ) : (
        <>
          <div className="w-32 text-xs font-bold text-gray-500 tabular-nums">{activity.time}</div>
          <div className="flex-1 font-medium">{activity.description}</div>
          <div className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
            activity.type === 'study' ? "bg-[#1DB954]/10 text-[#1DB954]" :
            activity.type === 'tuition' ? "bg-blue-500/10 text-blue-500" :
            "bg-gray-500/10 text-gray-500"
          )}>
            {activity.type}
          </div>
        </>
      )}

      <div className="flex items-center gap-1">
        {editingActivity?.id === activity.id ? (
          <button onClick={() => handleSaveActivity(day, activity.id)} className="p-2 text-[#1DB954] hover:bg-[#1DB954]/10 rounded-lg"><Save className="w-4 h-4" /></button>
        ) : (
          <button onClick={() => {
            setEditingActivity({ day, id: activity.id });
            setEditTime(activity.time);
            setEditDesc(activity.description);
            setEditType(activity.type);
          }} className="p-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-4 h-4" /></button>
        )}
        <button onClick={() => handleDeleteActivity(day, activity.id)} className="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
