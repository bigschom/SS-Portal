// src/hooks/useServiceNotifications.js
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import apiService from '../config/api-service';
import { formatNotification, showNotification } from '../utils/notificationUtils';
import { throttle } from '../utils/helpers';

/**
 * Smart notifications manager to prevent notification overload
 */
class NotificationManager {
  constructor(maxNotificationsPerMinute = 5) {
    this.recentNotifications = new Map(); // Maps tag to timestamp
    this.notificationCount = 0;
    this.resetTime = Date.now();
    this.maxNotificationsPerMinute = maxNotificationsPerMinute;
  }

  canShowNotification(tag) {
    const now = Date.now();
    
    // Reset counter if a minute has passed
    if (now - this.resetTime > 60000) {
      this.notificationCount = 0;
      this.resetTime = now;
    }
    
    // Check if we've exceeded our rate limit
    if (this.notificationCount >= this.maxNotificationsPerMinute) {
      return false;
    }
    
    // Don't show the same notification too frequently (once per 2 minutes)
    if (tag && this.recentNotifications.has(tag)) {
      const lastTime = this.recentNotifications.get(tag);
      if (now - lastTime < 120000) { // 2 minutes
        return false;
      }
    }
    
    return true;
  }
  
  trackNotification(tag) {
    this.recentNotifications.set(tag, Date.now());
    this.notificationCount++;
  }
  
  // Group similar notifications to reduce notification spam
  shouldGroupNotification(type, data) {
    // Count how many similar notifications we have recently shown
    let similarCount = 0;
    const now = Date.now();
    
    // Logic to identify "similar" notifications
    for (const [key, timestamp] of this.recentNotifications.entries()) {
      if (now - timestamp < 300000) { // Within last 5 minutes
        if (key.startsWith(type)) {
          similarCount++;
        }
      }
    }
    
    // If we've shown 3 or more similar notifications recently, suggest grouping
    return similarCount >= 3;
  }
  
  // Clean up old notifications to prevent memory leaks
  pruneOldNotifications() {
    const now = Date.now();
    const expiryTime = 3600000; // 1 hour
    
    for (const [tag, timestamp] of this.recentNotifications.entries()) {
      if (now - timestamp > expiryTime) {
        this.recentNotifications.delete(tag);
      }
    }
  }
}

/**
 * Hook to handle service-specific notifications
 * Sets up polling for new notifications related to service requests
 * Implements smart notification management to avoid overwhelming the user
 */
