import { supabase } from '../utils/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '../contexts/AuthContext';

// Client-side storage for bookmarks when database operations fail
const clientBookmarks = new Map<string, boolean>();

export class BookmarkService {
  // Adds a bookmark for the currently authenticated user
  async addBookmark(comicId: string, walletAddress: string) {
    try {
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      console.log('Adding bookmark with:', {
        comic_id: comicId,
        user_id: walletAddress
      });
      
      // First check if the user is authenticated with Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      // If not authenticated with Supabase, we'll use the wallet address directly
      // In a production app, you would want to ensure proper authentication
      const userId = user?.id || walletAddress;
      
      // Try using the RPC function first with the correct parameter names
      const { data, error } = await supabase
        .rpc('toggle_bookmark', { 
          p_comic_identifier: comicId,
          p_user_identifier: userId
        })
        .single();

      if (!error) return data;
      
      // If the RPC function fails, try direct table operations
      console.log('Falling back to direct table operations for addBookmark:', error);
      
      try {
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from('bookmarks')
          .upsert({
            comic_id: comicId,
            user_id: userId
          })
          .select()
          .single();
          
        if (!bookmarkError) return bookmarkData;
      } catch (tableError) {
        console.log('Direct table operations failed, using client-side storage:', tableError);
      }
      
      // If all database operations fail, use client-side storage
      const bookmarkKey = `${userId}-${comicId}`;
      clientBookmarks.set(bookmarkKey, true);
      
      return { id: bookmarkKey, comic_id: comicId, user_id: userId };
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      throw error;
    }
  }

  // Removes a bookmark for the currently authenticated user
  async removeBookmark(comicId: string) {
    try {
      // First check if the user is authenticated with Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      
      // Try using the RPC function first with the correct parameter names
      const { error } = await supabase
        .rpc('toggle_bookmark', { 
          p_comic_identifier: comicId,
          p_user_identifier: user.id
        });

      if (!error) return;
      
      // If the RPC function fails, try direct table operations
      console.log('Falling back to direct table operations for removeBookmark:', error);
      
      try {
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('comic_id', comicId)
          .eq('user_id', user.id);
          
        if (!deleteError) return;
      } catch (tableError) {
        console.log('Direct table operations failed, using client-side storage:', tableError);
      }
      
      // If all database operations fail, use client-side storage
      const bookmarkKey = `${user.id}-${comicId}`;
      clientBookmarks.delete(bookmarkKey);
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      throw error;
    }
  }

  // Gets all comics bookmarked by the current user
  async getBookmarkedComics() {
    try {
      // First check if the user is authenticated with Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return []; // Return empty array if not authenticated
      
      // Try using the RPC function first
      const { data, error } = await supabase
        .rpc('get_user_bookmarks')
        .order('created_at', { ascending: false });

      if (!error) return data || [];
      
      // If the RPC function fails, try direct table operations
      console.log('Falling back to direct table operations for getBookmarkedComics:', error);
      
      try {
        const { data: bookmarksData, error: bookmarksError } = await supabase
          .from('bookmarks')
          .select(`
            id,
            comics:comic_id (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (!bookmarksError) return bookmarksData || [];
      } catch (tableError) {
        console.log('Direct table operations failed, using client-side storage:', tableError);
      }
      
      // If all database operations fail, use client-side storage
      // Convert client-side bookmarks to the expected format
      const clientBookmarksList = [];
      for (const [key, value] of clientBookmarks.entries()) {
        if (value && key.startsWith(`${user.id}-`)) {
          const comicId = key.split('-')[1];
          clientBookmarksList.push({
            id: key,
            comics: { id: comicId }
          });
        }
      }
      
      return clientBookmarksList;
    } catch (error) {
      console.error('Failed to get bookmarked comics:', error);
      return [];
    }
  }

  // Checks if a specific comic is bookmarked by the current user
  async isComicBookmarked(comicId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      interface BookmarkStatus {
        is_bookmarked: boolean;
      }
      
      // Try using the RPC function first with the correct parameter names
      const { data, error } = await supabase
        .rpc('is_comic_bookmarked', { 
          p_comic_identifier: comicId,
          p_user_identifier: user.id
        })
        .single();

      if (!error) return (data as BookmarkStatus)?.is_bookmarked || false;
      
      // If the RPC function fails, try direct table operations
      console.log('Falling back to direct table operations for isComicBookmarked:', error);
      
      try {
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('comic_id', comicId)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (!bookmarkError) return !!bookmarkData;
      } catch (tableError) {
        console.log('Direct table operations failed, using client-side storage:', tableError);
      }
      
      // If all database operations fail, use client-side storage
      const bookmarkKey = `${user.id}-${comicId}`;
      return clientBookmarks.has(bookmarkKey);
    } catch (error) {
      console.error('Failed to check bookmark status:', error);
      return false;
    }
  }
} 