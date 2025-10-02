import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
};

export const SummaryItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 overflow-hidden">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b dark:border-gray-700">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Raw Data Section */}
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="bg-gray-100 dark:bg-[#010613] rounded-lg p-3 h-96">
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-5/6 mb-2" />
            <Skeleton className="h-3 w-4/5 mb-2" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4 mb-2" />
            <Skeleton className="h-3 w-5/6 mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>

        {/* Summary Section */}
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <div className="bg-gray-100 dark:bg-[#010613] rounded-lg p-3 h-96">
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-4/5 mb-2" />
            <Skeleton className="h-3 w-5/6 mb-2" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/5 mb-2" />
            <Skeleton className="h-3 w-4/6 mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-32 ml-auto" />
      </div>
    </div>
  );
};
