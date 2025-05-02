// server/controllers/task-controller.js
import { query } from '../db.js';

/**
 * Get available requests for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAvailableRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('Fetching available requests for user ID:', userId);
    
    // Get requests that are new and not assigned to anyone
    const result = await query(
      `SELECT sr.*, 
        COALESCE(
          jsonb_agg(DISTINCT rc) FILTER (WHERE rc.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_comments,
        COALESCE(
          jsonb_agg(DISTINCT rh) FILTER (WHERE rh.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_history,
        json_build_object('id', created_by.id, 'fullname', created_by.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assigned_to.id, 'fullname', assigned_to.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users created_by ON sr.created_by = created_by.id
      LEFT JOIN users assigned_to ON sr.assigned_to = assigned_to.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.status = 'new' AND sr.assigned_to IS NULL
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.created_at DESC`,
      []
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get assigned requests for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAssignedRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    console.log('Fetching assigned requests for user ID:', userId, 'Status filter:', status);
    
    let query_text = `
      SELECT sr.*, 
        COALESCE(
          jsonb_agg(DISTINCT rc) FILTER (WHERE rc.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_comments,
        COALESCE(
          jsonb_agg(DISTINCT rh) FILTER (WHERE rh.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_history,
        json_build_object('id', created_by.id, 'fullname', created_by.full_name) AS created_by,
        json_build_object('id', assigned_to.id, 'fullname', assigned_to.full_name) AS assigned_to
      FROM service_requests sr
      LEFT JOIN users created_by ON sr.created_by = created_by.id
      LEFT JOIN users assigned_to ON sr.assigned_to = assigned_to.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.assigned_to = $1
    `;
    
    const queryParams = [userId];
    
    // Add status filter if provided
    if (status) {
      query_text += ` AND sr.status = $2`;
      queryParams.push(status);
    }
    
    query_text += `
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.updated_at DESC
    `;
    
    const result = await query(query_text, queryParams);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assigned requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get submitted requests for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSubmittedRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching submitted requests for user ID:', userId);
    
    const result = await query(
      `SELECT sr.*, 
        COALESCE(
          jsonb_agg(DISTINCT rc) FILTER (WHERE rc.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_comments,
        COALESCE(
          jsonb_agg(DISTINCT rh) FILTER (WHERE rh.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_history,
        json_build_object('id', created_by.id, 'fullname', created_by.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assigned_to.id, 'fullname', assigned_to.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users created_by ON sr.created_by = created_by.id
      LEFT JOIN users assigned_to ON sr.assigned_to = assigned_to.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.created_by = $1 AND sr.status != 'sent_back'
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.created_at DESC`,
      [userId]
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching submitted requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get sent back requests for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSentBackRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching sent back requests for user ID:', userId);
    
    const result = await query(
      `SELECT sr.*, 
        COALESCE(
          jsonb_agg(DISTINCT rc) FILTER (WHERE rc.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_comments,
        COALESCE(
          jsonb_agg(DISTINCT rh) FILTER (WHERE rh.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_history,
        json_build_object('id', created_by.id, 'fullname', created_by.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assigned_to.id, 'fullname', assigned_to.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users created_by ON sr.created_by = created_by.id
      LEFT JOIN users assigned_to ON sr.assigned_to = assigned_to.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.created_by = $1 AND sr.status = 'sent_back'
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.updated_at DESC`,
      [userId]
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sent back requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get new requests since a timestamp
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNewRequestsSince = async (req, res) => {
  try {
    const { timestamp } = req.params;
    const { userId } = req.query;
    
    console.log('Fetching new requests since:', timestamp, 'for user ID:', userId);
    
    const result = await query(
      `SELECT sr.* 
      FROM service_requests sr
      WHERE sr.created_at > to_timestamp($1) 
      AND sr.status = 'new' 
      AND sr.assigned_to IS NULL
      ORDER BY sr.created_at DESC`,
      [timestamp / 1000] // Convert milliseconds to seconds for PostgreSQL timestamp
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching new requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get status changes since a timestamp
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getStatusChangesSince = async (req, res) => {
  try {
    const { timestamp } = req.params;
    const { userId } = req.query;
    
    console.log('Fetching status changes since:', timestamp, 'for user ID:', userId);
    
    const result = await query(
      `SELECT sr.id, sr.reference_number, sr.status, rh.created_at
      FROM request_history rh
      JOIN service_requests sr ON rh.request_id = sr.id
      WHERE rh.created_at > to_timestamp($1)
      AND rh.action = 'status_change'
      AND (sr.created_by = $2 OR sr.assigned_to = $2)
      ORDER BY rh.created_at DESC`,
      [timestamp / 1000, userId] // Convert milliseconds to seconds for PostgreSQL timestamp
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching status changes:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Claim a request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const claimRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;
    
    console.log('Claiming request ID:', requestId, 'for user ID:', userId);
    
    // Start a transaction
    await query('BEGIN');
    
    // Update the request
    const updateResult = await query(
      `UPDATE service_requests 
      SET assigned_to = $1, 
          status = 'in_progress', 
          updated_at = NOW() 
      WHERE id = $2
      RETURNING *`,
      [userId, requestId]
    );
    
    if (updateResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Get user details for the history entry
    const userResult = await query(
      'SELECT id, full_name FROM users WHERE id = $1',
      [userId]
    );
    
    const userName = userResult.rows[0]?.full_name || 'Unknown';
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'status_change', $3, NOW())`,
      [requestId, userId, `Request claimed and status changed to in progress by ${userName}`]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ success: true, request: updateResult.rows[0] });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error claiming request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update request status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, userId, details, assigned_to } = req.body;
    
    console.log('Updating request ID:', requestId, 'to status:', status);
    
    // Start a transaction
    await query('BEGIN');
    
    // Build the update query based on whether assigned_to is provided
    let updateQuery = `
      UPDATE service_requests 
      SET status = $1, 
          updated_at = NOW()
    `;
    
    const queryParams = [status, requestId];
    
    // Add assigned_to to update if provided
    if (assigned_to !== undefined) {
      updateQuery += `, assigned_to = $3`;
      queryParams.push(assigned_to);
    }
    
    updateQuery += ` WHERE id = $2 RETURNING *`;
    
    const updateResult = await query(updateQuery, queryParams);
    
    if (updateResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'status_change', $3, NOW())`,
      [requestId, userId, details || `Status changed to ${status}`]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ success: true, request: updateResult.rows[0] });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error updating request status:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Add a comment to a request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addComment = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId, comment, isSendBackReason } = req.body;
    
    console.log('Adding comment to request ID:', requestId);
    
    // Insert the comment
    const insertResult = await query(
      `INSERT INTO request_comments (request_id, created_by, comment, is_send_back_reason, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [requestId, userId, comment, isSendBackReason || false]
    );
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'comment_added', $3, NOW())`,
      [requestId, userId, isSendBackReason ? 'Send back reason added' : 'Comment added']
    );
    
    return res.json({ success: true, comment: insertResult.rows[0] });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update request data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateRequestData = async (req, res) => {
  try {
    const { requestId } = req.params;
    const updateData = req.body;
    
    console.log('Updating data for request ID:', requestId);
    
    // Start a transaction
    await query('BEGIN');
    
    // Build the update query dynamically based on the provided fields
    const allowedFields = [
      'full_names', 'primary_contact', 'secondary_contact', 
      'details', 'status', 'assigned_to', 'priority'
    ];
    
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;
    
    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);
    
    // Add other fields from the request body
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
    }
    
    // Add request ID as the last parameter
    queryParams.push(requestId);
    
    // Execute the update if there are fields to update
    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE service_requests 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const updateResult = await query(updateQuery, queryParams);
      
      if (updateResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Add to history
      await query(
        `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
        VALUES ($1, $2, 'edited', 'Request data updated', NOW())`,
        [requestId, updateData.updated_by || null]
      );
      
      // Commit the transaction
      await query('COMMIT');
      
      return res.json({ success: true, request: updateResult.rows[0] });
    } else {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'No valid fields to update' });
    }
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error updating request data:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get service details for a request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {String} serviceType - The type of service details to fetch
 */
