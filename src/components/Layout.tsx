import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
    activeSession,
    setActiveSession,
    isPaused,
    setIsPaused,
    userProfile,
    user,
    addToast,
    toasts,
    removeToast,
    setHighlightedSubjectId,
    searchQuery,
    setSearchQuery,
    addRecentlyStudied
  } = useAppStore();

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

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addToast("Successfully logged in!", "success");
    } catch (error) {
      console.error("Login failed", error);
      addToast("Login failed. Please try again.", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      addToast("Logged out successfully", "info");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const startFocus = (subjectId: string) => {
    useAppStore.getState().setActiveSubjectId(subjectId);
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

  const handleSaveLog = async (logData: any) => {
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
  };

  const handleSubjectClick = (id: string) => {
    setHighlightedSubjectId(id);
    navigate('/syllabus');
    // Reset highlighted subject after a delay
    setTimeout(() => setHighlightedSubjectId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans selection:bg-[#1DB954] selection:text-black overflow-hidden">
      <Sidebar 
        subjects={subjects}
        onSubjectClick={handleSubjectClick}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar 
          onAutoPlan={() => {}} 
          onLogSession={() => setIsLoggingSession(true)}
          onStartFocus={() => startFocus(subjects[0]?.id || '')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          points={userProfile.points}
          streak={userProfile.streak}
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onToggleNowPlaying={() => setIsNowPlayingOpen(!isNowPlayingOpen)}
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
            <NowPlayingSidebar 
              currentSubject={subjects.find(s => s.id === activeSession?.subjectId)?.name || 'Select a Subject'} 
              currentSubjectImage={subjects.find(s => s.id === activeSession?.subjectId)?.image}
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
              })() : '1:30:00'}
              onClose={() => setIsNowPlayingOpen(false)}
            />
          )}
        </div>

        <PlayerBar 
          activeSession={activeSession}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
          onStop={() => {
            setIsFocusMode(false);
            setActiveSession(null);
          }}
          onOpenFocus={() => setIsFocusMode(true)}
          subjects={subjects}
        />
      </div>

      {isFocusMode && activeSession && (
        <FocusMode 
          subject={subjects.find(s => s.id === activeSession.subjectId)!}
          session={activeSession}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
          onExit={() => setIsFocusMode(false)}
        />
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
