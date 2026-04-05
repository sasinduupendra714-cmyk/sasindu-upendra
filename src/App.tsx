import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import ManageData from './components/ManageData';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import PlayerBar from './components/PlayerBar';
import SubjectCard from './components/SubjectCard';
import TopicCard from './components/TopicCard';
import Analytics from './components/Analytics';
import SyllabusTracker from './components/SyllabusTracker';
import FocusMode from './components/FocusMode';
import StudyLogForm from './components/StudyLogForm';
import AIInsights from './components/AIInsights';
import Planner from './components/Planner';
import WeeklyScheduleView from './components/WeeklyScheduleView';
import { Subject, StudyLog, WeeklySchedule, AIRecommendation, Topic, Activity, UserProfile, Badge, ExamRecord, Resource } from './types';
import { INITIAL_SUBJECTS, WEEKLY_BASE_SCHEDULE, SYLLABUS_VERSION, INITIAL_BADGES } from './constants';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Clock, TrendingUp, Zap, ChevronRight, Play, Target, CheckCircle2, Trophy, Award, Flame, Coffee } from 'lucide-react';
import { cn } from './lib/utils';
import Achievements from './components/Achievements';

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState('home');
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('studyflow_profile');
    return saved ? JSON.parse(saved) : {
      points: 0,
      streak: 0,
      badges: INITIAL_BADGES,
      totalSessions: 0,
      totalStudyTime: 0
    };
  });
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('studyflow_subjects');
    const savedVersion = localStorage.getItem('studyflow_syllabus_version');
    
    if (saved) {
      const parsed = JSON.parse(saved);
      // If the user has the "old" default (only 3 topics for maths), auto-update to the new syllabus
      const maths = parsed.find((s: any) => s.id === 'maths');
      if (maths && maths.topics.length <= 3 && savedVersion !== SYLLABUS_VERSION) {
        return INITIAL_SUBJECTS;
      }
      return parsed;
    }
    return INITIAL_SUBJECTS;
  });

  useEffect(() => {
    localStorage.setItem('studyflow_syllabus_version', SYLLABUS_VERSION);
  }, []);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => {
    const saved = localStorage.getItem('studyflow_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [exams, setExams] = useState<ExamRecord[]>(() => {
    const saved = localStorage.getItem('studyflow_exams');
    return saved ? JSON.parse(saved) : [];
  });
  const [schedule, setSchedule] = useState<WeeklySchedule>(() => {
    const saved = localStorage.getItem('studyflow_schedule');
    return saved ? JSON.parse(saved) : WEEKLY_BASE_SCHEDULE;
  });
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(() => {
    const saved = localStorage.getItem('studyflow_recommendations');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Focus on Statics', description: 'Your mastery in Statics is currently at 30%. Dedicate a 90-min block today.', priority: 'High', reason: 'Critical weak area identified in Combined Maths.' },
      { id: '2', title: 'Organic Chemistry Review', description: 'It has been 3 days since your last Organic Chemistry session.', priority: 'Medium', reason: 'Spaced repetition schedule suggests a review now.' }
    ];
  });

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isLoggingSession, setIsLoggingSession] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recentlyStudied, setRecentlyStudied] = useState<string[]>(() => {
    const saved = localStorage.getItem('studyflow_recently_studied');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSession, setActiveSession] = useState<{
    subjectId: string;
    topicId: string;
    elapsedSeconds: number;
    totalSeconds: number;
  } | null>(null);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && !isPaused) {
      interval = setInterval(() => {
        setActiveSession(prev => {
          if (!prev) return null;
          return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession, isPaused]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('studyflow_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('studyflow_recently_studied', JSON.stringify(recentlyStudied));
  }, [recentlyStudied]);

  useEffect(() => {
    localStorage.setItem('studyflow_logs', JSON.stringify(studyLogs));
  }, [studyLogs]);

  useEffect(() => {
    localStorage.setItem('studyflow_schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('studyflow_recommendations', JSON.stringify(recommendations));
  }, [recommendations]);

  useEffect(() => {
    localStorage.setItem('studyflow_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('studyflow_exams', JSON.stringify(exams));
  }, [exams]);

  // AI Planner Logic
  const processedSubjects = useMemo(() => {
    return subjects.map(s => {
      const avgMastery = s.topics.length > 0 
        ? s.topics.reduce((acc, t) => acc + t.mastery, 0) / s.topics.length
        : 0;
      const readiness = (s.score * 0.4) + (avgMastery * 0.6);
      const priorityScore = (100 - readiness) * (s.focus / 5) * (s.weakCount + 1);
      
      return { ...s, readiness, priorityScore };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [subjects]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubjects = useMemo(() => {
    if (!searchQuery) return processedSubjects;
    return processedSubjects.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.topics.some(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [processedSubjects, searchQuery]);

  const prioritySubject = processedSubjects[0] || null;

  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as keyof WeeklySchedule;
  const dailyPlan = schedule[currentDay] || [];

  // Handlers
  const handleUpdateSchedule = (day: keyof WeeklySchedule, activities: Activity[]) => {
    setSchedule({ ...schedule, [day]: activities });
  };

  const handleDeleteLog = (id: string) => {
    setStudyLogs(studyLogs.filter(l => l.id !== id));
  };

  const handleClearLogs = () => {
    setStudyLogs([]);
  };

  const handleAddExam = (exam: Omit<ExamRecord, 'id'>) => {
    const newExam = { ...exam, id: Math.random().toString(36).substr(2, 9) };
    setExams([...exams, newExam]);
  };

  const handleEditExam = (id: string, updatedExam: Partial<ExamRecord>) => {
    setExams(exams.map(e => e.id === id ? { ...e, ...updatedExam } : e));
  };

  const handleDeleteExam = (id: string) => {
    setExams(exams.filter(e => e.id !== id));
  };

  const handleAddSubject = (name: string, image?: string) => {
    const newSubject: Subject = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      score: 0,
      focus: 3,
      weakCount: 0,
      status: 'Weak',
      priorityScore: 0,
      readiness: 0,
      gradient: 'from-gray-500/20 to-gray-900/40',
      image,
      topics: []
    };
    setSubjects([...subjects, newSubject]);
  };

  const handleEditSubject = (id: string, name: string, image?: string) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, name, image } : s));
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const handleAddTopic = (subjectId: string, title: string, image?: string) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        const newTopic: Topic = {
          id: Math.random().toString(36).substr(2, 9),
          title,
          mastery: 0,
          image
        };
        return { ...s, topics: [...s.topics, newTopic] };
      }
      return s;
    }));
  };

  const handleEditTopic = (subjectId: string, topicId: string, title: string, mastery: number, image?: string, resources?: Resource[]) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          topics: s.topics.map(t => t.id === topicId ? { ...t, title, mastery, image, resources } : t)
        };
      }
      return s;
    }));
  };

  const handleUpdateResources = (subjectId: string, topicId: string, resources: Resource[]) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          topics: s.topics.map(t => t.id === topicId ? { ...t, resources } : t)
        };
      }
      return s;
    }));
  };

  const handleDeleteTopic = (subjectId: string, topicId: string) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, topics: s.topics.filter(t => t.id !== topicId) };
      }
      return s;
    }));
  };

  const handleUpdateMastery = (subjectId: string, topicId: string, mastery: number) => {
    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          topics: s.topics.map(t => t.id === topicId ? { ...t, mastery } : t)
        };
      }
      return s;
    });
    setSubjects(updatedSubjects);

    // Check badges
    setUserProfile(prev => {
      const updatedBadges = prev.badges.map(badge => {
        if (badge.unlockedAt) return badge;

        let unlocked = false;
        if (badge.type === 'mastery') {
          const mathsTopics = updatedSubjects.find(s => s.id === 'maths')?.topics || [];
          const physicsTopics = updatedSubjects.find(s => s.id === 'physics')?.topics || [];
          const chemistryTopics = updatedSubjects.find(s => s.id === 'chemistry')?.topics || [];
          
          if (badge.id === 'b3') unlocked = mathsTopics.filter(t => t.mastery >= 80).length >= badge.requirement;
          if (badge.id === 'b4') unlocked = physicsTopics.filter(t => t.mastery >= 80).length >= badge.requirement;
          if (badge.id === 'b5') unlocked = chemistryTopics.filter(t => t.mastery >= 80).length >= badge.requirement;
        }

        if (unlocked) {
          return { ...badge, unlockedAt: new Date().toISOString() };
        }
        return badge;
      });

      return { ...prev, badges: updatedBadges };
    });
  };

  const handleSaveLog = (logData: any) => {
    const newLog: StudyLog = {
      id: Math.random().toString(36).substr(2, 9),
      ...logData,
      timestamp: new Date().toISOString()
    };
    setStudyLogs([...studyLogs, newLog]);
    
    // Calculate updated subjects first to use for badge checking
    const updatedSubjects = subjects.map(s => {
      if (s.id === logData.subjectId) {
        return {
          ...s,
          topics: s.topics.map(t => {
            if (t.id === logData.topicId) {
              return { ...t, mastery: Math.min(100, t.mastery + 2) };
            }
            return t;
          })
        };
      }
      return s;
    });
    setSubjects(updatedSubjects);

    // Update profile
    setUserProfile(prev => {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = prev.lastStudyDate;
      let newStreak = prev.streak;

      if (!lastDate) {
        newStreak = 1;
      } else {
        const last = new Date(lastDate);
        const current = new Date(today);
        const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }

      const updatedProfile = {
        ...prev,
        points: prev.points + (logData.duration * 2) + (logData.focusLevel * 10),
        streak: newStreak,
        lastStudyDate: today,
        totalSessions: prev.totalSessions + 1,
        totalStudyTime: prev.totalStudyTime + logData.duration
      };

      // Check badges
      const updatedBadges = updatedProfile.badges.map(badge => {
        if (badge.unlockedAt) return badge;

        let unlocked = false;
        switch (badge.type) {
          case 'sessions':
            unlocked = updatedProfile.totalSessions >= badge.requirement;
            break;
          case 'streak':
            unlocked = updatedProfile.streak >= badge.requirement;
            break;
          case 'time':
            unlocked = updatedProfile.totalStudyTime >= badge.requirement;
            break;
          case 'mastery':
            const mathsTopics = updatedSubjects.find(s => s.id === 'maths')?.topics || [];
            const physicsTopics = updatedSubjects.find(s => s.id === 'physics')?.topics || [];
            const chemistryTopics = updatedSubjects.find(s => s.id === 'chemistry')?.topics || [];
            
            if (badge.id === 'b3') unlocked = mathsTopics.filter(t => t.mastery >= 80).length >= badge.requirement;
            if (badge.id === 'b4') unlocked = physicsTopics.filter(t => t.mastery >= 80).length >= badge.requirement;
            if (badge.id === 'b5') unlocked = chemistryTopics.filter(t => t.mastery >= 80).length >= badge.requirement;
            break;
        }

        if (unlocked) {
          return { ...badge, unlockedAt: new Date().toISOString() };
        }
        return badge;
      });

      return {
        ...updatedProfile,
        badges: updatedBadges
      };
    });

    setRecentlyStudied(prev => {
      const filtered = prev.filter(id => id !== logData.topicId);
      return [logData.topicId, ...filtered].slice(0, 10);
    });
    
    setIsLoggingSession(false);
    generateAIInsights(newLog);
  };

  const generateAIInsights = async (lastLog?: StudyLog) => {
    setIsAIAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `Analyze this A/L student's study data and provide 2-3 actionable recommendations. 
      Subjects: ${JSON.stringify(processedSubjects.map(s => ({ name: s.name, readiness: s.readiness, weakCount: s.weakCount })))}
      Last Session: ${lastLog ? JSON.stringify(lastLog) : 'None'}
      Return a JSON array of objects with fields: id, title, description, priority (High/Medium/Low), reason.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const newRecs = JSON.parse(response.text);
      setRecommendations([...newRecs.map((r: any) => ({ ...r, id: Math.random().toString() })), ...recommendations].slice(0, 10));
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  const handleLikeRec = (id: string) => {
    setRecommendations(recommendations.map(r => r.id === id ? { ...r, liked: !r.liked } : r));
  };

  const handleDismissRec = (id: string) => {
    setRecommendations(recommendations.map(r => r.id === id ? { ...r, dismissed: true } : r));
  };

  const handleResetSyllabus = () => {
    setSubjects(INITIAL_SUBJECTS);
    localStorage.removeItem('studyflow_subjects');
  };

  const handleResetProfile = () => {
    setUserProfile({
      points: 0,
      streak: 0,
      badges: INITIAL_BADGES,
      totalSessions: 0,
      totalStudyTime: 0
    });
    localStorage.removeItem('studyflow_profile');
  };

  const startFocus = (subjectId: string) => {
    setActiveSubjectId(subjectId);
    setIsFocusMode(true);
    setIsPaused(false);
    setActiveSession({
      subjectId,
      topicId: subjects.find(s => s.id === subjectId)?.topics[0]?.id || '',
      elapsedSeconds: 0,
      totalSeconds: 90 * 60
    });
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans selection:bg-[#1DB954] selection:text-black overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar 
          onAutoPlan={() => setActiveTab('home')} 
          onLogSession={() => setIsLoggingSession(true)}
          onStartFocus={() => startFocus(prioritySubject?.id || '')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          points={userProfile.points}
          streak={userProfile.streak}
        />

        <main className="flex-1 overflow-y-auto scrollbar-hide pb-40 md:pb-32">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 md:p-8 space-y-12"
              >
                <Planner 
                  prioritySubject={prioritySubject} 
                  dailyPlan={dailyPlan} 
                  onStartFocus={startFocus}
                  onViewFullSchedule={() => setActiveTab('schedule')}
                />

                {/* Recently Studied Section (Spotify style horizontal scroll) */}
                {recentlyStudied.length > 0 && !searchQuery && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold tracking-tight">Recently Studied</h2>
                      <button className="text-sm font-bold text-gray-400 hover:text-white hover:underline">Show all</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {recentlyStudied.map(topicId => {
                        const subject = subjects.find(s => s.topics.some(t => t.id === topicId));
                        const topic = subject?.topics.find(t => t.id === topicId);
                        if (!topic || !subject) return null;
                        return (
                          <div key={topicId} className="min-w-[180px] w-[180px]">
                            <TopicCard 
                              topic={topic} 
                              subjectName={subject.name} 
                              onStartFocus={() => startFocus(subject.id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Made For You (Daily Mixes) */}
                {!searchQuery && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold tracking-tight">Made For You</h2>
                      <button className="text-sm font-bold text-gray-400 hover:text-white hover:underline">See all</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {[
                        {
                          id: 'mix-1',
                          title: 'Daily Mix 1',
                          description: `Focus on ${processedSubjects[0]?.name || 'your weakest area'}`,
                          gradient: 'from-[#1DB954] to-[#121212]',
                          icon: Zap,
                          color: '#1DB954',
                          action: () => startFocus(processedSubjects[0]?.id || ''),
                          tag: 'WEAK AREAS'
                        },
                        {
                          id: 'mix-2',
                          title: 'Review Mix',
                          description: 'Spaced repetition for long-term retention.',
                          gradient: 'from-[#4d569d] to-[#121212]',
                          icon: Clock,
                          color: '#4d569d',
                          action: () => {},
                          tag: 'REPETITION'
                        },
                        {
                          id: 'mix-3',
                          title: 'Mastery Mix',
                          description: 'Polish your strong areas to reach 100%.',
                          gradient: 'from-[#e91e63] to-[#121212]',
                          icon: Target,
                          color: '#e91e63',
                          action: () => {},
                          tag: 'POLISH'
                        },
                        {
                          id: 'mix-4',
                          title: 'The Grind',
                          description: 'High-intensity session for maximum points.',
                          gradient: 'from-[#ff5722] to-[#121212]',
                          icon: Flame,
                          color: '#ff5722',
                          action: () => {},
                          tag: 'INTENSE'
                        },
                        {
                          id: 'mix-5',
                          title: 'Chill Study',
                          description: 'Light review and resource browsing.',
                          gradient: 'from-[#00bcd4] to-[#121212]',
                          icon: Coffee,
                          color: '#00bcd4',
                          action: () => {},
                          tag: 'RELAXED'
                        }
                      ].slice(0, 5).map((mix) => (
                        <motion.div 
                          key={mix.id}
                          whileHover={{ y: -8 }}
                          className="group relative bg-[#181818] p-4 rounded-xl transition-all duration-300 hover:bg-[#282828] cursor-pointer shadow-lg"
                          onClick={mix.action}
                        >
                          <div className={cn("aspect-square rounded-lg mb-4 relative overflow-hidden bg-gradient-to-br shadow-2xl", mix.gradient)}>
                            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                              <mix.icon className="w-24 h-24 text-white" />
                            </div>
                            <div className="absolute inset-0 bg-black/20" />
                            
                            {/* Spotify-style Play Button */}
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              whileHover={{ opacity: 1, y: 0 }}
                              className="absolute bottom-2 right-2 w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                            >
                              <Play className="w-6 h-6 text-black fill-current ml-1" />
                            </motion.div>

                            <div className="absolute top-3 left-3">
                              <span className="px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[8px] font-black text-white tracking-widest uppercase">
                                {mix.tag}
                              </span>
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-sm mb-1 truncate">{mix.title}</h3>
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {mix.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">
                      {searchQuery ? `Search results for "${searchQuery}"` : 'Your Subjects'}
                    </h2>
                    {!searchQuery && <button onClick={() => setActiveTab('manage')} className="text-sm font-bold text-gray-400 hover:text-white hover:underline">Show all</button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSubjects.map(subject => (
                      <SubjectCard key={subject.id} subject={subject} onStartFocus={startFocus} />
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Recommended for You</h2>
                    <button onClick={() => setActiveTab('analytics')} className="text-sm font-bold text-gray-400 hover:text-white hover:underline">View Insights</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {processedSubjects.flatMap(s => s.topics).slice(0, 5).map(topic => (
                      <TopicCard 
                        key={topic.id} 
                        topic={topic} 
                        subjectName={subjects.find(s => s.topics.includes(topic))?.name || ''} 
                        onStartFocus={() => startFocus(subjects.find(s => s.topics.includes(topic))?.id || '')}
                      />
                    ))}
                  </div>
                </section>

                <section className="bg-gradient-to-br from-[#1DB954]/20 to-transparent p-8 rounded-3xl border border-[#1DB954]/20">
                  <div className="flex items-center gap-4 mb-6">
                    <Sparkles className="w-8 h-8 text-[#1DB954]" />
                    <h2 className="text-2xl font-bold">AI Performance Insight</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                      <p className="text-lg text-gray-300 leading-relaxed mb-6">
                        Your focus in <span className="text-white font-bold">Combined Maths</span> has improved by <span className="text-[#1DB954] font-bold">12%</span> this week. 
                        However, your retention in <span className="text-white font-bold">Physics Mechanics</span> is dropping. 
                        We recommend a deep-dive session tonight.
                      </p>
                      <button 
                        onClick={() => setActiveTab('analytics')}
                        className="flex items-center gap-2 px-6 py-3 bg-[#1DB954] text-black rounded-full font-bold hover:scale-105 transition-all"
                      >
                        View Full Analysis
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase">Weekly Progress</span>
                        <TrendingUp className="w-4 h-4 text-[#1DB954]" />
                      </div>
                      <div className="h-32 flex items-end gap-2">
                        {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                          <div key={i} className="flex-1 bg-[#1DB954]/20 rounded-t-sm relative group">
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-[#1DB954] rounded-t-sm transition-all duration-1000 group-hover:brightness-125" 
                              style={{ height: `${h}%` }} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'analytics' && <Analytics subjects={processedSubjects} studyLogs={studyLogs} exams={exams} />}
            {activeTab === 'schedule' && <WeeklyScheduleView schedule={schedule} />}
            {activeTab === 'syllabus' && <SyllabusTracker subjects={subjects} onUpdateMastery={handleUpdateMastery} />}
            {activeTab === 'manage' && (
              <ManageData 
                subjects={subjects}
                schedule={schedule}
                studyLogs={studyLogs}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteLog={handleDeleteLog}
                onClearLogs={handleClearLogs}
                onAddLog={handleSaveLog}
                onAddSubject={handleAddSubject}
                onEditSubject={handleEditSubject}
                onDeleteSubject={handleDeleteSubject}
                onAddTopic={handleAddTopic}
                onEditTopic={handleEditTopic}
                onDeleteTopic={handleDeleteTopic}
                onUpdateResources={handleUpdateResources}
                onResetSyllabus={handleResetSyllabus}
                onResetProfile={handleResetProfile}
                exams={exams}
                onAddExam={handleAddExam}
                onEditExam={handleEditExam}
                onDeleteExam={handleDeleteExam}
              />
            )}
            {activeTab === 'weak-areas' && <AIInsights recommendations={recommendations} onLike={handleLikeRec} onDismiss={handleDismissRec} isLoading={isAIAnalyzing} />}
            {activeTab === 'achievements' && <Achievements profile={userProfile} />}
          </AnimatePresence>
        </main>

        <PlayerBar 
          currentSubject={subjects.find(s => s.id === activeSubjectId)?.name || 'Select a Subject'} 
          progress={activeSession ? (activeSession.elapsedSeconds / activeSession.totalSeconds) * 100 : 0} 
          timeElapsed={activeSession ? (() => {
            const mins = Math.floor(activeSession.elapsedSeconds / 60);
            const secs = activeSession.elapsedSeconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          })() : '0:00'}
          totalTime={activeSession ? (() => {
            const mins = Math.floor(activeSession.totalSeconds / 60);
            const secs = activeSession.totalSeconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          })() : '90:00'}
          onToggleFocus={() => setIsFocusMode(true)}
          isPlaying={activeSession && !isPaused}
          onTogglePlay={() => setIsPaused(!isPaused)}
        />
        {/* Mobile Bottom Nav Spacer */}
        <div className="h-[72px] md:hidden shrink-0" />
      </div>

      <AnimatePresence>
        {isFocusMode && (
          <FocusMode 
            subjectName={subjects.find(s => s.id === activeSubjectId)?.name || 'Study Session'} 
            onClose={() => setIsFocusMode(false)} 
          />
        )}
        {isLoggingSession && (
          <StudyLogForm 
            subjects={subjects} 
            onSave={handleSaveLog} 
            onClose={() => setIsLoggingSession(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