export const getServiceDetails = async (req, res, serviceType) => {
  try {
    const { requestId } = req.params;
    
    console.log(`Fetching ${serviceType} details for request ID:`, requestId);
    
    let tableName, fields;
    
    // Determine the table and fields based on service type
    switch (serviceType) {
      case 'call_history':
        tableName = 'call_history_requests';
        fields = '*';
        break;
      case 'momo_transaction':
        tableName = 'momo_transaction_requests';
        fields = '*';
        break;
      case 'money_refund':
        tableName = 'money_refund_requests';
        fields = '*';
        break;
      case 'serial_number':
        tableName = 'serial_number_requests';
        fields = '*';
        break;
      case 'stolen_phone':
        tableName = 'stolen_phone_requests';
        fields = '*';
        break;
      case 'unblock_call':
        tableName = 'unblock_call_requests';
        fields = '*';
        break;
      case 'unblock_momo':
        tableName = 'unblock_momo_requests';
        fields = '*';
        break;
      case 'backoffice_appointment':
        tableName = 'backoffice_appointments';
        fields = 'ba.*, json_build_object(\'id\', u.id, \'fullname\', u.full_name) AS backoffice_user';
        break;
      default:
        return res.status(400).json({ error: 'Invalid service type' });
    }
    
    // Build the query based on service type
    let queryText;
    
    if (serviceType === 'backoffice_appointment') {
      queryText = `
        SELECT ${fields}
        FROM ${tableName} ba
        JOIN users u ON ba.backoffice_user_id = u.id
        WHERE ba.service_request_id = $1
      `;
    } else {
      queryText = `
        SELECT ${fields}
        FROM ${tableName}
        WHERE service_request_id = $1
      `;
    }
    
    const result = await query(queryText, [requestId]);
    
    // Return the result based on service type
    if (serviceType === 'backoffice_appointment') {
      return res.json(result.rows.length > 0 ? result.rows[0] : null);
    } else {
      return res.json(result.rows);
    }
  } catch (error) {
    console.error(`Error fetching ${serviceType} details:`, error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};