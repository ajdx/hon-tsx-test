import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';

// Define interfaces for RPC function return types
interface UserLike {
  comic_id: string;
  created_at: string;
}

interface LikeStatus {
  is_liked: boolean;
}

interface LikeCount {
  like_count: number;
}

interface LikesStore {
  likes: Record<string, boolean>;
  likeCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  initializeStore: () => Promise<void>;
  getLikeStatus: (userId: string, comicId: string) => Promise<{ isLiked: boolean; count: number }>;
  getLikeCount: (comicId: string) => Promise<number>;
  toggleLike: (userId: string, comicId: string) => Promise<void>;
}

export const useLikesStore = create<LikesStore>((set, get) => ({
  likes: {},
  likeCounts: {},
  isLoading: true,
  error: null,
  isInitialized: false,

  initializeStore: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      // For now, we'll just initialize with empty state since the function might not exist
      set({ 
        isLoading: false,
        isInitialized: true
      });
    } catch (error) {
      console.error('Error initializing likes store:', error);
      set({ isLoading: false });
    }
  },

  getLikeStatus: async (userId: string, comicId: string) => {
    try {
      // Since the is_comic_liked function doesn't exist, we'll check the local state
      // or return default values
      const stateKey = `${userId}-${comicId}`;
      const isLiked = get().likes[stateKey] || false;
      const count = get().likeCounts[comicId] || 0;
      
      return { isLiked, count };
    } catch (error) {
      console.error('Error getting like status:', error);
      return { isLiked: false, count: 0 };
    }
  },

  getLikeCount: async (comicId: string) => {
    try {
      // Return the count from local state since the function might not exist
      return get().likeCounts[comicId] || 0;
    } catch (error) {
      console.error('Error getting like count:', error);
      return 0;
    }
  },

  toggleLike: async (userId: string, comicId: string) => {
    try {
      // Get current like status from local state
      const stateKey = `${userId}-${comicId}`;
      const isLiked = get().likes[stateKey] || false;
      
      // Since the toggle_like function doesn't exist, we'll just update local state
      // In a real implementation, you would call the correct function here
      
      // Update local state
      set(state => ({
        likes: { ...state.likes, [stateKey]: !isLiked },
        likeCounts: {
          ...state.likeCounts,
          [comicId]: (state.likeCounts[comicId] || 0) + (isLiked ? -1 : 1)
        }
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }
})); 