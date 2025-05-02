// server/controllers/background-controller.js
import { query } from '../db.js';

/**
 * Get all unique citizenships
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCitizenships = async (req, res) => {
  try {
    console.log('Fetching unique citizenship values');
    
    const result = await query(
      'SELECT DISTINCT citizenship FROM background_checks WHERE citizenship IS NOT NULL AND citizenship != \'\' ORDER BY citizenship'
    );
    
    return res.json(result.rows.map(row => row.citizenship));
  } catch (error) {
    console.error('Error fetching citizenships:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get all unique requesters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRequesters = async (req, res) => {
  try {
    console.log('Fetching unique requesters');
    
    const result = await query(
      'SELECT DISTINCT requested_by FROM background_checks WHERE requested_by IS NOT NULL AND requested_by != \'\' ORDER BY requested_by'
    );
    
    return res.json(result.rows.map(row => row.requested_by));
  } catch (error) {
    console.error('Error fetching requesters:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get all departments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllDepartments = async (req, res) => {
  try {
    console.log('Fetching active departments');
    
    const result = await query(
      'SELECT id, name FROM departments WHERE status = $1 ORDER BY name',
      ['active']
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Check for duplicate ID/passport
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkDuplicateId = async (req, res) => {
  try {
    const { idNumber } = req.params;
    
    console.log('Checking for duplicate ID/passport:', idNumber);
    
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM background_checks WHERE id_passport_number = $1)',
      [idNumber]
    );
    
    return res.json({ exists: result.rows[0].exists });
  } catch (error) {
    console.error('Error checking for duplicate ID:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Create a new background check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createBackgroundCheck = async (req, res) => {
  try {
    console.log('Creating new background check with data:', req.body);
    
    const {
      full_names,
      citizenship,
      id_passport_number,
      passport_expiry_date,
      department_id,
      department_name,
      role_type,
      role,
      submitted_date,
      status,
      requested_by,
      from_company,
      duration,
      operating_country,
      date_start,
      date_end,
      work_with,
      additional_info,
      contact_number,
      created_by,
      updated_by
    } = req.body;
    
    // Validate required fields
    if (!full_names || !citizenship || !id_passport_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check for duplicate ID/Passport number
    const duplicateCheck = await query(
      'SELECT EXISTS(SELECT 1 FROM background_checks WHERE id_passport_number = $1)',
      [id_passport_number]
    );
    
    if (duplicateCheck.rows[0].exists) {
      return res.status(400).json({
        error: 'ID or Passport number already exists in the system'
      });
    }
    
    // Process date fields - handle empty strings
    const processedData = {
      full_names,
      citizenship,
      id_passport_number,
      passport_expiry_date: passport_expiry_date || null,
      department_id: department_id || null,
      department_name: department_name || null,
      role_type,
      role: role || null,
      submitted_date: submitted_date || null,
      status: status || 'Pending',
      requested_by: requested_by || null,
      from_company: from_company || null,
      duration: duration || null,
      operating_country: operating_country || null,
      date_start: date_start || null,
      date_end: date_end || null,
      work_with: work_with || null,
      additional_info: additional_info || null,
      contact_number: contact_number || null,
      created_by: created_by || req.user.username,
      updated_by: updated_by || req.user.username
    };
    
    // Format dates properly if they are provided
    const dateFields = ['submitted_date', 'passport_expiry_date', 'date_start', 'date_end', 'closed_date'];
    
    dateFields.forEach(field => {
      if (processedData[field] && processedData[field] !== '') {
        try {
          // Try to parse and format the date
          const date = new Date(processedData[field]);
          if (!isNaN(date.getTime())) {
            // Format as YYYY-MM-DD
            processedData[field] = date.toISOString().split('T')[0];
          } else {
            console.warn(`Invalid date detected for ${field}:`, processedData[field]);
            processedData[field] = null;
          }
        } catch (error) {
          console.error(`Error processing date for ${field}:`, error);
          processedData[field] = null;
        }
      } else {
        processedData[field] = null;
      }
    });
    
    console.log('Processed data for creation:', processedData);
    
    // Prepare SQL parameters in the correct order
    const params = [
      processedData.full_names,
      processedData.citizenship,
      processedData.id_passport_number,
      processedData.passport_expiry_date,
      processedData.department_id,
      processedData.department_name,
      processedData.role_type,
      processedData.role,
      processedData.submitted_date,
      processedData.status,
      processedData.requested_by,
      processedData.from_company,
      processedData.duration,
      processedData.operating_country,
      processedData.date_start,
      processedData.date_end,
      processedData.work_with,
      processedData.additional_info,
      processedData.contact_number,
      processedData.created_by,
      processedData.updated_by
    ];
    
    console.log('SQL parameters:', params);
    
    const result = await query(
      `INSERT INTO background_checks (
        full_names, citizenship, id_passport_number, passport_expiry_date,
        department_id, department_name, role_type, role,
        submitted_date, status, requested_by, from_company, duration,
        operating_country, date_start, date_end, work_with, additional_info,
        contact_number, created_by, updated_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *`,
      params
    );
    
    console.log('Background check created successfully:', result.rows[0].id);
    
    // Log activity
    try {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.username, `Created background check: ${full_names}`, 'create', result.rows[0].id]
      );
    } catch (logError) {
      console.error('Failed to log activity for create:', logError);
    }
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating background check:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get all background checks with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllBackgroundChecks = async (req, res) => {
  try {
    console.log('Fetching all background checks with filters:', req.query);
    
    // Extract filter parameters
    const { 
      role_type, 
      department_name, 
      status, 
      citizenship, 
      requestedBy, 
      startDate, 
      endDate, 
      search,
      sortKey,
      sortDirection
    } = req.query;
    
    // Start building the query with proper date formatting
    let queryText = `
      SELECT 
        id, full_names, citizenship, id_passport_number, 
        TO_CHAR(passport_expiry_date, 'YYYY-MM-DD') as passport_expiry_date, 
        department_id, department_name, role_type, role, 
        TO_CHAR(submitted_date, 'YYYY-MM-DD') as submitted_date, 
        status, requested_by, from_company, duration,
        operating_country, 
        TO_CHAR(date_start, 'YYYY-MM-DD') as date_start, 
        TO_CHAR(date_end, 'YYYY-MM-DD') as date_end, 
        work_with, additional_info, contact_number,
        TO_CHAR(closed_date, 'YYYY-MM-DD') as closed_date,
        closed_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM background_checks WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Add filters to the query - using the exact field names from your schema
    if (role_type && role_type !== 'all') {
      queryText += ` AND role_type = $${paramIndex}`;
      params.push(role_type);
      paramIndex++;
    }
    
    if (department_name && department_name !== 'all') {
      queryText += ` AND department_name = $${paramIndex}`;
      params.push(department_name);
      paramIndex++;
    }
    
    if (status && status !== 'all') {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (citizenship && citizenship !== 'all') {
      queryText += ` AND citizenship = $${paramIndex}`;
      params.push(citizenship);
      paramIndex++;
    }
    
    if (requestedBy && requestedBy !== 'all') {
      queryText += ` AND requested_by = $${paramIndex}`;
      params.push(requestedBy);
      paramIndex++;
    }
    
    if (startDate) {
      queryText += ` AND submitted_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      queryText += ` AND submitted_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (search) {
      queryText += ` AND full_names ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add sorting - using the exact field names from your schema
    const validSortKeys = ['full_names', 'citizenship', 'department_name', 'role_type', 
                           'status', 'submitted_date', 'requested_by'];
    
    if (sortKey && validSortKeys.includes(sortKey)) {
      const direction = sortDirection === 'asc' ? 'ASC' : 'DESC';
      queryText += ` ORDER BY ${sortKey} ${direction}`;
    } else {
      queryText += ' ORDER BY submitted_date DESC';
    }
    
    console.log('Executing query:', queryText);
    console.log('With parameters:', params);
    
    const result = await query(queryText, params);
    console.log(`Found ${result.rows.length} background checks`);
    
    // Log the activity (view all is important to track)
    try {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.username, 'Viewed all background checks', 'view', null]
      );
    } catch (logError) {
      console.error('Failed to log activity for view all:', logError);
      // Continue with the response even if activity logging fails
    }
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching background checks:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get a background check by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBackgroundCheckById = async (req, res) => {
  const { id } = req.params;
  
  console.log('Fetching background check with ID:', id);
  
  try {
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Use TO_CHAR to ensure all dates are formatted consistently as YYYY-MM-DD
    const result = await query(
      `SELECT 
          id, 
          full_names, 
          citizenship, 
          id_passport_number, 
          TO_CHAR(passport_expiry_date, 'YYYY-MM-DD') as passport_expiry_date, 
          department_id, 
          department_name, 
          role_type, 
          role, 
          TO_CHAR(submitted_date, 'YYYY-MM-DD') as submitted_date, 
          status, 
          requested_by, 
          from_company, 
          duration,
          operating_country, 
          TO_CHAR(date_start, 'YYYY-MM-DD') as date_start, 
          TO_CHAR(date_end, 'YYYY-MM-DD') as date_end, 
          work_with, 
          additional_info, 
          contact_number,
          TO_CHAR(closed_date, 'YYYY-MM-DD') as closed_date,
          closed_by,
          TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
       FROM background_checks 
       WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Background check not found' });
    }
    
    console.log('Found background check:', result.rows[0].full_names);
    console.log('Date fields in response:', {
      submitted_date: result.rows[0].submitted_date,
      passport_expiry_date: result.rows[0].passport_expiry_date,
      date_start: result.rows[0].date_start,
      date_end: result.rows[0].date_end,
      closed_date: result.rows[0].closed_date
    });
    
    // Log the activity
    try {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.username, `Viewed background check: ${result.rows[0].full_names}`, 'view', numericId]
      );
    } catch (logError) {
      console.error('Failed to log activity for view:', logError);
      // Continue with the response even if activity logging fails
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching background check:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update a background check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateBackgroundCheck = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  console.log('Received update request for background check ID:', id);
  console.log('Update data:', JSON.stringify(updateData, null, 2));
  
  try {
    // Validate required fields
    if (!updateData.full_names || !updateData.citizenship || !updateData.id_passport_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if record exists before updating
    const checkExists = await query(
      'SELECT id FROM background_checks WHERE id = $1',
      [numericId]
    );
    
    if (checkExists.rows.length === 0) {
      return res.status(404).json({ error: 'Background check not found' });
    }
    
    // Process date fields to ensure they're in the correct format for PostgreSQL
    // Convert empty strings to null for date fields
    const dateFields = [
      'submitted_date', 
      'passport_expiry_date', 
      'date_start', 
      'date_end', 
      'closed_date'
    ];
    
    // Create a copy of updateData to avoid mutating the original
    const processedData = { ...updateData };
    
    dateFields.forEach(field => {
      // If the field exists in updateData and is an empty string or invalid, set it to null
      if (field in processedData) {
        if (!processedData[field] || processedData[field] === '') {
          processedData[field] = null;
        } else {
          try {
            // Try to parse and format the date
            const date = new Date(processedData[field]);
            if (!isNaN(date.getTime())) {
              // Format as YYYY-MM-DD
              processedData[field] = date.toISOString().split('T')[0];
            } else {
              console.warn(`Invalid date detected for ${field}:`, processedData[field]);
              processedData[field] = null;
            }
          } catch (error) {
            console.error(`Error processing date for ${field}:`, error);
            processedData[field] = null;
          }
        }
      }
    });
    
    // Build the dynamic update query
    const keys = Object.keys(processedData).filter(key => 
      // Only include fields that are actually in our database schema
      [
        'full_names', 'citizenship', 'id_passport_number', 
        'passport_expiry_date', 'department_id', 'department_name', 
        'role_id', 'role_type', 'role', 'submitted_date', 'status', 
        'requested_by', 'from_company', 'duration', 
        'operating_country', 'date_start', 'date_end', 
        'work_with', 'additional_info', 'contact_number', 
        'updated_by', 'closed_date', 'closed_by'
      ].includes(key)
    );
    
    const values = keys.map(key => processedData[key]);
    
    // Create the SET part of the query
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    
    // Add updated_at to the query
    const queryText = `
      UPDATE background_checks 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    // Add the id to the values array
    values.push(numericId);
    
    console.log('Executing query:', queryText);
    console.log('With parameters:', values);
    
    const result = await query(queryText, values);
    
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Update failed' });
    }
    
    console.log('Update successful for ID:', id);
    
    // Format the dates in the response for consistent client handling
    const updatedRecord = result.rows[0];
    const formattedRecord = { ...updatedRecord };
    
    dateFields.forEach(field => {
      if (formattedRecord[field]) {
        try {
          formattedRecord[field] = new Date(formattedRecord[field]).toISOString().split('T')[0];
        } catch (error) {
          console.error(`Error formatting date in response for ${field}:`, error);
        }
      }
    });
    
    // Log the activity
    try {
      const activityData = {
        user_id: req.user.username,
        description: `Updated background check: ${processedData.full_names} (${processedData.status})`,
        type: 'update',
        record_id: numericId
      };
      
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [activityData.user_id, activityData.description, activityData.type, activityData.record_id]
      );
      
      console.log('Activity logged for update:', activityData);
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Continue with the response even if activity logging fails
    }
    
    return res.json(formattedRecord);
  } catch (error) {
    console.error('Error updating background check:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Delete a background check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteBackgroundCheck = async (req, res) => {
  const { id } = req.params;
  
  console.log('Deleting background check with ID:', id);
  
  try {
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Get the background check details before deleting (for activity log)
    const checkResult = await query(
      'SELECT full_names FROM background_checks WHERE id = $1',
      [numericId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Background check not found' });
    }
    
    const fullNames = checkResult.rows[0].full_names;
    
    // Delete the background check
    const result = await query(
      'DELETE FROM background_checks WHERE id = $1 RETURNING id',
      [numericId]
    );
    
    // Log the activity
    try {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.username, `Deleted background check: ${fullNames}`, 'delete', numericId]
      );
    } catch (logError) {
      console.error('Failed to log activity for delete:', logError);
    }
    
    return res.json({ success: true, message: 'Background check deleted successfully' });
  } catch (error) {
    console.error('Error deleting background check:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get internships with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInternships = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    console.log('Fetching internships with filters:', { status, startDate, endDate });
    
    let queryStr = `
      SELECT 
        id, full_names, citizenship, id_passport_number, 
        TO_CHAR(passport_expiry_date, 'YYYY-MM-DD') as passport_expiry_date, 
        department_id, department_name, role_type, role, 
        TO_CHAR(submitted_date, 'YYYY-MM-DD') as submitted_date, 
        status, requested_by, from_company, duration,
        operating_country, 
        TO_CHAR(date_start, 'YYYY-MM-DD') as date_start, 
        TO_CHAR(date_end, 'YYYY-MM-DD') as date_end, 
        work_with, additional_info, contact_number,
        TO_CHAR(closed_date, 'YYYY-MM-DD') as closed_date,
        closed_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM background_checks
      WHERE role_type = 'Internship'
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    // Apply date filters if provided
    if (startDate) {
      queryStr += ` AND date_start >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      queryStr += ` AND date_end <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Apply status filters
    if (status === 'active') {
      queryStr += ` AND date_end >= $${paramCount}`;
      queryParams.push(currentDate);
      paramCount++;
    } else if (status === 'expired') {
      queryStr += ` AND date_end < $${paramCount}`;
      queryParams.push(currentDate);
      paramCount++;
    }
    
    queryStr += ` ORDER BY date_start DESC`;
    
    console.log('Executing query:', queryStr, 'with params:', queryParams);
    
    const result = await query(queryStr, queryParams);
    
    console.log(`Found ${result.rows.length} internships matching the criteria`);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching internships:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};