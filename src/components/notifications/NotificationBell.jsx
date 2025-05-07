// src/components/notifications/NotificationBell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Loader2,
  RotateCcw,
  XCircle,
  MessageSquare,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import notificationService from '../../services/notificationService';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useToast } from '../ui/use-toast';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const bellRef = useRef(null);
  const { toast } = useToast();
  
  // Fetch notifications on mount and when needed
  useEffect(() => {
    fetchNotifications();
    
    // Set up interval to check for new notifications
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bellRef]);
  
  // Fetch notifications
  const fetchNotifications = async (reset = false) => {
    try {
      setLoading(true);
      const pageToFetch = reset ? 1 : page;
      
      const result = await notificationService.getNotifications({
        page: pageToFetch,
        pageSize: 5
      });
      
      const newNotifications = result.items || [];
      
      if (reset || pageToFetch === 1) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }
      
      setHasMore(pageToFetch < result.totalPages);
      
      if (reset) {
        setPage(1);
      }
      
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };
  
  // Toggle notifications panel
  const toggleNotifications = () => {
    setIsOpen(!isOpen);
    
    if (!isOpen && notifications.length === 0) {
      fetchNotifications(true);
    }
  };
  
  // Load more notifications
  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchNotifications(false);
  };
  
  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      });
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      setUnreadCount(0);
      
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive'
      });
    }
  };
  
  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      await fetchUnreadCount();
      
      toast({
        title: 'Success',
        description: 'Notification deleted',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive'
      });
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      window.location.href = notification.link;
    }
    
    setIsOpen(false);
  };
  
  // Get icon component based on icon name
  const getIconComponent = (iconName, color = 'blue') => {
    const iconProps = { 
      className: `h-5 w-5 text-${color}-500 dark:text-${color}-400`,
      strokeWidth: 2 
    };
    
    switch (iconName) {
      case 'CheckCircle':
        return <CheckCircle2 {...iconProps} />;
      case 'Bell':
        return <Bell {...iconProps} />;
      case 'AlertCircle':
        return <AlertCircle {...iconProps} />;
      case 'Clock':
        return <Clock {...iconProps} />;
      case 'RotateCcw':
        return <RotateCcw {...iconProps} />;
      case 'XCircle':
        return <XCircle {...iconProps} />;
      case 'MessageSquare':
        return <MessageSquare {...iconProps} />;
      case 'UserPlus':
        return <UserPlus {...iconProps} />;
      case 'RefreshCw':
        return <RefreshCw {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };
  
  return (
    <div className="relative" ref={bellRef}>
      <button
        className="relative p-2 rounded-full text-gray-600 hover:text-primary hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        onClick={toggleNotifications}
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            className="absolute top-1 right-1 flex items-center justify-center bg-primary text-white p-0.5 leading-none rounded-full min-w-[18px] h-[18px] text-xs"
            variant="primary"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50 border border-gray-200 dark:border-gray-700">
          <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0 || loading}
                title="Mark all as read"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNotifications(true)}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            {loading && page === 1 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <div key={notification.id}>
                    <div 
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex">
                        <div className="flex-shrink-0 mr-3">
                          <div className={`rounded-full p-2 bg-${notification.color || 'blue'}-100 dark:bg-${notification.color || 'blue'}-900/30`}>
                            {getIconComponent(notification.icon, notification.color || 'blue')}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div 
                            className="cursor-pointer"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <p className="font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex justify-between items-center mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                              <div className="flex items-center">
                                {!notification.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    title="Mark as read"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-red-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </div>
                ))}
                
                {hasMore && (
                  <div className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                window.location.href = '/notifications';
                setIsOpen(false);
              }}
            >
              View all notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;