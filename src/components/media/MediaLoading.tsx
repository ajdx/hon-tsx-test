import React from 'react';

export const MediaLoading: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-800">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-300">Loading media...</p>
    </div>
  </div>
);