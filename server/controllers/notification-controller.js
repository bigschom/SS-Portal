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