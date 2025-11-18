import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const UsernameInput: React.FC = () => {
  const { user, updateUsername } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateUsername) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateUsername(username);
      setSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
          Username
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            placeholder="Enter username"
            className={`block flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white transition-colors ${
              error ? 'border-red-500' : success ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !username}
            className={`px-3 py-1.5 text-sm rounded-md shadow-sm text-white transition-colors ${
              isLoading || !username
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-500 mt-1 transition-colors">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-600 dark:text-green-500 mt-1 transition-colors">
          Username saved successfully
        </div>
      )}
    </form>
  );
}; 