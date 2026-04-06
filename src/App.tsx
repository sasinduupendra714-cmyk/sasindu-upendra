import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
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
import { Sparkles, Clock, TrendingUp, Zap, ChevronRight, Play, Target, CheckCircle2, Trophy, Award, Flame, Coffee, Bell, LogIn, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import Achievements from './components/Achievements';
import ToastContainer, { Toast } from './components/Toast';
import Skeleton, { CardSkeleton, ListSkeleton } from './components/Skeleton';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, User } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  writeBatch,
  getDoc,
  increment
} from 'firebase/firestore';

// Error Handling Spec for Firestore Operations
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error) errorMessage = `Database Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
            <p className="text-gray-400 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#1DB954] text-black rounded-full font-bold hover:scale-105 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  // State
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    points: 0,
    streak: 0,
    badges: INITIAL_BADGES,
    totalSessions: 0,
    totalStudyTime: 0
  });
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule>(WEEKLY_BASE_SCHEDULE);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([
    { id: '1', title: 'Focus on Statics', description: 'Your mastery in Statics is currently at 30%. Dedicate a 90-min block today.', priority: 'High', reason: 'Critical weak area identified in Combined Maths.' },
    { id: '2', title: 'Organic Chemistry Review', description: 'It has been 3 days since your last Organic Chemistry session.', priority: 'Medium', reason: 'Spaced repetition schedule suggests a review now.' }
  ]);

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isLoggingSession, setIsLoggingSession] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recentlyStudied, setRecentlyStudied] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<{
    subjectId: string;
    topicId: string;
    elapsedSeconds: number;
    totalSeconds: number;
  } | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    
    // Profile Listener
    const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        // Initialize user profile
        setDoc(userDocRef, {
          points: 0,
          streak: 0,
          badges: INITIAL_BADGES,
          totalSessions: 0,
          totalStudyTime: 0
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`));

    // Subjects Listener
    const unsubSubjects = onSnapshot(collection(db, 'users', user.uid, 'subjects'), (snap) => {
      if (!snap.empty) {
        setSubjects(snap.docs.map(d => d.data() as Subject));
      } else {
        // Initialize subjects
        const batch = writeBatch(db);
        INITIAL_SUBJECTS.forEach(s => {
          const sRef = doc(db, 'users', user.uid, 'subjects', s.id);
          batch.set(sRef, s);
        });
        batch.commit().catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/subjects`));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/subjects`));

    // Study Logs Listener
    const unsubLogs = onSnapshot(query(collection(db, 'users', user.uid, 'study_logs'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      setStudyLogs(snap.docs.map(d => d.data() as StudyLog));
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/study_logs`));

    // Schedule Listener
    const unsubSchedule = onSnapshot(doc(db, 'users', user.uid, 'schedules', 'weekly'), (docSnap) => {
      if (docSnap.exists()) {
        setSchedule(docSnap.data() as WeeklySchedule);
      } else {
        setDoc(doc(db, 'users', user.uid, 'schedules', 'weekly'), WEEKLY_BASE_SCHEDULE)
          .catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/schedules/weekly`));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/schedules/weekly`));

    // Recommendations Listener
    const unsubRecs = onSnapshot(collection(db, 'users', user.uid, 'recommendations'), (snap) => {
      if (!snap.empty) {
        setRecommendations(snap.docs.map(d => d.data() as AIRecommendation));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/recommendations`));

    // Exams Listener
    const unsubExams = onSnapshot(collection(db, 'users', user.uid, 'exams'), (snap) => {
      setExams(snap.docs.map(d => d.data() as ExamRecord));
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/exams`));

    return () => {
      unsubProfile();
      unsubSubjects();
      unsubLogs();
      unsubSchedule();
      unsubRecs();
      unsubExams();
    };
  }, [user]);

  // Login Function
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addToast("Successfully logged in!", "success");
    } catch (error) {
      console.error("Login failed", error);
      addToast("Login failed. Please try again.", "error");
    }
  };

  // Logout Function
  const handleLogout = async () => {
    try {
      await auth.signOut();
      addToast("Logged out successfully", "info");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Simulated Live Data Updates
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      // 1. Update Total Study Time & Points
      updateDoc(doc(db, 'users', user.uid), {
        totalStudyTime: increment(1), // Add 1 minute
        points: increment(5) // Add 5 points for "active" time
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));

      // 2. Randomly update a subject's readiness
      if (subjects.length > 0 && Math.random() > 0.5) {
        const subjectToUpdate = subjects[Math.floor(Math.random() * subjects.length)];
        const change = (Math.random() * 0.8).toFixed(1);
        const isPositive = Math.random() > 0.4; // Slightly biased towards positive growth
        const newReadiness = Math.min(100, Math.max(0, subjectToUpdate.readiness + (isPositive ? parseFloat(change) : -parseFloat(change))));
        
        updateDoc(doc(db, 'users', user.uid, 'subjects', subjectToUpdate.id), {
          readiness: newReadiness
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/subjects/${subjectToUpdate.id}`));
      }
    }, 7000); // Every 7 seconds

    return () => clearInterval(interval);
  }, [user, subjects.length]); // Use length to avoid frequent resets but still react to new subjects

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && !isPaused) {
      interval = setInterval(() => {
        setActiveSession(prev => {
          if (!prev) return null;
          const nextElapsed = prev.elapsedSeconds + 1;
          
          // Check for completion
          if (nextElapsed >= prev.totalSeconds) {
            addToast(`Session completed: ${subjects.find(s => s.id === prev.subjectId)?.name}`, 'success');
          }
          
          return { ...prev, elapsedSeconds: nextElapsed };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession, isPaused, subjects]);

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
  const handleUpdateSchedule = async (day: keyof WeeklySchedule, activities: Activity[]) => {
    if (!user) return;
    try {
      const scheduleRef = doc(db, 'users', user.uid, 'schedules', 'weekly');
      await setDoc(scheduleRef, { ...schedule, [day]: activities });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/schedules/weekly`);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'study_logs', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/study_logs/${id}`);
    }
  };

  const handleClearLogs = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      studyLogs.forEach(log => {
        batch.delete(doc(db, 'users', user.uid, 'study_logs', log.id));
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/study_logs`);
    }
  };

  const handleAddExam = async (exam: Omit<ExamRecord, 'id'>) => {
    if (!user) return;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, 'users', user.uid, 'exams', id), { ...exam, id });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/exams/${id}`);
    }
  };

  const handleEditExam = async (id: string, updatedExam: Partial<ExamRecord>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'exams', id), updatedExam);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/exams/${id}`);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'exams', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/exams/${id}`);
    }
  };

  const handleAddSubject = async (name: string, image?: string) => {
    if (!user) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newSubject: Subject = {
      id,
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
    try {
      await setDoc(doc(db, 'users', user.uid, 'subjects', id), newSubject);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/subjects/${id}`);
    }
  };

  const handleEditSubject = async (id: string, name: string, image?: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'subjects', id), { name, image });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/subjects/${id}`);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'subjects', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/subjects/${id}`);
    }
  };

  const handleAddTopic = async (subjectId: string, title: string, image?: string) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const newTopic: Topic = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      mastery: 0,
      image
    };

    try {
      await updateDoc(doc(db, 'users', user.uid, 'subjects', subjectId), {
        topics: [...subject.topics, newTopic]
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/subjects/${subjectId}`);
    }
  };

  const handleEditTopic = async (subjectId: string, topicId: string, title: string, mastery: number, image?: string, resources?: Resource[]) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedTopics = subject.topics.map(t => t.id === topicId ? { ...t, title, mastery, image, resources } : t);

    try {
      await updateDoc(doc(db, 'users', user.uid, 'subjects', subjectId), {
        topics: updatedTopics
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/subjects/${subjectId}`);
    }
  };

  const handleUpdateResources = async (subjectId: string, topicId: string, resources: Resource[]) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedTopics = subject.topics.map(t => t.id === topicId ? { ...t, resources } : t);

    try {
      await updateDoc(doc(db, 'users', user.uid, 'subjects', subjectId), {
        topics: updatedTopics
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/subjects/${subjectId}`);
    }
  };

  const handleDeleteTopic = async (subjectId: string, topicId: string) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedTopics = subject.topics.filter(t => t.id !== topicId);

    try {
      await updateDoc(doc(db, 'users', user.uid, 'subjects', subjectId), {
        topics: updatedTopics
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/subjects/${subjectId}`);
    }
  };

  const handleUpdateMastery = async (subjectId: string, topicId: string, mastery: number) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedTopics = subject.topics.map(t => t.id === topicId ? { ...t, mastery } : t);
    const updatedSubjects = subjects.map(s => s.id === subjectId ? { ...s, topics: updatedTopics } : s);

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid, 'subjects', subjectId), { topics: updatedTopics });

    // Check badges
    const updatedBadges = userProfile.badges.map(badge => {
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

    batch.update(doc(db, 'users', user.uid), { badges: updatedBadges });

    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleSaveLog = async (logData: any) => {
    if (!user) return;
    const logId = Math.random().toString(36).substr(2, 9);
    const newLog: StudyLog = {
      id: logId,
      ...logData,
      timestamp: new Date().toISOString()
    };
    
    const subject = subjects.find(s => s.id === logData.subjectId);
    if (!subject) return;

    const updatedTopics = subject.topics.map(t => {
      if (t.id === logData.topicId) {
        return { ...t, mastery: Math.min(100, t.mastery + 2) };
      }
      return t;
    });

    const updatedSubjects = subjects.map(s => s.id === logData.subjectId ? { ...s, topics: updatedTopics } : s);

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', user.uid, 'study_logs', logId), newLog);
    batch.update(doc(db, 'users', user.uid, 'subjects', logData.subjectId), { topics: updatedTopics });

    // Update profile
    const today = new Date().toISOString().split('T')[0];
    const lastDate = userProfile.lastStudyDate;
    let newStreak = userProfile.streak;

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
      ...userProfile,
      points: userProfile.points + (logData.duration * 2) + (logData.focusLevel * 10),
      streak: newStreak,
      lastStudyDate: today,
      totalSessions: userProfile.totalSessions + 1,
      totalStudyTime: userProfile.totalStudyTime + logData.duration
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

    batch.update(doc(db, 'users', user.uid), {
      ...updatedProfile,
      badges: updatedBadges
    });

    try {
      await batch.commit();
      addToast(`Logged session for ${subject.name}`, 'success');
      setRecentlyStudied(prev => {
        const filtered = prev.filter(id => id !== logData.topicId);
        return [logData.topicId, ...filtered].slice(0, 10);
      });
      setIsLoggingSession(false);
      generateAIInsights(newLog);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleLikeRecommendation = async (id: string) => {
    if (!user) return;
    const rec = recommendations.find(r => r.id === id);
    if (!rec) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'recommendations', id), { liked: !rec.liked });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/recommendations/${id}`);
    }
  };

  const handleDismissRecommendation = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'recommendations', id), { dismissed: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/recommendations/${id}`);
    }
  };

  const generateAIInsights = async (lastLog?: StudyLog) => {
    if (!user) return;
    setIsAIAnalyzing(true);
    addToast("AI is analyzing your performance...", "info");
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

      const newRecs = JSON.parse(response.text || "[]");
      const batch = writeBatch(db);
      newRecs.forEach((rec: any) => {
        const id = Math.random().toString(36).substr(2, 9);
        const recRef = doc(db, 'users', user.uid, 'recommendations', id);
        batch.set(recRef, { ...rec, id, liked: false, dismissed: false });
      });
      await batch.commit();
      addToast("New AI recommendations generated!", "success");
    } catch (error) {
      console.error("AI Analysis failed:", error);
      addToast("AI analysis failed. Please try again later.", "error");
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  const handleResetSyllabus = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      subjects.forEach(s => {
        batch.delete(doc(db, 'users', user.uid, 'subjects', s.id));
      });
      INITIAL_SUBJECTS.forEach(s => {
        const id = Math.random().toString(36).substr(2, 9);
        batch.set(doc(db, 'users', user.uid, 'subjects', id), { ...s, id });
      });
      await batch.commit();
      addToast("Syllabus reset to default", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/subjects`);
    }
  };

  const handleResetProfile = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        points: 0,
        streak: 0,
        badges: INITIAL_BADGES,
        totalSessions: 0,
        totalStudyTime: 0
      });
      addToast("Profile reset to default", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
    }
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
    addToast(`Starting deep focus session for ${subjects.find(s => s.id === subjectId)?.name}`, 'info');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
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
                <motion.section variants={itemVariants}>
                  <Planner 
                    prioritySubject={prioritySubject} 
                    dailyPlan={dailyPlan} 
                    onStartFocus={startFocus}
                    onViewFullSchedule={() => setActiveTab('schedule')}
                  />
                </motion.section>

                {/* Recently Studied Section (Spotify style horizontal scroll) */}
                {recentlyStudied.length > 0 && !searchQuery && (
                  <motion.section variants={itemVariants}>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold tracking-tight">Recently Studied</h2>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-sm font-bold text-gray-400 hover:text-white hover:underline"
                      >
                        Show all
                      </motion.button>
                    </div>
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                    >
                      {recentlyStudied.map(topicId => {
                        const subject = subjects.find(s => s.topics.some(t => t.id === topicId));
                        const topic = subject?.topics.find(t => t.id === topicId);
                        if (!topic || !subject) return null;
                        return (
                          <motion.div 
                            key={topicId} 
                            variants={itemVariants}
                            className="min-w-[180px] w-[180px]"
                          >
                            <TopicCard 
                              topic={topic} 
                              subjectName={subject.name} 
                              onStartFocus={() => startFocus(subject.id)}
                            />
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </motion.section>
                )}

                {/* Made For You (Daily Mixes) */}
                {!searchQuery && (
                  <motion.section variants={itemVariants}>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold tracking-tight">Made For You</h2>
                      <button className="text-sm font-bold text-gray-400 hover:text-white hover:underline">See all</button>
                    </div>
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                    >
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
                          variants={itemVariants}
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
                    </motion.div>
                  </motion.section>
                )}

                <motion.section variants={itemVariants}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">
                      {searchQuery ? `Search results for "${searchQuery}"` : 'Your Subjects'}
                    </h2>
                    {!searchQuery && <button onClick={() => setActiveTab('manage')} className="text-sm font-bold text-gray-400 hover:text-white hover:underline">Show all</button>}
                  </div>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {filteredSubjects.map(subject => (
                      <motion.div key={subject.id} variants={itemVariants}>
                        <SubjectCard subject={subject} onStartFocus={startFocus} />
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.section>

                <motion.section variants={itemVariants}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Recommended for You</h2>
                    <button onClick={() => setActiveTab('analytics')} className="text-sm font-bold text-gray-400 hover:text-white hover:underline">View Insights</button>
                  </div>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                  >
                    {processedSubjects.flatMap(s => s.topics).slice(0, 5).map(topic => (
                      <motion.div key={topic.id} variants={itemVariants}>
                        <TopicCard 
                          topic={topic} 
                          subjectName={subjects.find(s => s.topics.includes(topic))?.name || ''} 
                          onStartFocus={() => startFocus(subjects.find(s => s.topics.includes(topic))?.id || '')}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.section>

                <motion.section 
                  variants={itemVariants}
                  className="bg-gradient-to-br from-[#1DB954]/20 to-transparent p-8 rounded-3xl border border-[#1DB954]/20"
                >
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
                </motion.section>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Analytics subjects={processedSubjects} studyLogs={studyLogs} exams={exams} />
              </motion.div>
            )}
            {activeTab === 'schedule' && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <WeeklyScheduleView schedule={schedule} />
              </motion.div>
            )}
            {activeTab === 'syllabus' && (
              <motion.div
                key="syllabus"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SyllabusTracker subjects={subjects} onUpdateMastery={handleUpdateMastery} />
              </motion.div>
            )}
            {activeTab === 'manage' && (
              <motion.div
                key="manage"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
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
              </motion.div>
            )}
            {activeTab === 'weak-areas' && (
              <motion.div
                key="weak-areas"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AIInsights recommendations={recommendations} onLike={handleLikeRecommendation} onDismiss={handleDismissRecommendation} isLoading={isAIAnalyzing} />
              </motion.div>
            )}
            {activeTab === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Achievements profile={userProfile} />
              </motion.div>
            )}
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

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
