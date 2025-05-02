// server/controllers/guard-controller.js
import { query } from '../db.js';

/**
 * Get all guard shift reports with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllReports = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      shiftType, 
      hasIncident, 
      guard, 
      location,
      page = 1,
      limit = 10
    } = req.query;
    
    console.log('Fetching guard shift reports with filters:', req.query);
    
    // Build the query with filters
    let queryText = `
      SELECT 
        id, 
        guard_name, 
        shift_type, 
        location, 
        TO_CHAR(shift_date, 'YYYY-MM-DD') as shift_date,
        TO_CHAR(shift_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_start_time,
        TO_CHAR(shift_end_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_end_time,
        has_incident,
        incident_details,
        TO_CHAR(incident_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as incident_time,
        actions_taken,
        cctv_status,
        cctv_issues,
        cctv_supervision_reason,
        cctv_supervision_other_reason,
        electricity_status,
        water_status,
        office_status,
        parking_status,
        team_members,
        notes,
        created_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM guard_shift_reports
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Add filters
    if (startDate) {
      queryText += ` AND shift_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      queryText += ` AND shift_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (shiftType && shiftType !== 'all') {
      queryText += ` AND shift_type = $${paramIndex}`;
      params.push(shiftType);
      paramIndex++;
    }
    
    if (hasIncident === 'true' || hasIncident === 'false') {
      queryText += ` AND has_incident = $${paramIndex}`;
      params.push(hasIncident === 'true');
      paramIndex++;
    }
    
    if (guard && guard !== 'all') {
      queryText += ` AND guard_name ILIKE $${paramIndex}`;
      params.push(`%${guard}%`);
      paramIndex++;
    }
    
    if (location && location !== 'all') {
      queryText += ` AND location = $${paramIndex}`;
      params.push(location);
      paramIndex++;
    }
    
    // Count total records for pagination
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS filtered_reports`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Add pagination
    const offset = (page - 1) * limit;
    queryText += ` ORDER BY shift_date DESC, shift_start_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    console.log('Executing query:', queryText);
    console.log('With parameters:', params);
    
    const result = await query(queryText, params);
    
    return res.json({
      data: result.rows,
      count: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching guard shift reports:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get a single guard shift report by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching guard shift report with ID:', id);
    
    const result = await query(
      `SELECT 
        id, 
        guard_name, 
        shift_type, 
        location, 
        TO_CHAR(shift_date, 'YYYY-MM-DD') as shift_date,
        TO_CHAR(shift_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_start_time,
        TO_CHAR(shift_end_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_end_time,
        has_incident,
        incident_details,
        TO_CHAR(incident_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as incident_time,
        actions_taken,
        equipment_status,
        team_members,
        notes,
        created_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM guard_shift_reports
      WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guard shift report not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching guard shift report:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get weekly stats for guard shift reports
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getWeeklyStats = async (req, res) => {
  try {
    console.log('Fetching weekly guard shift report stats');
    
    // Get current date and start of week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Go to Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Format dates for PostgreSQL
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    // Get total reports for the week
    const totalResult = await query(
      'SELECT COUNT(*) FROM guard_shift_reports WHERE shift_date BETWEEN $1 AND $2',
      [startDate, endDate]
    );
    
    // Get incident count for the week
    const incidentResult = await query(
      'SELECT COUNT(*) FROM guard_shift_reports WHERE shift_date BETWEEN $1 AND $2 AND has_incident = true',
      [startDate, endDate]
    );
    
    // Get issues count (reports with equipment issues)
    const issuesResult = await query(
      `SELECT COUNT(*) FROM guard_shift_reports 
       WHERE shift_date BETWEEN $1 AND $2 
       AND (
         electricity_status = 'issues' OR
         water_status = 'issues' OR
         office_status = 'issues' OR
         parking_status = 'issues' OR
         cctv_status = 'partial-issue' OR
         cctv_status = 'not-working'
       )`,
      [startDate, endDate]
    );
    
    // Get reports by location
    const locationResult = await query(
      'SELECT location, COUNT(*) FROM guard_shift_reports WHERE shift_date BETWEEN $1 AND $2 GROUP BY location',
      [startDate, endDate]
    );
    
    // Get reports by shift type
    const shiftTypeResult = await query(
      'SELECT shift_type, COUNT(*) FROM guard_shift_reports WHERE shift_date BETWEEN $1 AND $2 GROUP BY shift_type',
      [startDate, endDate]
    );
    
    return res.json({
      totalReports: parseInt(totalResult.rows[0].count),
      incidentCount: parseInt(incidentResult.rows[0].count),
      issuesCount: parseInt(issuesResult.rows[0].count),
      byLocation: locationResult.rows.map(row => ({
        location: row.location,
        count: parseInt(row.count)
      })),
      byShiftType: shiftTypeResult.rows.map(row => ({
        shiftType: row.shift_type,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    console.error('Error fetching guard shift report stats:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Create a new guard shift report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createReport = async (req, res) => {
  try {
    const {
      submitted_by,
      location,
      shift_type,
      shift_start_time,
      shift_end_time,
      team_members,
      cctv_status,
      cctv_issues,
      cctv_supervision_reason,
      cctv_supervision_other_reason,
      electricity_status,
      water_status,
      office_status,
      parking_status,
      incident_occurred,
      incident_type,
      incident_time,
      incident_location,
      incident_description,
      action_taken,
      notes,
      user_id
    } = req.body;
    
    console.log('Creating guard shift report with data:', req.body);
    
    // Validate required fields
    if (!submitted_by || !location || !shift_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Extract date from shift_start_time for shift_date
    const shift_date = shift_start_time ? new Date(shift_start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    // Store team members as JSON
    const team_members_json = JSON.stringify(team_members || []);
    
    const result = await query(
      `INSERT INTO guard_shift_reports (
        guard_name,
        shift_type,
        location,
        shift_date,
        shift_start_time,
        shift_end_time,
        has_incident,
        incident_details,
        incident_time,
        actions_taken,
        cctv_status,
        cctv_issues,
        cctv_supervision_reason,
        cctv_supervision_other_reason,
        electricity_status,
        water_status,
        office_status,
        parking_status,
        team_members,
        notes,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *`,
      [
        submitted_by,
        shift_type,
        location,
        shift_date,
        shift_start_time,
        shift_end_time,
        incident_occurred || false,
        incident_description,
        incident_time,
        action_taken,
        cctv_status,
        cctv_issues,
        cctv_supervision_reason,
        cctv_supervision_other_reason,
        electricity_status,
        water_status,
        office_status,
        parking_status,
        team_members_json,
        notes,
        user_id || req.user.username
      ]
    );
    
    console.log('Guard shift report created successfully:', result.rows[0].id);
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating guard shift report:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update a guard shift report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateReport = async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log('Updating guard shift report with ID:', id);
      console.log('Update data:', updateData);
      
      // Get the current report
      const currentReport = await query('SELECT * FROM guard_shift_reports WHERE id = $1', [id]);
      
      if (currentReport.rows.length === 0) {
        return res.status(404).json({ error: 'Guard shift report not found' });
      }
      
      // Prepare the update data
      const updates = {};
      
      // Handle simple fields
      ['guard_name', 'shift_type', 'location', 'shift_date', 'shift_start_time', 
       'shift_end_time', 'has_incident', 'incident_details', 'incident_time', 
       'actions_taken', 'notes'].forEach(field => {
        if (field in updateData) {
          updates[field] = updateData[field];
        }
      });
      
      // Handle equipment status as JSON
      if (updateData.cctv_status || updateData.electricity_status || 
          updateData.water_status || updateData.office_status || 
          updateData.parking_status) {
        
        // Get current equipment status
        let currentEquipment = {};
        try {
          currentEquipment = JSON.parse(currentReport.rows[0].equipment_status || '{}');
        } catch (e) {
          console.warn('Error parsing current equipment status:', e);
        }
        
        // Update with new values
        const equipment_status = {
          ...currentEquipment,
          cctv_status: updateData.cctv_status || currentEquipment.cctv_status,
          cctv_issues: updateData.cctv_issues || currentEquipment.cctv_issues,
          cctv_supervision_reason: updateData.cctv_supervision_reason || currentEquipment.cctv_supervision_reason,
          cctv_supervision_other_reason: updateData.cctv_supervision_other_reason || currentEquipment.cctv_supervision_other_reason,
          electricity_status: updateData.electricity_status || currentEquipment.electricity_status,
          water_status: updateData.water_status || currentEquipment.water_status,
          office_status: updateData.office_status || currentEquipment.office_status,
          parking_status: updateData.parking_status || currentEquipment.parking_status
        };
        
        updates.equipment_status = JSON.stringify(equipment_status);
      }
      
      // Handle team members as JSON
      if (updateData.team_members) {
        updates.team_members = JSON.stringify(updateData.team_members);
      }
      
      // Build the dynamic update query
      const keys = Object.keys(updates);
      const values = keys.map(key => updates[key]);
      
      // Create the SET part of the query
      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      
      // Add updated_at to the query
      const queryText = `
        UPDATE guard_shift_reports 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${keys.length + 1}
        RETURNING *
      `;
      
      // Add the id to the values array
      values.push(id);
      
      const result = await query(queryText, values);
      
      return res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating guard shift report:', error);
      return res.status(500).json({ error: 'Server error: ' + error.message });
    }
  };
  
  /**
   * Delete a guard shift report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const deleteReport = async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('Deleting guard shift report with ID:', id);
      
      const result = await query(
        'DELETE FROM guard_shift_reports WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Guard shift report not found' });
      }
      
      return res.json({ success: true, message: 'Guard shift report deleted successfully' });
    } catch (error) {
      console.error('Error deleting guard shift report:', error);
      return res.status(500).json({ error: 'Server error: ' + error.message });
    }
  };
  
  /**
   * Get unique locations from guard shift reports
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getLocations = async (req, res) => {
    try {
      console.log('Fetching guard shift locations');
      
      const result = await query(
        'SELECT DISTINCT location FROM guard_shift_reports ORDER BY location',
        []
      );
      
      return res.json(result.rows.map(row => row.location));
    } catch (error) {
      console.error('Error fetching guard shift locations:', error);
      return res.status(500).json({ error: 'Server error: ' + error.message });
    }
  };
  
  /**
   * Get unique shift types from guard shift reports
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const getShiftTypes = async (req, res) => {
    try {
      console.log('Fetching guard shift types');
      
      const result = await query(
        'SELECT DISTINCT shift_type FROM guard_shift_reports ORDER BY shift_type',
        []
      );
      
      return res.json(result.rows.map(row => row.shift_type));
    } catch (error) {
      console.error('Error fetching guard shift types:', error);
      return res.status(500).json({ error: 'Server error: ' + error.message });
    }
  };