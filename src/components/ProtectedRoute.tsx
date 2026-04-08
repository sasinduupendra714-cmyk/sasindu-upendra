import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

import { useShallow } from 'zustand/react/shallow';

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAuthReady } = useAppStore(useShallow(state => ({
    user: state.user,
    isAuthReady: state.isAuthReady
  })));
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-[#1DB954] animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse">Initializing StudyFlow...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
