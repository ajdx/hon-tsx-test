import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLikesStore } from '../../store/useLikesStore';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';

interface LikeButtonProps {
  comicId?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({ comicId }) => {
  const { user, isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toggleLike, getLikeStatus } = useLikesStore();

  // Load initial like state and count
  useEffect(() => {
    if (user?.id && comicId) {
      getLikeStatus(user.id, comicId).then(status => {
        setIsLiked(status.isLiked);
        setLikeCount(status.count);
      });
    }
  }, [user?.id, comicId]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      // Handle unauthenticated state - maybe show login prompt
      console.log('User must be authenticated to like');
      return;
    }

    if (!user?.id || !comicId) {
      console.log('Missing required data:', { userId: user?.id, comicId });
      return;
    }
    
    try {
      setIsAnimating(true);
      const currentLikeState = isLiked;
      
      // Optimistic update
      setIsLiked(!currentLikeState);
      setLikeCount(prev => currentLikeState ? prev - 1 : prev + 1);
      
      await toggleLike(user.id, comicId);
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 700);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic updates on error
      setIsLiked(isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

  return (
    <div className="relative group">
      <div className="flex items-center">
        <motion.button
          onClick={handleLike}
          whileTap={{ scale: 0.85 }}
          className={`flex items-center justify-center p-1 transition-colors ${isAnimating ? 'animate-like' : ''}`}
        >
          <motion.div
            animate={isAnimating ? {
              scale: [1, 1.8, 0.8, 1.3, 1],
              rotate: [0, 20, -20, 10, 0],
              transition: {
                duration: 0.7,
                times: [0, 0.2, 0.4, 0.6, 0.8],
                ease: "easeInOut"
              }
            } : {}}
          >
            <Heart 
              className={`w-5 h-5 transition-colors duration-300 ${
                isLiked 
                  ? 'fill-pink-500 text-pink-500' 
                  : 'text-indigo-600 dark:text-indigo-400 hover:text-pink-500'
              }`} 
            />
          </motion.div>
          <AnimatePresence>
            {isAnimating && isLiked && (
              <motion.div
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 rounded-full"
              >
                <div className="absolute inset-0 bg-pink-500/30 rounded-full" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        
        {/* Like Count */}
        {likeCount > 0 && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`ml-1 text-sm font-medium ${
              isLiked ? 'text-pink-500' : 'text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {likeCount}
          </motion.span>
        )}
      </div>

      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-indigo-500 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {isLiked ? 'Liked' : 'Like'}
      </div>
    </div>
  );
}; 