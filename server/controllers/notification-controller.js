// server/controllers/notification-controller.js
import { query } from '../db.js';

/**
 * Get notification settings for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserNotificationSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching notification settings for user ID:', userId);
    
    // Check if settings exist for this user
    const result = await query(
      'SELECT browser_enabled, sms_enabled, email_enabled FROM notification_settings WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create default settings if none exist
      const defaultSettings = {
        browserEnabled: true,
        smsEnabled: false,
        emailEnabled: true
      };
      
      await query(
        `INSERT INTO notification_settings (user_id, browser_enabled, sms_enabled, email_enabled)
         VALUES ($1, $2, $3, $4)`,
        [userId, defaultSettings.browserEnabled, defaultSettings.smsEnabled, defaultSettings.emailEnabled]
      );
      
      return res.json(defaultSettings);
    }
    
    // Return existing settings
    const settings = result.rows[0];
    return res.json({
      browserEnabled: settings.browser_enabled,
      smsEnabled: settings.sms_enabled,
      emailEnabled: settings.email_enabled
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update notification settings for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateNotificationSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { browserEnabled, smsEnabled, emailEnabled } = req.body;
    
    console.log('Updating notification settings for user ID:', userId);
    
    // Update or insert settings (upsert)
    await query(
      `INSERT INTO notification_settings (user_id, browser_enabled, sms_enabled, email_enabled, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         browser_enabled = $2,
         sms_enabled = $3,
         email_enabled = $4,
         updated_at = NOW()`,
      [userId, browserEnabled, smsEnabled, emailEnabled]
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get notifications for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const offset = (page - 1) * pageSize;
    
    // Filter parameters
    const isRead = req.query.isRead; // undefined, 'true', or 'false'
    const relatedTo = req.query.relatedTo; // undefined or specific type
    
    // Build query conditions
    let conditions = ['user_id = $1'];
    let params = [userId];
    let paramCounter = 2;
    
    if (isRead === 'true') {
      conditions.push(`is_read = true`);
    } else if (isRead === 'false') {
      conditions.push(`is_read = false`);
    }
    
    if (relatedTo) {
      conditions.push(`related_to = $${paramCounter}`);
      params.push(relatedTo);
      paramCounter++;
    }
    
    // Construct WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      params
    );
    
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Get paginated notifications
    const notificationsResult = await query(
      `SELECT * FROM notifications 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
      [...params, pageSize, offset]
    );
    
    return res.json({
      items: notificationsResult.rows,
      page,
      pageSize,
      totalItems,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get unread notification count
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const countResult = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    
    const count = parseInt(countResult.rows[0].count, 10);
    
    return res.json({ count });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Mark a notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify the notification belongs to the user
    const checkResult = await query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Mark as read
    await query(
      'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Mark all notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await query(
      'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Delete a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify the notification belongs to the user
    const checkResult = await query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Delete the notification
    await query(
      'DELETE FROM notifications WHERE id = $1',
      [id]
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Register a desktop device for notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const registerDesktopDevice = async (req, res) => {
  try {
    const { deviceToken, deviceName } = req.body;
    const userId = req.user.id;
    
    if (!deviceToken) {
      return res.status(400).json({ error: 'Device token is required' });
    }
    
    // Check if device already exists
    const checkResult = await query(
      'SELECT id FROM notification_desktop_devices WHERE user_id = $1 AND device_token = $2',
      [userId, deviceToken]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing device
      await query(
        'UPDATE notification_desktop_devices SET device_name = $1, last_active = NOW(), updated_at = NOW() WHERE user_id = $2 AND device_token = $3',
        [deviceName || null, userId, deviceToken]
      );
    } else {
      // Register new device
      await query(
        'INSERT INTO notification_desktop_devices (user_id, device_token, device_name, last_active) VALUES ($1, $2, $3, NOW())',
        [userId, deviceToken, deviceName || null]
      );
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error registering desktop device:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Unregister a desktop device
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const unregisterDesktopDevice = async (req, res) => {
  try {
    const { deviceToken } = req.params;
    const userId = req.user.id;
    
    await query(
      'DELETE FROM notification_desktop_devices WHERE user_id = $1 AND device_token = $2',
      [userId, deviceToken]
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error unregistering desktop device:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all notification types
    const typesResult = await query(
      'SELECT * FROM notification_types ORDER BY name'
    );
    
    // Get user preferences
    const preferencesResult = await query(
      `SELECT unp.notification_type_id, unp.browser_enabled, unp.email_enabled, unp.desktop_enabled
       FROM user_notification_preferences unp
       WHERE unp.user_id = $1`,
      [userId]
    );
    
    // Map preferences to types
    const preferences = typesResult.rows.map(type => {
      const userPref = preferencesResult.rows.find(p => p.notification_type_id === type.id);
      
      return {
        id: type.id,
        name: type.name,
        description: type.description,
        browserEnabled: userPref ? userPref.browser_enabled : type.default_enabled,
        emailEnabled: userPref ? userPref.email_enabled : false,
        desktopEnabled: userPref ? userPref.desktop_enabled : type.default_enabled
      };
    });
    
    return res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUserNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;
    
    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: 'Preferences must be an array' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    for (const pref of preferences) {
      const { id, browserEnabled, emailEnabled, desktopEnabled } = pref;
      
      if (!id) continue;
      
      // Check if preference already exists
      const checkResult = await query(
        'SELECT id FROM user_notification_preferences WHERE user_id = $1 AND notification_type_id = $2',
        [userId, id]
      );
      
      if (checkResult.rows.length > 0) {
        // Update existing preference
        await query(
          `UPDATE user_notification_preferences 
           SET browser_enabled = $1, email_enabled = $2, desktop_enabled = $3, updated_at = NOW()
           WHERE user_id = $4 AND notification_type_id = $5`,
          [
            browserEnabled !== undefined ? browserEnabled : true,
            emailEnabled !== undefined ? emailEnabled : false,
            desktopEnabled !== undefined ? desktopEnabled : true,
            userId,
            id
          ]
        );
      } else {
        // Insert new preference
        await query(
          `INSERT INTO user_notification_preferences 
           (user_id, notification_type_id, browser_enabled, email_enabled, desktop_enabled)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            id,
            browserEnabled !== undefined ? browserEnabled : true,
            emailEnabled !== undefined ? emailEnabled : false,
            desktopEnabled !== undefined ? desktopEnabled : true
          ]
        );
      }
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ success: true });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Create a notification for a user
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} relatedTo - The type of entity this notification relates to
 * @param {number} relatedId - The ID of the related entity
 * @param {string} icon - Icon name from Lucide icons
 * @param {string} color - Color theme for the notification
 * @param {string} link - URL to navigate to when clicking the notification
 * @returns {Promise<number>} Notification ID
 */
