import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export default function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-white/5",
        variant === 'circular' ? 'rounded-full' : 'rounded-lg',
        variant === 'text' ? 'h-4 w-3/4' : '',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#181818] p-4 rounded-xl border border-white/5 space-y-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" variant="text" />
      <Skeleton className="h-3 w-1/2" variant="text" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-[#181818] rounded-xl border border-white/5">
          <Skeleton className="w-12 h-12" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" variant="text" />
            <Skeleton className="h-3 w-1/4" variant="text" />
          </div>
        </div>
      ))}
    </div>
  );
}
