// server/controllers/routingController.js
import { query } from '../db.js';

/**
 * Get all routing rules
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRoutingRules = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        routing_rules.*,
        array_agg(user_assignments.user_id) as assigned_users
      FROM 
        routing_rules
        LEFT JOIN user_assignments ON routing_rules.service_type = user_assignments.service_type
      GROUP BY 
        routing_rules.id, 
        routing_rules.service_type
    `);
    
    // Process the result to format assigned_users
    const rules = result.rows.map(rule => {
      // Filter out null values from assigned_users
      const assignedUsers = rule.assigned_users.filter(userId => userId !== null);
      
      return {
        ...rule,
        assigned_users: assignedUsers
      };
    });
    
    return res.json(rules);
  } catch (error) {
    console.error('Error fetching routing rules:', error);
    return res.status(500).json({ error: 'Error fetching routing rules: ' + error.message });
  }
};

/**
 * Get routing rule by service type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRoutingRuleByServiceType = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    if (!serviceType) {
      return res.status(400).json({ error: 'Service type is required' });
    }
    
    const ruleResult = await query(`
      SELECT * FROM routing_rules WHERE service_type = $1
    `, [serviceType]);
    
    if (ruleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Routing rule not found' });
    }
    
    const rule = ruleResult.rows[0];
    
    // Get assigned users
    const assignedUsersResult = await query(`
      SELECT user_id FROM user_assignments WHERE service_type = $1
    `, [serviceType]);
    
    const assignedUsers = assignedUsersResult.rows.map(row => row.user_id);
    
    return res.json({
      ...rule,
      assigned_users: assignedUsers
    });
  } catch (error) {
    console.error(`Error fetching routing rule for ${req.params.serviceType}:`, error);
    return res.status(500).json({ error: 'Error fetching routing rule: ' + error.message });
  }
};

/**
 * Save routing rule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const saveRoutingRule = async (req, res) => {
  try {
    const { service_type, is_active, auto_assign, assigned_users } = req.body;
    
    if (!service_type) {
      return res.status(400).json({ error: 'Service type is required' });
    }
    
    // Start transaction
    await query('BEGIN');
    
    // Check if rule exists
    const existingRule = await query(`
      SELECT * FROM routing_rules WHERE service_type = $1
    `, [service_type]);
    
    let rule;
    
    if (existingRule.rows.length === 0) {
      // Create new rule
      const result = await query(`
        INSERT INTO routing_rules (service_type, is_active, auto_assign)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [service_type, is_active, auto_assign]);
      
      rule = result.rows[0];
    } else {
      // Update existing rule
      const result = await query(`
        UPDATE routing_rules
        SET is_active = $1, auto_assign = $2
        WHERE service_type = $3
        RETURNING *
      `, [is_active, auto_assign, service_type]);
      
      rule = result.rows[0];
    }
    
    // Delete existing user assignments
    await query(`
      DELETE FROM user_assignments WHERE service_type = $1
    `, [service_type]);
    
    // Add new user assignments
    if (Array.isArray(assigned_users) && assigned_users.length > 0) {
      for (const userId of assigned_users) {
        await query(`
          INSERT INTO user_assignments (service_type, user_id)
          VALUES ($1, $2)
        `, [service_type, userId]);
      }
    }
    
    // Get assigned users
    const assignedUsersResult = await query(`
      SELECT user_id FROM user_assignments WHERE service_type = $1
    `, [service_type]);
    
    const assignedUserIds = assignedUsersResult.rows.map(row => row.user_id);
    
    // Commit transaction
    await query('COMMIT');
    
    return res.json({
      ...rule,
      assigned_users: assignedUserIds
    });
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    
    console.error('Error saving routing rule:', error);
    return res.status(500).json({ error: 'Error saving routing rule: ' + error.message });
  }
};

/**
 * Delete routing rule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteRoutingRule = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    if (!serviceType) {
      return res.status(400).json({ error: 'Service type is required' });
    }
    
    // Start transaction
    await query('BEGIN');
    
    // Delete user assignments
    await query(`
      DELETE FROM user_assignments WHERE service_type = $1
    `, [serviceType]);
    
    // Delete routing rule
    const result = await query(`
      DELETE FROM routing_rules WHERE service_type = $1
      RETURNING *
    `, [serviceType]);
    
    if (result.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Routing rule not found' });
    }
    
    // Commit transaction
    await query('COMMIT');
    
    return res.json({ message: 'Routing rule deleted successfully' });
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    
    console.error(`Error deleting routing rule for ${req.params.serviceType}:`, error);
    return res.status(500).json({ error: 'Error deleting routing rule: ' + error.message });
  }
};

/**
 * Get next available agent for a service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNextAvailableAgent = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    if (!serviceType) {
      return res.status(400).json({ error: 'Service type is required' });
    }
    
    // Get routing rule
    const ruleResult = await query(`
      SELECT * FROM routing_rules WHERE service_type = $1
    `, [serviceType]);
    
    if (ruleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Routing rule not found' });
    }
    
    const rule = ruleResult.rows[0];
    
    // If rule is not active, return null
    if (!rule.is_active) {
      return res.json(null);
    }
    
    // Get assigned users
    const assignedUsersResult = await query(`
      SELECT user_id FROM user_assignments WHERE service_type = $1
    `, [serviceType]);
    
    if (assignedUsersResult.rows.length === 0) {
      return res.json(null);
    }
    
    const assignedUserIds = assignedUsersResult.rows.map(row => row.user_id);
    
    // Get user with lowest active request count
    const userResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.role,
        COUNT(sr.id) as active_requests
      FROM 
        users u
        LEFT JOIN service_requests sr ON u.id = sr.assigned_to AND sr.status NOT IN ('completed', 'unable_to_handle')
      WHERE 
        u.id = ANY($1) AND
        u.is_active = true
      GROUP BY 
        u.id
      ORDER BY 
        active_requests ASC
      LIMIT 1
    `, [assignedUserIds]);
    
    if (userResult.rows.length === 0) {
      return res.json(null);
    }
    
    return res.json(userResult.rows[0]);
  } catch (error) {
    console.error(`Error getting next available agent for ${req.params.serviceType}:`, error);
    return res.status(500).json({ error: 'Error getting next available agent: ' + error.message });
  }
};