export const useServiceNotifications = (pollingInterval = 120000) => { // Increased from 60000 to 120000
  const { user } = useAuth();
  const lastNotificationTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const checkThrottleMs = 15000; // 15 seconds minimum between checks (increased from 10s)
  const checkInProgressRef = useRef(false);
  const notificationManagerRef = useRef(new NotificationManager());
  const abortControllerRef = useRef(null);
  
  // Helper function to check notification permission
  const checkNotificationPermission = useCallback(async () => {
    // Skip if not supported
    if (!('Notification' in window)) {
      return false;
    }
    
    // Return true if already granted
    if (Notification.permission === 'granted') {
      return true;
    }
    
    // Request permission if not determined yet
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }, []);
  
  // Helper to safely display notification with rate limiting
  const safelyShowNotification = useCallback((title, options = {}) => {
    const manager = notificationManagerRef.current;
    
    // First prune old notifications to prevent memory leaks
    manager.pruneOldNotifications();
    
    // Check if this notification should be displayed
    if (manager.canShowNotification(options.tag)) {
      // Group similar notifications if needed
      if (manager.shouldGroupNotification(options.tag?.split('-')[0] || 'unknown', options)) {
        // Replace with a grouped notification
        const groupTag = `group-${options.tag?.split('-')[0] || 'multiple'}-${Date.now()}`;
        showNotification('Multiple Notifications', {
          body: `You have multiple recent notifications. Check the app for details.`,
          tag: groupTag,
          requireInteraction: false
        });
        manager.trackNotification(groupTag);
      } else {
        // Show the original notification
        showNotification(title, options);
        manager.trackNotification(options.tag);
      }
      return true;
    }
    
    return false;
  }, []);
  
  // Optimized function to check for notifications
  const checkForNotifications = useCallback(async (force = false) => {
    // Skip checks if not appropriate
    if (!user) return;
    if (checkInProgressRef.current && !force) return;
    
    // Apply throttling unless forced
    const now = Date.now();
    if (!force && now - lastNotificationTimeRef.current < checkThrottleMs) {
      return;
    }
    
    // Update tracking
    lastNotificationTimeRef.current = now;
    checkInProgressRef.current = true;
    
    // Cancel any existing check
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    try {
      // First check if notifications are allowed in browser
      const notificationsAllowed = await checkNotificationPermission();
      if (!notificationsAllowed) {
        return;
      }
      
      // Then check if the user has enabled notifications in their settings
      if (!apiService?.notifications?.getUserNotificationSettings) {
        console.warn('Notification settings API not available');
        return;
      }
      
      const settings = await apiService.notifications.getUserNotificationSettings(user.id);
      if (!settings.browserEnabled) {
        return;
      }
      
      // Check for required API methods
      if (!apiService?.tasks?.getNewRequestsSince || !apiService?.tasks?.getStatusChangesSince) {
        console.warn('Required task API methods not available');
        return;
      }
      
      // Use Promise.all to fetch notifications in parallel
      const [newRequests, statusChanges] = await Promise.all([
        // Get new requests
        apiService.tasks.getNewRequestsSince(lastNotificationTimeRef.current, user.id),
        
        // Get status changes
        apiService.tasks.getStatusChangesSince(lastNotificationTimeRef.current, user.id)
      ]);
      
      // Process new requests (limited to most recent 3)
      if (newRequests && newRequests.length > 0) {
        const recentRequests = newRequests.slice(0, 3);
        
        // Check if we have too many new requests
        if (newRequests.length > 3) {
          // Show a single grouped notification instead
          safelyShowNotification('Multiple New Requests', {
            body: `You have ${newRequests.length} new service requests waiting for your attention.`,
            tag: `multiple-new-requests-${Date.now()}`,
            requireInteraction: false,
            onClick: () => {
              window.location.href = '/security-services/tasks';
            }
          });
        } else {
          // Show individual notifications for each request
          for (const request of recentRequests) {
            const notificationData = formatNotification('newRequest', {
              referenceNumber: request.reference_number,
              serviceType: request.service_type.replace(/_/g, ' '),
              customerName: request.full_names
            });
            
            safelyShowNotification(notificationData.title, {
              body: notificationData.body,
              tag: `new-request-${request.id}-${Date.now()}`,
              requireInteraction: notificationData.requireInteraction,
              onClick: () => {
                window.location.href = `/security-services/tasks?ref=${request.reference_number}`;
              }
            });
          }
        }
      }
      
      // Process status changes (limited to most recent 3)
      if (statusChanges && statusChanges.length > 0) {
        const recentChanges = statusChanges.slice(0, 3);
        
        // Check if we have too many status changes
        if (statusChanges.length > 3) {
          // Show a single grouped notification
          safelyShowNotification('Multiple Status Updates', {
            body: `${statusChanges.length} of your requests have status updates.`,
            tag: `multiple-status-changes-${Date.now()}`,
            onClick: () => {
              window.location.href = '/security-services/tasks';
            }
          });
        } else {
          // Show individual notifications for each status change
          for (const change of recentChanges) {
            const notificationData = formatNotification('statusChange', {
              referenceNumber: change.reference_number,
              status: change.status.replace(/_/g, ' ')
            });
            
            safelyShowNotification(notificationData.title, {
              body: notificationData.body,
              tag: `status-change-${change.id}-${Date.now()}`
            });
          }
        }
      }
    } catch (error) {
      // Only log if not aborted
      if (error.name !== 'AbortError') {
        console.error('Error checking for notifications:', error);
      }
    } finally {
      // Reset state if this is still the current check
      if (abortControllerRef.current?.signal === signal || signal.aborted) {
        checkInProgressRef.current = false;
        
        if (signal.aborted) {
          abortControllerRef.current = null;
        }
      }
    }
  }, [user, checkNotificationPermission, safelyShowNotification]);
  
  // Create throttled version to use in event handlers
  const throttledCheck = useCallback(
    throttle((force = false) => checkForNotifications(force), 5000),
    [checkForNotifications]
  );
  
  useEffect(() => {
    // Skip if user is not logged in
    if (!user) return;
    
    // Initial check (with a small delay to avoid startup congestion)
    const initialCheckTimeout = setTimeout(() => throttledCheck(true), 10000);
    
    // Set up polling interval
    timerRef.current = setInterval(() => {
      // Only check when tab is visible and not already checking
      if (document.visibilityState === 'visible' && !checkInProgressRef.current) {
        throttledCheck();
      }
    }, pollingInterval);
    
    // Also check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Wait a short time after becoming visible before checking
        setTimeout(() => throttledCheck(true), 3000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up on unmount
    return () => {
      clearTimeout(initialCheckTimeout);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [user, throttledCheck, pollingInterval]);
  
  return null; // This hook doesn't return anything
};