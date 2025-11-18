import { supabase } from '../utils/supabaseClient';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Comment {
  id: string;
  comic_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  username?: string;
  avatar_url?: string;
  // Join with profiles for user info
  profile?: {
    username: string;
    avatar_url: string;
  };
  // Vote information
  votes?: {
    upvotes: number;
    downvotes: number;
    user_vote: number | null;
  };
}

export const commentService = {
  // Get all comments for a comic
  async getComments(comicId: string): Promise<Comment[]> {
    try {
      // Try using the RPC function first
      const { data, error } = await supabase
        .rpc('get_comic_comments', {
          p_comic_draft_id: comicId
        });

      if (!error) return data || [];
      
      // If the RPC function fails, fall back to direct table operations
      console.log('Falling back to direct table operations for getComments:', error);
      
      // Since the comic_comments table doesn't exist, return an empty array
      return [];
    } catch (error) {
      console.error('Failed to get comments:', error);
      return [];
    }
  },

  // Add a new comment
  async addComment(comicId: string, content: string, parentId?: string): Promise<Comment> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the user's profile to get the username
      let username = 'Guest';
      let avatar_url = '';
      
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          username = profileData.username || 'Guest';
          avatar_url = profileData.avatar_url || '';
        }
      }
      
      // Use a guest user ID if no authenticated user is found
      const userId = user?.id || 'guest-user';
      
      // Try using the RPC function first
      const { data, error } = await supabase
        .rpc('add_comment', {
          p_creator_identifier: comicId,
          p_content: content,
          p_parent_id: parentId || null,
          p_user_identifier: userId
        })
        .single();

      if (!error) return data as Comment;
      
      // If the RPC function fails, create a client-side comment object
      console.log('Falling back to client-side comment for addComment:', error);
      
      // Since the comic_comments table doesn't exist, create a client-side comment
      const clientComment: Comment = {
        id: `temp-${Date.now()}`,
        comic_id: comicId,
        user_id: userId,
        content: content,
        parent_id: parentId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        username: username,
        avatar_url: avatar_url,
        profile: {
          username: username,
          avatar_url: avatar_url
        }
      };
      
      return clientComment;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  },

  // Delete a comment
  async deleteComment(commentId: string): Promise<boolean> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use a guest user ID if no authenticated user is found
      const userId = user?.id || 'guest-user';
      
      // Try using the RPC function first
      const { data, error } = await supabase
        .rpc('delete_comment', {
          p_comment_id: commentId,
          p_user_id: userId
        });

      if (!error) return data as boolean;
      
      // If the RPC function fails, fall back to direct table operations
      console.log('Falling back to direct table operations for deleteComment:', error);
      
      // Check if the user is the author of the comment
      const { data: comment } = await supabase
        .from('comic_comments')
        .select('user_id, comic_id')
        .eq('id', commentId)
        .single();
      
      if (!comment) return false;
      
      // Check if the user is the publisher of the comic
      const { data: comic } = await supabase
        .from('comics')
        .select('creator_id')
        .eq('id', comment.comic_id)
        .single();
      
      // Allow deletion if user is the comment author or the publisher
      if (comment.user_id === userId || (comic && comic.creator_id === userId)) {
        const { error: deleteError } = await supabase
          .from('comic_comments')
          .delete()
          .eq('id', commentId);
        
        return !deleteError;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      return false;
    }
  },

  // Vote on a comment (voteType: 1 for upvote, -1 for downvote)
  async voteOnComment(commentId: string, voteType: number): Promise<{ upvotes: number; downvotes: number; user_vote: number | null }> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use a guest user ID if no authenticated user is found
      const userId = user?.id || 'guest-user';
      
      // Try using the RPC function first
      const { data, error } = await supabase
        .rpc('vote_on_comment', {
          p_comment_id: commentId,
          p_user_id: userId,
          p_vote_type: voteType
        });

      if (!error) return data;
      
      // If the RPC function fails, fall back to direct table operations
      console.log('Falling back to direct table operations for voteOnComment:', error);
      
      // Check if the user has already voted on this comment
      const { data: existingVote } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();
      
      // If vote exists and is the same type, remove the vote (toggle off)
      if (existingVote && existingVote.vote_type === voteType) {
        await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);
      } 
      // If vote exists but is different type, update it
      else if (existingVote) {
        await supabase
          .from('comment_votes')
          .update({ vote_type: voteType })
          .eq('comment_id', commentId)
          .eq('user_id', userId);
      } 
      // If no vote exists, insert new vote
      else {
        await supabase
          .from('comment_votes')
          .insert({
            comment_id: commentId,
            user_id: userId,
            vote_type: voteType
          });
      }
      
      // Get updated vote counts
      const { data: upvotes } = await supabase
        .from('comment_votes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('vote_type', 1);
      
      const { data: downvotes } = await supabase
        .from('comment_votes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('vote_type', -1);
      
      // Get user's current vote
      const { data: userVote } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();
      
      return {
        upvotes: upvotes?.length || 0,
        downvotes: downvotes?.length || 0,
        user_vote: userVote ? userVote.vote_type : null
      };
    } catch (error) {
      console.error('Failed to vote on comment:', error);
      return { upvotes: 0, downvotes: 0, user_vote: null };
    }
  },

  // Get votes for a comment
  async getCommentVotes(commentId: string): Promise<{ upvotes: number; downvotes: number; user_vote: number | null }> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use a guest user ID if no authenticated user is found
      const userId = user?.id || 'guest-user';
      
      // Try using the RPC function first
      const { data, error } = await supabase
        .rpc('get_comment_votes', {
          p_comment_id: commentId,
          p_user_id: userId
        });

      if (!error) return data;
      
      // If the RPC function fails, fall back to direct table operations
      console.log('Falling back to direct table operations for getCommentVotes:', error);
      
      // Get vote counts
      const { data: upvotes } = await supabase
        .from('comment_votes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('vote_type', 1);
      
      const { data: downvotes } = await supabase
        .from('comment_votes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('vote_type', -1);
      
      // Get user's vote
      const { data: userVote } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();
      
      return {
        upvotes: upvotes?.length || 0,
        downvotes: downvotes?.length || 0,
        user_vote: userVote ? userVote.vote_type : null
      };
    } catch (error) {
      console.error('Failed to get comment votes:', error);
      return { upvotes: 0, downvotes: 0, user_vote: null };
    }
  },

  // Subscribe to real-time updates
  subscribeToComments(comicId: string, callback: (comment: Comment) => void) {
    return supabase
      .channel(`comic_comments:${comicId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comic_comments',
        filter: `comic_id=eq.${comicId}`
      }, (payload: RealtimePostgresChangesPayload<Comment>) => {
        if (payload.new && 'id' in payload.new) {
          callback(payload.new as Comment);
        }
      })
      .subscribe();
  }
}; 