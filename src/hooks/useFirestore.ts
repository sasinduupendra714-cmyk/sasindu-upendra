import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { auth, db } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  setDoc, 
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Subject, StudyLog, WeeklySchedule, UserProfile, ExamRecord } from '../types';
import { INITIAL_BADGES, INITIAL_SUBJECTS, WEEKLY_BASE_SCHEDULE } from '../constants';

// Error Handling Spec for Firestore Operations
export enum OperationType {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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

export function useFirestore() {
  const { 
    user, 
    setUser, 
    setIsAuthReady, 
    setUserProfile, 
    setSubjects, 
    setStudyLogs, 
    setExams, 
    setSchedule 
  } = useAppStore();

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [setUser, setIsAuthReady]);

  // Firestore Listeners
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    
    // Profile Listener
    const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
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
        const firestoreSubjects = snap.docs.map(d => d.data() as Subject);
        
        const batch = writeBatch(db);
        let needsUpdate = false;

        const updatedSubjects = firestoreSubjects.map(fs => {
          const initial = INITIAL_SUBJECTS.find(s => s.id === fs.id);
          let subjectUpdated = false;
          let updatedFs = { ...fs };

          if (initial && !fs.image && initial.image) {
            subjectUpdated = true;
            updatedFs.image = initial.image;
          }

          if (initial && initial.topics) {
            const updatedTopics = fs.topics.map(ft => {
              const initialTopic = initial.topics.find(t => t.id === ft.id);
              if (initialTopic && !ft.image && initialTopic.image) {
                subjectUpdated = true;
                return { ...ft, image: initialTopic.image };
              }
              return ft;
            });
            updatedFs.topics = updatedTopics;
          }

          if (subjectUpdated) {
            needsUpdate = true;
            const sRef = doc(db, 'users', user.uid, 'subjects', fs.id);
            batch.update(sRef, { 
              image: updatedFs.image || null,
              topics: updatedFs.topics 
            });
          }
          return updatedFs;
        });

        if (needsUpdate) {
          batch.commit().catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/subjects`));
        }

        setSubjects(updatedSubjects);
      } else {
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

    // Exams Listener
    const unsubExams = onSnapshot(collection(db, 'users', user.uid, 'exams'), (snap) => {
      setExams(snap.docs.map(d => d.data() as ExamRecord));
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/exams`));

    return () => {
      unsubProfile();
      unsubSubjects();
      unsubLogs();
      unsubSchedule();
      unsubExams();
    };
  }, [user, setUserProfile, setSubjects, setStudyLogs, setExams, setSchedule]);
}
