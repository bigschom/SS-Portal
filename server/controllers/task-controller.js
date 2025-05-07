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
    const { userId, comment, isSystem = false, isResponse = false, isSendBackReason = false, isBackofficeComment = false } = req.body;
    
    console.log('Adding comment to request ID:', requestId);
    
    // Insert the comment
    const insertResult = await query(
      `INSERT INTO request_comments (
        request_id, created_by, comment, 
        is_system, is_response, is_send_back_reason, is_backoffice_comment, 
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        requestId, 
        userId, 
        comment, 
        isSystem, 
        isResponse, 
        isSendBackReason,
        isBackofficeComment
      ]
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
    
    let tableName, fields, idColumn;
    
    // Determine the table and fields based on service type
    switch (serviceType) {
      case 'call-history':
        tableName = 'call_history_requests';
        fields = '*';
        idColumn = 'service_request_id'; // Default column name
        break;
      case 'momo-transaction':
        tableName = 'momo_transaction_requests';
        fields = '*';
        idColumn = 'service_request_id';
        break;
      case 'money-refund':
        tableName = 'money_refund_requests';
        fields = '*';
        idColumn = 'service_request_id';
        break;
      case 'serial-number':
        tableName = 'serial_number_requests';
        fields = '*';
        idColumn = 'service_request_id';
        break;
      case 'stolen-phone':
        tableName = 'stolen_phone_requests';
        fields = '*';
        idColumn = 'service_request_id';
        break;
      case 'unblock-call':
        tableName = 'unblock_call_requests';
        fields = '*';
        idColumn = 'service_request_id';
        break;
      case 'unblock-momo':
        tableName = 'unblock_momo_requests';
        fields = '*';
        idColumn = 'service_request_id';
        break;
      case 'backoffice-appointment':
        tableName = 'backoffice_appointments';
        fields = 'ba.*, json_build_object(\'id\', u.id, \'fullname\', u.full_name) AS backoffice_user';
        idColumn = 'service_request_id';
        break;
      default:
        return res.status(400).json({ error: 'Invalid service type' });
    }
    
    // First, check if the table exists and get its column names
    const tableCheck = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1`,
      [tableName]
    );
    
    // If table doesn't exist, return empty array
    if (tableCheck.rows.length === 0) {
      console.log(`Table ${tableName} does not exist`);
      return res.json([]);
    }
    
    // Check if service_request_id or request_id column exists
    const columns = tableCheck.rows.map(row => row.column_name);
    
    if (columns.includes('service_request_id')) {
      idColumn = 'service_request_id';
    } else if (columns.includes('request_id')) {
      idColumn = 'request_id';
    } else {
      console.error(`Neither service_request_id nor request_id column found in ${tableName}`);
      return res.status(500).json({ error: `Table structure issue in ${tableName}` });
    }
    
    // Build the query based on service type
    let queryText;
    
    if (serviceType === 'backoffice-appointment') {
      queryText = `
        SELECT ${fields}
        FROM ${tableName} ba
        JOIN users u ON ba.backoffice_user_id = u.id
        WHERE ba.${idColumn} = $1
      `;
    } else {
      queryText = `
        SELECT ${fields}
        FROM ${tableName}
        WHERE ${idColumn} = $1
      `;
    }
    
    const result = await query(queryText, [requestId]);
    
    // Return the result based on service type
    if (serviceType === 'backoffice-appointment') {
      return res.json(result.rows.length > 0 ? result.rows[0] : null);
    } else {
      return res.json(result.rows);
    }
  } catch (error) {
    console.error(`Error fetching ${serviceType} details:`, error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};



// server/controllers/task-controller.js - ADDITIONS
// These methods should be added to your existing task-controller.js file

/**
 * Get unhandled requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUnhandledRequests = async (req, res) => {
  try {
    console.log('Fetching unhandled requests');
    
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
      WHERE sr.status = 'unable_to_handle'
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.updated_at DESC`,
      []
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching unhandled requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Auto-return a request after timeout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const autoReturnRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    console.log('Auto-returning request ID:', requestId);
    
    // Start a transaction
    await query('BEGIN');
    
    // Get the current request data
    const requestResult = await query(
      `SELECT * FROM service_requests WHERE id = $1`,
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const request = requestResult.rows[0];
    const previousStatus = request.status;
    
    // Update the request to return it to the queue
    const updateResult = await query(
      `UPDATE service_requests 
      SET status = 'new', 
          assigned_to = NULL, 
          updated_at = NOW() 
      WHERE id = $1
      RETURNING *`,
      [requestId]
    );
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, NULL, 'auto_returned', $2, NOW())`,
      [requestId, `Request automatically returned to queue due to inactivity`]
    );
    
    // Add system comment
    await query(
      `INSERT INTO request_comments (request_id, created_by, comment, is_system, created_at)
      VALUES ($1, NULL, $2, TRUE, NOW())`,
      [requestId, 'Request automatically returned to queue due to inactivity']
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ success: true, request: updateResult.rows[0] });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error auto-returning request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get comments for a request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */


export const getRequestComments = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id || null;
    
    console.log('Fetching comments for request ID:', requestId);
    
    const result = await query(
      `SELECT rc.*,
        json_build_object('id', u.id, 'fullname', u.full_name) AS created_by,
        COALESCE(
          (SELECT COUNT(*) FROM comment_reactions WHERE comment_id = rc.id AND reaction_type = 'like'),
          0
        ) AS likes,
        COALESCE(
          (SELECT COUNT(*) FROM comment_reactions WHERE comment_id = rc.id AND reaction_type = 'dislike'),
          0
        ) AS dislikes,
        (SELECT reaction_type FROM comment_reactions WHERE comment_id = rc.id AND user_id = $2 LIMIT 1) AS user_reaction
      FROM request_comments rc
      LEFT JOIN users u ON rc.created_by = u.id
      WHERE rc.request_id = $1
      ORDER BY rc.created_at ASC`,
      [requestId, userId]
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching request comments:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};


/**
 * Handle comment reaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const handleCommentReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, reactionType } = req.body;
    
    console.log('Handling reaction for comment ID:', commentId, 'User ID:', userId, 'Type:', reactionType);
    
    // Check if user already has a reaction
    const existingReaction = await query(
      `SELECT * FROM comment_reactions WHERE comment_id = $1 AND user_id = $2`,
      [commentId, userId]
    );
    
    if (existingReaction.rows.length > 0) {
      // Update existing reaction
      if (existingReaction.rows[0].reaction_type === reactionType) {
        // Remove reaction if clicking the same type
        await query(
          `DELETE FROM comment_reactions WHERE comment_id = $1 AND user_id = $2`,
          [commentId, userId]
        );
      } else {
        // Change reaction type
        await query(
          `UPDATE comment_reactions SET reaction_type = $3, updated_at = NOW() WHERE comment_id = $1 AND user_id = $2`,
          [commentId, userId, reactionType]
        );
      }
    } else {
      // Add new reaction
      await query(
        `INSERT INTO comment_reactions (comment_id, user_id, reaction_type, created_at)
        VALUES ($1, $2, $3, NOW())`,
        [commentId, userId, reactionType]
      );
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error handling comment reaction:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update service-specific data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateServiceSpecificData = async (req, res) => {
  try {
    const { requestId, serviceType } = req.params;
    const { data } = req.body;
    
    console.log('Updating service data for request ID:', requestId, 'Service type:', serviceType);
    
    // Start a transaction
    await query('BEGIN');
    
    // Determine the table based on service type
    let tableName;
    switch (serviceType) {
      case 'phone_numbers':
        tableName = 'phone_number_requests';
        break;
      case 'momo_numbers':
        tableName = 'momo_transaction_requests';
        break;
      case 'call_history':
        tableName = 'call_history_requests';
        break;
      case 'serial_numbers':
        tableName = 'serial_number_requests';
        break;
      case 'unblock_call':
        tableName = 'unblock_call_requests';
        break;
      case 'unblock_momo':
        tableName = 'unblock_momo_requests';
        break;
      default:
        await query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid service type' });
    }
    
    // Process each item in the data array
    for (const item of data) {
      if (item.id) {
        // Update existing item
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        // Build dynamic update fields
        Object.entries(item).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'request_id') {
            updateFields.push(`${key} = $${paramIndex}`);
            updateValues.push(value);
            paramIndex++;
          }
        });
        
        // Add the WHERE clause parameters
        updateValues.push(item.id);
        updateValues.push(requestId);
        
        // Execute update query
        if (updateFields.length > 0) {
          await query(
            `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND service_request_id = $${paramIndex + 1}`,
            updateValues
          );
        }
      } else {
        // Insert new item
        const fields = ['service_request_id'];
        const values = [requestId];
        const placeholders = ['$1'];
        let paramIndex = 2;
        
        // Build dynamic insert fields
        Object.entries(item).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'request_id') {
            fields.push(key);
            values.push(value);
            placeholders.push(`$${paramIndex}`);
            paramIndex++;
          }
        });
        
        // Execute insert query
        await query(
          `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
          values
        );
      }
    }
    
    // Add to request history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'service_data_updated', $3, NOW())`,
      [requestId, req.user.id, `Updated ${serviceType} data`]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ success: true });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error updating service data:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};