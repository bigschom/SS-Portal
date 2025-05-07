import { useState, useCallback } from 'react';
import { useTaskContext } from '../context/TaskContext';
import taskService from '../../../../services/task-service';

/**
 * Hook for managing request comments and reactions
 */
const useRequestComments = () => {
  const { 
    user, 
    setError, 
    setSuccess, 
    selectedRequest,
    setRequestLoading 
  } = useTaskContext();
  
  const [requestComments, setRequestComments] = useState([]);
  
  // Fetch comments for a specific request
// Fetch comments for a specific request
const fetchRequestComments = useCallback(async (requestId) => {
  if (!requestId) return;
  
  try {
    // Fetch comments using task service
    const comments = await taskService.getRequestComments(requestId);
    
    // Ensure comments is an array before mapping
    if (Array.isArray(comments)) {
      // Process comments to add reaction information if needed
      const processedComments = comments.map(comment => ({
        ...comment,
        likes: comment.likes || 0,
        dislikes: comment.dislikes || 0,
        userReaction: comment.userReaction || null
      }));
      
      setRequestComments(processedComments);
    } else {
      // If not an array, set empty array
      console.warn('Comments data is not an array:', comments);
      setRequestComments([]);
    }
  } catch (err) {
    console.error('Error fetching request comments:', err);
    setError('Failed to fetch comments');
    setRequestComments([]);
  }
}, [setError]);

  
  // Add a comment to a request
  const addComment = useCallback(async (commentText, isSystem = false, isResponse = false, isSendBackReason = false) => {
    if (!selectedRequest?.id || !user?.id || !commentText?.trim()) return;
    
    setRequestLoading(selectedRequest.id, true);
    try {
      // Add comment using task service
      await taskService.addComment(
        selectedRequest.id, 
        user.id, 
        commentText, 
        isSystem, 
        isResponse,
        isSendBackReason
      );

      // Refresh comments
      await fetchRequestComments(selectedRequest.id);
      
      setSuccess('Comment added successfully');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  }, [selectedRequest, user, fetchRequestComments, setError, setSuccess, setRequestLoading]);

  // Handle reaction to a comment
  const handleReaction = useCallback(async (commentId, reactionType) => {
    if (!commentId || !user?.id) return;
    
    try {
      // Handle reaction using task service
      await taskService.handleCommentReaction(commentId, user.id, reactionType);
      
      // Refresh comments to update reactions
      if (selectedRequest?.id) {
        await fetchRequestComments(selectedRequest.id);
      }
    } catch (err) {
      console.error('Error handling reaction:', err);
      setError('Failed to update reaction');
    }
  }, [user, selectedRequest, fetchRequestComments, setError]);

  return {
    requestComments,
    fetchRequestComments,
    addComment,
    handleReaction
  };
};

export default useRequestComments;