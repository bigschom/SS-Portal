/**
 * Utility functions for handling notifications
 */

// Show browser notification with auto-hide
export const showNotification = (title, message, tag) => {
  // Check if browser supports notifications
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }
  
  // If permission already granted, show notification
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      body: message,
      tag: tag,
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    return notification;
  } 
  // If not denied, request permission
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        showNotification(title, message, tag);
      }
    });
  }
};

// Notify about status change
export const notifyStatusChange = (request, newStatus) => {
  if (!request) return;
  
  const statusMessages = {
    new: `Request ${request.reference_number} is now available for assignment`,
    in_progress: `Request ${request.reference_number} is now in progress`,
    pending_investigation: `Request ${request.reference_number} is pending investigation`,
    completed: `Request ${request.reference_number} has been completed`,
    sent_back: `Request ${request.reference_number} has been sent back for corrections`,
    unable_to_handle: `Request ${request.reference_number} has been marked as unable to handle`
  };
  
  const message = statusMessages[newStatus] || `Request ${request.reference_number} status has changed`;
  
  showNotification('Status Changed', message, `status-${request.reference_number}-${newStatus}`);
};

// Request a persistent notification permission
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return { supported: false };
  }
  
  if (Notification.permission === "granted") {
    return { permission: "granted" };
  }
  
  try {
    const permission = await Notification.requestPermission();
    return { permission };
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return { permission: "denied", error };
  }
};
