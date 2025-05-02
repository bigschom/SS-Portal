// server/controllers/stakeholder-controller.js
import { query } from '../db.js';

/**
 * Get options for stakeholder requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getOptions = async (req, res) => {
  try {
    console.log('Fetching stakeholder request options');
    
    // Get all unique senders
    const sendersResult = await query(
      'SELECT DISTINCT sender FROM stakeholder_requests WHERE sender IS NOT NULL AND sender != \'\' ORDER BY sender'
    );
    
    // Get all unique subjects
    const subjectsResult = await query(
      'SELECT DISTINCT subject FROM stakeholder_requests WHERE subject IS NOT NULL AND subject != \'\' ORDER BY subject'
    );
    
    return res.json({
      senders: sendersResult.rows.map(row => row.sender),
      subjects: subjectsResult.rows.map(row => row.subject)
    });
  } catch (error) {
    console.error('Error fetching stakeholder request options:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get all stakeholder requests with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllRequests = async (req, res) => {
  try {
    const { 
      sender, 
      subject, 
      status, 
      answeredBy, 
      startDate, 
      endDate, 
      search
    } = req.query;
    
    let queryText = `
      SELECT 
        id, reference_number, sender, subject, status,
        TO_CHAR(date_received, 'YYYY-MM-DD') as date_received,
        TO_CHAR(response_date, 'YYYY-MM-DD') as response_date,
        answered_by, created_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM stakeholder_requests WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Add filters
    if (sender && sender !== 'all') {
      queryText += ` AND sender = $${paramIndex}`;
      params.push(sender);
      paramIndex++;
    }
    
    if (subject && subject !== 'all') {
      queryText += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }
    
    if (status && status !== 'all') {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (answeredBy && answeredBy !== 'all') {
      queryText += ` AND answered_by = $${paramIndex}`;
      params.push(answeredBy);
      paramIndex++;
    }
    
    if (startDate) {
      queryText += ` AND date_received >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      queryText += ` AND date_received <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (search) {
      queryText += ` AND (
        reference_number ILIKE $${paramIndex} OR
        sender ILIKE $${paramIndex} OR
        subject ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    queryText += ' ORDER BY date_received DESC';
    
    const result = await query(queryText, params);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stakeholder requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Create a new stakeholder request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createRequest = async (req, res) => {
  try {
    const {
      reference_number,
      date_received,
      sender,
      subject,
      status,
      response_date,
      answered_by,
      created_by,
      created_at,
      updated_at
    } = req.body;
    
    // Process and validate date fields
    const processDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error processing date:', error);
        return null;
      }
    };
    
    const result = await query(
      `INSERT INTO stakeholder_requests (
        reference_number, date_received, sender, subject, status,
        response_date, answered_by, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        reference_number,
        processDate(date_received),
        sender,
        subject,
        status || 'Pending',
        processDate(response_date),
        answered_by,
        created_by || req.user.username,
        created_at || new Date().toISOString(),
        updated_at || new Date().toISOString()
      ]
    );
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating stakeholder request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update a stakeholder request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Prepare SQL parameters
    const keys = Object.keys(updateData).filter(key => 
      ['reference_number', 'date_received', 'sender', 'subject', 'status', 
       'response_date', 'answered_by', 'updated_by', 'updated_at'].includes(key)
    );
    
    const values = keys.map(key => updateData[key]);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    
    const queryText = `
      UPDATE stakeholder_requests 
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await query(queryText, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating stakeholder request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Delete a stakeholder request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteRequest = async (req, res) => {
  const { id } = req.params;
  const { deleted_by } = req.query;
  
  console.log('Deleting stakeholder request with ID:', id, 'by user:', deleted_by);
  
  try {
    // Start a transaction
    await query('BEGIN');
    
    // Get request details before deleting (for logging)
    const checkResult = await query(
      'SELECT reference_number, sender, subject FROM stakeholder_requests WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Stakeholder request not found' });
    }
    
    const requestDetails = checkResult.rows[0];
    
    // Delete the request
    const result = await query(
      'DELETE FROM stakeholder_requests WHERE id = $1 RETURNING id',
      [id]
    );
    
    // Log the activity
    await query(
      `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        deleted_by || req.user.username,
        `Deleted stakeholder request: ${requestDetails.reference_number} from ${requestDetails.sender} about ${requestDetails.subject}`,
        'delete',
        id
      ]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ 
      success: true, 
      message: 'Stakeholder request deleted successfully',
      id: id 
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error deleting stakeholder request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Delete multiple stakeholder requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteMultiple = async (req, res) => {
  const { ids, deleted_by } = req.body;
  
  console.log('Deleting multiple stakeholder requests:', ids, 'by user:', deleted_by);
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No valid IDs provided for deletion' });
  }
  
  try {
    // Start a transaction
    await query('BEGIN');
    
    // Get request details before deleting (for logging)
    const checkResult = await query(
      'SELECT id, reference_number, sender, subject FROM stakeholder_requests WHERE id = ANY($1)',
      [ids]
    );
    
    if (checkResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'No matching stakeholder requests found' });
    }
    
    // Delete the requests
    const result = await query(
      'DELETE FROM stakeholder_requests WHERE id = ANY($1) RETURNING id',
      [ids]
    );
    
    // Log the activity for each deleted request
    for (const request of checkResult.rows) {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          deleted_by || req.user.username,
          `Deleted stakeholder request: ${request.reference_number} from ${request.sender} about ${request.subject}`,
          'delete',
          request.id
        ]
      );
    }
    
    // Log a batch delete activity
    await query(
      `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        deleted_by || req.user.username,
        `Batch deleted ${result.rows.length} stakeholder requests`,
        'batch_delete',
        null
      ]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ 
      success: true, 
      message: `${result.rows.length} stakeholder requests deleted successfully`,
      count: result.rows.length,
      ids: result.rows.map(row => row.id)
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error deleting multiple stakeholder requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};