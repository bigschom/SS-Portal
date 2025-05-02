// server/controllers/queue-controller.js
import { query } from '../db.js';

/**
 * Get all queue handlers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getHandlers = async (req, res) => {
  try {
    console.log('Fetching queue handlers');
    
    const result = await query(
      `SELECT qh.id, qh.service_type, qh.user_id, u.username, u.full_name,
              qh.created_at, qh.updated_at
       FROM queue_handlers qh
       JOIN users u ON qh.user_id = u.id
       ORDER BY qh.service_type, u.full_name`
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching queue handlers:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get all service requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRequests = async (req, res) => {
  try {
    console.log('Fetching service requests');
    
    const result = await query(
      `SELECT sr.id, sr.reference_number, sr.service_type, sr.status, sr.priority,
              sr.full_names, sr.id_passport, sr.primary_contact, sr.secondary_contact,
              sr.details, sr.assigned_to, sr.created_by,
              creator.username as creator_username, creator.full_name as creator_full_name,
              assignee.username as assignee_username, assignee.full_name as assignee_full_name,
              sr.created_at, sr.updated_at
       FROM service_requests sr
       LEFT JOIN users creator ON sr.created_by = creator.id
       LEFT JOIN users assignee ON sr.assigned_to = assignee.id
       ORDER BY sr.created_at DESC`
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Assign a handler to a service type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const assignHandler = async (req, res) => {
  try {
    const { service_type, user_id } = req.body;
    
    console.log('Assigning handler to service type:', { service_type, user_id });
    
    if (!service_type || !user_id) {
      return res.status(400).json({ error: 'Service type and user ID are required' });
    }
    
    // Check if the user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Insert or update the handler assignment
    const result = await query(
      `INSERT INTO queue_handlers (service_type, user_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (service_type, user_id) 
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [service_type, user_id]
    );
    
    // Get the user details to include in the response
    const userResult = await query(
      'SELECT id, username, full_name FROM users WHERE id = $1',
      [user_id]
    );
    
    const handler = {
      ...result.rows[0],
      username: userResult.rows[0].username,
      full_name: userResult.rows[0].full_name
    };
    
    return res.status(201).json(handler);
  } catch (error) {
    console.error('Error assigning queue handler:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Remove a handler from a service type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const removeHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Removing handler with ID:', id);
    
    const result = await query(
      'DELETE FROM queue_handlers WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Handler not found' });
    }
    
    return res.json({ success: true, message: 'Handler removed successfully' });
  } catch (error) {
    console.error('Error removing queue handler:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Assign a request to a handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const assignRequestToHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    console.log('Assigning request to handler:', { request_id: id, user_id });
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Check if the user exists
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET assigned_to = $1, status = 'in_progress', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [user_id, id]
    );
    
    // Get the user details to include in the response
    const userResult = await query(
      'SELECT id, username, full_name FROM users WHERE id = $1',
      [user_id]
    );
    
    const request = {
      ...result.rows[0],
      assignee_username: userResult.rows[0].username,
      assignee_full_name: userResult.rows[0].full_name
    };
    
    return res.json(request);
  } catch (error) {
    console.error('Error assigning service request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Mark a request as unable to handle
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markRequestUnableToHandle = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Marking request as unable to handle:', id);
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET status = 'unable_to_handle', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking service request as unable to handle:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Mark a request as completed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markRequestCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Marking request as completed:', id);
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking service request as completed:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Mark a request as under investigation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markRequestInvestigating = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Marking request as under investigation:', id);
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET status = 'pending_investigation', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking service request as under investigation:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Send back a request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const sendBackRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Sending back request:', id);
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET status = 'sent_back', assigned_to = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error sending back service request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get handlers by service type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getHandlersByServiceType = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    console.log('Fetching handlers for service type:', serviceType);
    
    const result = await query(
      `SELECT qh.id, qh.service_type, qh.user_id, u.username, u.full_name
       FROM queue_handlers qh
       JOIN users u ON qh.user_id = u.id
       WHERE qh.service_type = $1
       ORDER BY u.full_name`,
      [serviceType]
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching handlers by service type:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};