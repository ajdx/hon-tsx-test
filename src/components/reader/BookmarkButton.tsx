import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';

interface BookmarkButtonProps {
  comicId: string;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({ comicId }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const { addBookmark, removeBookmark, isComicBookmarked } = useBookmarkStore();
  const { isAuthenticated, user } = useAuth();
  const { publicKey } = useWallet();

  useEffect(() => {
    // Authentication check (debug logs removed for production)
    if (!user || !isAuthenticated) {
      return;
    }
    
    const checkBookmarkStatus = async () => {
      if (!isAuthenticated || !publicKey) {
        console.log('Not checking bookmarks - not authenticated');
        setIsBookmarked(false);
        return;
      }
      
      try {
        const status = await isComicBookmarked(comicId);
        setIsBookmarked(status);
      } catch (error) {
        console.error('Failed to check bookmark status:', error);
        setError('Failed to check bookmark status');
      }
    };
    checkBookmarkStatus();
  }, [comicId, isComicBookmarked, isAuthenticated, publicKey, user]);

  const handleToggleBookmark = async () => {
    if (isLoading) return;
    
    if (!isAuthenticated || !publicKey) {
      console.log('Cannot bookmark - not authenticated');
      setError('Please connect your wallet to bookmark comics');
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      if (isBookmarked) {
        await removeBookmark(comicId);
        setIsBookmarked(false);
      } else {
        await addBookmark(comicId, publicKey.toString());
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      setError('Failed to update bookmark');
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleToggleBookmark}
        className={`flex items-center justify-center p-1 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isLoading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !error && setShowTooltip(false)}
      >
        {isBookmarked ? (
          <BookmarkCheck className="w-5 h-5 text-amber-500 dark:text-yellow-400" />
        ) : (
          <Bookmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300" />
        )}
      </button>
      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-indigo-500 rounded transition-opacity whitespace-nowrap ${showTooltip || error ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {error || (isBookmarked ? 'Saved to Collection' : 'Add to Collection')}
      </div>
    </div>
  );
}; 