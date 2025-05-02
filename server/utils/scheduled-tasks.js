// server/utils/scheduled-tasks.js
import { query } from '../db.js';

// Constants
const ACCOUNT_INACTIVE_DAYS = 30; // Mark account as inactive after 30 days

/**
 * Check for inactive accounts - accounts that haven't logged in for a certain period
 */
const checkInactiveAccounts = async () => {
  try {
    const inactiveDaysAgo = new Date();
    inactiveDaysAgo.setDate(inactiveDaysAgo.getDate() - ACCOUNT_INACTIVE_DAYS);
    
    // Get users who haven't logged in for 30+ days and are still active
    const result = await query(
      `UPDATE users 
       SET is_active = false, 
           updated_at = NOW(),
           updated_by = NULL
       WHERE (last_login IS NULL OR last_login < $1)
         AND is_active = true
       RETURNING id, username`,
      [inactiveDaysAgo.toISOString()]
    );
    
    if (result.rows.length > 0) {
      console.log(`Marked ${result.rows.length} accounts as inactive due to inactivity:`, 
        result.rows.map(user => user.username).join(', '));
    }
  } catch (error) {
    console.error('Error checking for inactive accounts:', error);
  }
};

/**
 * Set up all scheduled tasks for the server
 */
export const setupScheduledTasks = () => {
  console.log('Setting up scheduled tasks...');
  
  // Run inactive account check daily
  setInterval(checkInactiveAccounts, 24 * 60 * 60 * 1000);
  
  // Also run it once at startup
  checkInactiveAccounts();
  
  // Add other scheduled tasks here
  
  console.log('Scheduled tasks configured successfully');
};