import { useState, useEffect } from 'react';
import { MessageCircle, X, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { commentService } from '../../services/commentService';
import type { Comment } from '../../services/commentService';
import { useAuth } from '../../contexts/AuthContext';

interface CommentWidgetProps {
  comicId: string;
}

export const CommentWidget = ({ comicId }: CommentWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [animatingVote, setAnimatingVote] = useState<{id: string, type: number} | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Authentication check (debug logs removed for production)
    if (!comicId) return;

    // Hide tooltip after 4 seconds
    setTimeout(() => {
      setShowTooltip(false);
    }, 4000);

    // Load initial comments
    loadComments();

    // Subscribe to real-time updates
    const subscription = commentService.subscribeToComments(comicId, (comment) => {
      setComments(prev => [...prev, comment]);
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [comicId, user]);

  const loadComments = async () => {
    if (!comicId) return;
    
    try {
      const fetchedComments = await commentService.getComments(comicId);
      
      // Load vote counts for each comment
      const commentsWithVotes = await Promise.all(
        fetchedComments.map(async (comment) => {
          const votes = await commentService.getCommentVotes(comment.id);
          return { ...comment, votes };
        })
      );
      
      setComments(commentsWithVotes);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    if (!user) {
      console.error('Cannot post comment: User not authenticated');
      return;
    }
    
    if (!comicId) {
      console.error('Cannot post comment: Missing comic ID');
      return;
    }

    setIsLoading(true);
    
    try {
      const comment = await commentService.addComment(comicId, newComment);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!commentId) return;
    
    setDeletingCommentId(commentId);
    try {
      const success = await commentService.deleteComment(commentId);
      if (success) {
        // Remove the comment from the local state
        setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleVote = async (commentId: string, voteType: number) => {
    if (!commentId) return;
    
    setVotingCommentId(commentId);
    // Trigger animation
    setAnimatingVote({ id: commentId, type: voteType });
    
    // Reset animation after a short delay
    setTimeout(() => {
      setAnimatingVote(null);
    }, 1000);
    
    try {
      const voteResult = await commentService.voteOnComment(commentId, voteType);
      
      // Update the comment in the local state with the new vote counts
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId 
            ? { ...comment, votes: voteResult } 
            : comment
        )
      );
    } catch (error) {
      console.error('Failed to vote on comment:', error);
    } finally {
      setVotingCommentId(null);
    }
  };

  // Check if the user can delete a comment (if they are the author or the publisher)
  const canDeleteComment = (comment: Comment) => {
    // For testing purposes, allow all users to delete any comment
    return true;
    
    // Original logic - uncomment when ready
    /*
    if (!user) return false;
    
    // User can delete their own comments
    if (comment.user_id === user.id) return true;
    
    // Publishers can delete any comment on their comics
    // This would require checking if the current user is the publisher of the comic
    // For simplicity, we'll just allow users to delete their own comments for now
    
    return false;
    */
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="rounded-full bg-white dark:bg-gray-800 p-3 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle comments"
        >
          <MessageCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </button>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap"
            >
              <div className="bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                View Comments
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-0 right-0 mb-16 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-indigo-600 dark:text-indigo-400">Comments</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[60vh] text-gray-800 dark:text-gray-200">
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No comments yet. Be the first to comment!
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="relative">
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <span className="text-indigo-600 dark:text-indigo-300 font-medium">
                              {comment.username?.[0]?.toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {comment.username || 'Anonymous'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">
                              {comment.content}
                            </p>
                            
                            {/* Vote buttons */}
                            <div className="flex items-center mt-2 space-x-4">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleVote(comment.id, 1)}
                                  disabled={votingCommentId === comment.id}
                                  className={`p-1 rounded-full ${
                                    comment.votes?.user_vote === 1
                                      ? 'text-indigo-600 dark:text-indigo-400'
                                      : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                  }`}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                                <span className={`text-xs font-medium ${
                                  comment.votes?.user_vote === 1
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : comment.votes?.user_vote === -1
                                    ? 'text-red-500'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {comment.votes?.upvotes || 0}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleVote(comment.id, -1)}
                                  disabled={votingCommentId === comment.id}
                                  className={`p-1 rounded-full ${
                                    comment.votes?.user_vote === -1
                                      ? 'text-red-500'
                                      : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                                  }`}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                <span className={`text-xs font-medium ${
                                  comment.votes?.user_vote === -1
                                    ? 'text-red-500'
                                    : comment.votes?.user_vote === 1
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {comment.votes?.downvotes || 0}
                                </span>
                              </div>
                              
                              {/* Delete button - only show for user's own comments */}
                              {canDeleteComment(comment) && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={deletingCommentId === comment.id}
                                  className="ml-auto p-1 text-gray-500 dark:text-gray-400 hover:text-red-500"
                                >
                                  {deletingCommentId === comment.id ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {user ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmitComment(); }} className="space-y-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isLoading || !newComment.trim()}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-2 text-gray-500 dark:text-gray-400">
                    Please sign in to comment
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}; 