export const createNotification = async (userId, title, message, relatedTo, relatedId, icon, color, link) => {
  try {
    const result = await query(
      `INSERT INTO notifications 
       (user_id, title, message, related_to, related_id, icon, color, link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        title,
        message,
        relatedTo,
        relatedId,
        icon || null,
        color || 'blue',
        link || null
      ]
    );
    
    // Trigger desktop notification if user has enabled it
    await triggerDesktopNotification(userId, title, message);
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Trigger desktop notification
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
const triggerDesktopNotification = async (userId, title, message) => {
  try {
    // Check if user has desktop notifications enabled for this type
    const userDevices = await query(
      'SELECT device_token FROM notification_desktop_devices WHERE user_id = $1 AND last_active > NOW() - INTERVAL \'30 days\'',
      [userId]
    );
    
    if (userDevices.rows.length === 0) {
      return;
    }
    
    // In a real-world scenario, you would send notifications to each device
    // This could be through a service like Firebase Cloud Messaging, WebPush, or a custom solution
    console.log(`Sending desktop notification to user ${userId}:`, {
      title,
      message,
      devices: userDevices.rows.map(d => d.device_token)
    });
    
    // Example implementation for WebPush notifications would go here
    // You would iterate through devices and send notifications using WebPush library
    
  } catch (error) {
    console.error('Error sending desktop notification:', error);
    // Don't throw, just log the error to prevent blocking the main flow
  }
};