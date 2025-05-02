// server/controllers/activity-log-controller.js
import { query } from '../db.js';

/**
 * Log an activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const logActivity = async (req, res) => {
  const { userId, description, type, recordId } = req.body;
  
  try {
    // Validate required fields
    if (!userId || !description || !type) {
      return res.status(400).json({ error: 'Missing required fields', success: false });
    }
    
    const result = await query(
      `INSERT INTO activity_log 
        (user_id, description, type, record_id, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [userId, description, type, recordId || null]
    );
    
    console.log('Activity logged:', { userId, type, description });
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error logging activity:', error);
    return res.status(500).json({ error: 'Server error', success: false });
  }
};

/**
 * Get activity log entries
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllActivityLogs = async (req, res) => {
  const { userId, type, limit = 100, offset = 0 } = req.query;
  
  try {
    let queryText = `
      SELECT a.*, u.username 
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCounter = 1;
    
    if (userId) {
      queryText += ` AND a.user_id = $${paramCounter}`;
      queryParams.push(userId);
      paramCounter++;
    }
    
    if (type) {
      queryText += ` AND a.type = $${paramCounter}`;
      queryParams.push(type);
      paramCounter++;
    }
    
    queryText += ` ORDER BY a.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const result = await query(queryText, queryParams);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};