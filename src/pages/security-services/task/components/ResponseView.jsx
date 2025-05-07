import React, { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2, CheckCircle2, MessageSquare, AlertTriangle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useTaskContext } from '../context/TaskContext';
import useRequestComments from '../hooks/useRequestComments';

/**
 * Component for displaying a comment/response with reactions
 */
const ResponseView = ({ comment }) => {
  const { user } = useTaskContext();
  const { handleReaction } = useRequestComments();
  const [reactionLoading, setReactionLoading] = useState(false);
  
  if (!comment) return null;
  
  // Handle reaction click
  const onReactionClick = async (type) => {
    if (!comment.id || !user?.id) return;
    
    setReactionLoading(true);
    try {
      await handleReaction(comment.id, type);
    } finally {
      setReactionLoading(false);
    }
  };
  
  // Determine the type of comment
  const isSystemMessage = comment.is_system;
  const isSendBackReason = comment.is_system && comment.comment?.startsWith('SEND BACK REASON:');
  const isUnableToHandle = comment.is_system && comment.comment?.startsWith('UNABLE TO HANDLE:');
  const isOfficialResponse = comment.is_response === true;
  
  // Get appropriate icon
  const getIcon = () => {
    if (isSendBackReason) return <RotateCcw className="h-5 w-5 text-red-500" />;
    if (isUnableToHandle) return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    if (isOfficialResponse) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (isSystemMessage) return <AlertTriangle className="h-5 w-5 text-blue-500" />;
    return <MessageSquare className="h-5 w-5 text-gray-500" />;
  };
  
  // Get style based on type
  const getStyle = () => {
    if (isSendBackReason) {
      return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    }
    if (isUnableToHandle) {
      return "bg-gray-100 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700";
    }
    if (isOfficialResponse) {
      return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    }
    if (isSystemMessage) {
      return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
    return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";
  };
  
  // Format the comment content
  const getFormattedContent = () => {
    if (isSendBackReason) {
      return comment.comment.replace('SEND BACK REASON:', '').trim();
    }
    if (isUnableToHandle) {
      return comment.comment.replace('UNABLE TO HANDLE:', '').trim();
    }
    return comment.comment;
  };
  
  // Get appropriate label
  const getLabel = () => {
    if (isSendBackReason) return "Send Back Reason";
    if (isUnableToHandle) return "Unable to Handle";
    if (isOfficialResponse) return "Official Response";
    if (isSystemMessage) return "System";
    return "Feedback";
  };
  
  return (
    <div className={`p-4 border rounded-lg mb-4 ${getStyle()}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="font-medium flex items-center">
          {getIcon()}
          <span className="ml-2">{comment.created_by?.fullname || 'System'}</span>
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
            isOfficialResponse ? 'bg-green-100 text-green-800' : 
            isSystemMessage ? 'bg-blue-100 text-blue-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {getLabel()}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
        </div>
      </div>
      
      <div className="mb-4 whitespace-pre-wrap text-sm">
        {getFormattedContent()}
      </div>
      
      {/* Only show reactions for non-system messages */}
      {!isSystemMessage && (
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            size="sm"
            className={`flex items-center gap-1 ${comment.userReaction === 'like' ? 'text-blue-500 dark:text-blue-400' : ''}`}
            onClick={() => onReactionClick('like')}
            disabled={reactionLoading}
          >
            {reactionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
            <span>{comment.likes || 0}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className={`flex items-center gap-1 ${comment.userReaction === 'dislike' ? 'text-red-500 dark:text-red-400' : ''}`}
            onClick={() => onReactionClick('dislike')}
            disabled={reactionLoading}
          >
            {reactionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
            <span>{comment.dislikes || 0}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ResponseView;