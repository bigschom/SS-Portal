// src/hooks/useNotifications.js
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import apiService from '../config/api-service';
import { requestNotificationPermission } from '../utils/notificationUtils';

/**
 * Hook to manage browser notifications
 * Handles permission requests and notification preferences
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    browserEnabled: true,
    smsEnabled: false,
    emailEnabled: true
  });

  // Initialize notifications when the component mounts
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!user) return;

      try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
          console.log('This browser does not support notifications');
          return;
        }

        // Request permission
        const hasPermission = await requestNotificationPermission();
        setNotificationsEnabled(hasPermission);

        // Check if API method exists
        if (apiService?.notifications?.getUserNotificationSettings) {
          // Fetch user notification settings
          const settings = await apiService.notifications.getUserNotificationSettings(user.id);
          setNotificationSettings(settings);
        } else {
          console.warn('Notification settings API not available');
        }

        // Register service worker if permission is granted
        if (hasPermission && 'serviceWorker' in navigator) {
          try {
            // Only try to register in production or if the file exists
            if (process.env.NODE_ENV === 'production') {
              const registration = await navigator.serviceWorker.register('/service-worker.js');
              console.log('Service Worker registered successfully', registration);
            } else {
              console.log('Service Worker registration skipped in development');
            }
          } catch (error) {
            console.error('Service Worker registration failed:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, [user]);

  // Function to update notification settings
  const updateNotificationSettings = async (newSettings) => {
    if (!user) return false;

    try {
      if (apiService?.notifications?.updateNotificationSettings) {
        await apiService.notifications.updateNotificationSettings(user.id, newSettings);
        setNotificationSettings(newSettings);
        return true;
      } else {
        console.warn('Update notification settings API not available');
        return false;
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  };

  // Function to show a notification
  const showNotification = (title, options = {}) => {
    if (!notificationsEnabled || !notificationSettings.browserEnabled) return false;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/notification-badge.png',
        ...options,
        requireInteraction: options.requireInteraction || false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) options.onClick();
      };

      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  };

  return {
    notificationsEnabled,
    notificationSettings,
    updateNotificationSettings,
    showNotification
  };
};
