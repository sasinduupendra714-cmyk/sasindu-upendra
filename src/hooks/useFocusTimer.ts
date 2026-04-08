import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, auth } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './useFirestore';

import { useShallow } from 'zustand/react/shallow';

export function useFocusTimer() {
  const { 
    isPaused, 
    activeSession, 
    setActiveSession, 
    setIsFocusMode, 
    setIsLoggingSession, 
    addToast,
    userProfile,
    setUserProfile
  } = useAppStore(useShallow(state => ({
    isPaused: state.isPaused,
    activeSession: state.activeSession,
    setActiveSession: state.setActiveSession,
    setIsFocusMode: state.setIsFocusMode,
    setIsLoggingSession: state.setIsLoggingSession,
    addToast: state.addToast,
    userProfile: state.userProfile,
    setUserProfile: state.setUserProfile
  })));

  const tick = useCallback(() => {
    if (!activeSession || isPaused) return;

    setActiveSession({
      ...activeSession,
      elapsedSeconds: activeSession.elapsedSeconds + 1
    });

    // Auto-save progress every 5 minutes (300 seconds)
    if (activeSession.elapsedSeconds > 0 && activeSession.elapsedSeconds % 300 === 0) {
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          totalStudyTime: increment(5) // Add 5 minutes
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
      }
    }

    // Session complete
    if (activeSession.elapsedSeconds >= activeSession.totalSeconds) {
      setIsFocusMode(false);
      setIsLoggingSession(true);
      addToast("Focus session complete! Great job.", "success");
    }
  }, [activeSession, isPaused, setActiveSession, setIsFocusMode, setIsLoggingSession, addToast]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && !isPaused) {
      interval = setInterval(tick, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession, isPaused, tick]);

  return { tick };
}
