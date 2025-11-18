import React from 'react';
import { useAuth } from '../../contexts/AuthProvider';

export const Profile: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-indigo-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-indigo-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Please log in to view your profile</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Profile</h1>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Email</h2>
              <p className="text-gray-700 dark:text-gray-300">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 