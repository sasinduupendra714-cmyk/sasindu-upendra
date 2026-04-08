import React, { useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PlayerBar from './PlayerBar';
import NowPlayingSidebar from './NowPlayingSidebar';
import FocusMode from './FocusMode';
import StudyLogForm from './StudyLogForm';
import ToastContainer from './Toast';
import { useAppStore } from '../store/useAppStore';
import { useFirestore } from '../hooks/useFirestore';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { auth, db, googleProvider, signInWithPopup } from '../firebase';
import { cn } from '../lib/utils';
import { doc, writeBatch, increment } from 'firebase/firestore';
import { studyLogSchema } from '../lib/schemas';
import confetti from 'canvas-confetti';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    subjects, 
    isNowPlayingOpen, 
    setIsNowPlayingOpen,
    isFocusMode,
    setIsFocusMode,
    isLoggingSession,
    setIsLoggingSession,
    userProfile,
    user,
    addToast,
    toasts,
    removeToast,
    setHighlightedSubjectId,
    searchQuery,
    setSearchQuery,
    addRecentlyStudied
  } = useAppStore(useShallow(state => ({
    subjects: state.subjects,
    isNowPlayingOpen: state.isNowPlayingOpen,
    setIsNowPlayingOpen: state.setIsNowPlayingOpen,
    isFocusMode: state.isFocusMode,
    setIsFocusMode: state.setIsFocusMode,
    isLoggingSession: state.isLoggingSession,
    setIsLoggingSession: state.setIsLoggingSession,
    userProfile: state.userProfile,
    user: state.user,
    addToast: state.addToast,
    toasts: state.toasts,
    removeToast: state.removeToast,
    setHighlightedSubjectId: state.setHighlightedSubjectId,
    searchQuery: state.searchQuery,
    setSearchQuery: state.setSearchQuery,
    addRecentlyStudied: state.addRecentlyStudied
  })));

  useFirestore();
  useFocusTimer();

  // Badge Unlock Celebration
  const prevBadgesCount = React.useRef(userProfile.badges.filter(b => b.unlockedAt).length);
  
  React.useEffect(() => {
    const currentCount = userProfile.badges.filter(b => b.unlockedAt).length;
    if (currentCount > prevBadgesCount.current) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#1DB954', '#ffffff']
      });
      addToast("New Badge Unlocked! 🏆", "success");
    }
    prevBadgesCount.current = currentCount;
  }, [userProfile.badges, addToast]);

  const handleLogin = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addToast("Successfully logged in!", "success");
    } catch (error) {
      console.error("Login failed", error);
      addToast("Login failed. Please try again.", "error");
    }
  }, [addToast]);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      addToast("Logged out successfully", "info");
    } catch (error) {
      console.error("Logout failed", error);
    }
  }, [addToast]);

  const startFocus = useCallback((subjectId: string) => {
    useAppStore.getState().setActiveSubjectId(subjectId);
    setIsFocusMode(true);
    useAppStore.getState().setIsPaused(false);
    useAppStore.getState().setActiveSession({
      subjectId,
      topicId: useAppStore.getState().subjects.find(s => s.id === subjectId)?.topics[0]?.id || '',
      elapsedSeconds: 0,
      totalSeconds: 90 * 60
    });
    addToast(`Starting deep focus session`, 'info');
  }, [setIsFocusMode, addToast]);

  const handleSaveLog = useCallback(async (logData: any) => {
    if (!user) {
      addToast("Please sign in to save your progress", "error");
      return;
    }

    // Validate with Zod
    const validation = studyLogSchema.safeParse(logData);
    if (!validation.success) {
      addToast(validation.error.issues[0].message, "error");
      return;
    }

    const logId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    
    const subject = subjects.find(s => s.id === logData.subjectId);
    if (!subject) return;

    const updatedTopics = subject.topics.map(t => {
      if (t.id === logData.topicId) {
        return { ...t, mastery: Math.min(100, t.mastery + 2) };
      }
      return t;
    });

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', user.uid, 'study_logs', logId), {
      id: logId,
      ...logData,
      timestamp
    });
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

    batch.update(doc(db, 'users', user.uid), {
      points: increment((logData.duration * 2) + (logData.focusLevel * 10)),
      streak: newStreak,
      lastStudyDate: today,
      totalSessions: increment(1),
      totalStudyTime: increment(logData.duration)
    });

    try {
      await batch.commit();
      
      // Celebration!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1DB954', '#ffffff', '#121212']
      });

      addToast(`Logged session for ${subject.name}`, 'success');
      addRecentlyStudied(logData.topicId);
      setIsLoggingSession(false);
    } catch (e) {
      console.error("Failed to save log", e);
      addToast("Failed to save session", "error");
    }
  }, [user, subjects, userProfile, addToast, addRecentlyStudied, setIsLoggingSession]);

  const handleSubjectClick = useCallback((id: string) => {
    setHighlightedSubjectId(id);
    navigate('/syllabus');
    // Reset highlighted subject after a delay
    setTimeout(() => setHighlightedSubjectId(null), 2000);
  }, [navigate, setHighlightedSubjectId]);

  const handleAutoPlan = useCallback(() => {}, []);
  const handleLogSession = useCallback(() => setIsLoggingSession(true), [setIsLoggingSession]);
  const handleStartFocus = useCallback(() => startFocus(subjects[0]?.id || ''), [startFocus, subjects]);
  const handleToggleNowPlaying = useCallback(() => setIsNowPlayingOpen(!isNowPlayingOpen), [isNowPlayingOpen, setIsNowPlayingOpen]);

  return (
    <div className="flex h-screen bg-black text-white font-sans selection:bg-[#1DB954] selection:text-black overflow-hidden">
      <Sidebar 
        subjects={subjects}
        onSubjectClick={handleSubjectClick}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar 
          onAutoPlan={handleAutoPlan} 
          onLogSession={handleLogSession}
          onStartFocus={handleStartFocus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          points={userProfile.points}
          streak={userProfile.streak}
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onToggleNowPlaying={handleToggleNowPlaying}
          isNowPlayingOpen={isNowPlayingOpen}
        />

        <div className="flex-1 flex overflow-hidden">
          <main className={cn(
            "flex-1 overflow-y-auto scrollbar-hide pb-40",
            isNowPlayingOpen ? "md:pb-8" : "md:pb-32"
          )}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>

          {isNowPlayingOpen && (
            <NowPlayingSidebar onClose={() => setIsNowPlayingOpen(false)} />
          )}
        </div>

        <PlayerBar />
      </div>

      {isFocusMode && (
        <FocusMode onExit={() => setIsFocusMode(false)} />
      )}

      {isLoggingSession && (
        <StudyLogForm 
          subjects={subjects}
          onClose={() => setIsLoggingSession(false)}
          onSave={handleSaveLog}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
