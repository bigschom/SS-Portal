// server/controllers/internship-controller.js
import { query } from '../db.js';

/**
 * Get all internships with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllInternships = async (req, res) => {
  try {
    const { status, startDate, endDate, department } = req.query;
    
    let queryStr = `
      SELECT 
        id, full_names, citizenship, id_passport_number, 
        TO_CHAR(passport_expiry_date, 'YYYY-MM-DD') as passport_expiry_date, 
        department_id, department_name, 
        TO_CHAR(date_start, 'YYYY-MM-DD') as date_start, 
        TO_CHAR(date_end, 'YYYY-MM-DD') as date_end, 
        work_with, additional_info, contact_number,
        status,
        created_by, updated_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM internships
      WHERE 1=1
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
    
    // Apply department filter
    if (department) {
      const isDepartmentId = !isNaN(parseInt(department, 10));
      
      if (isDepartmentId) {
        queryStr += ` AND department_id = $${paramCount}`;
        queryParams.push(parseInt(department, 10));
      } else {
        queryStr += ` AND LOWER(department_name) = LOWER($${paramCount})`;
        queryParams.push(department);
      }
      
      paramCount++;
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Modify status filtering to be more flexible
    if (status) {
      if (status === 'active') {
        queryStr += ` AND date_end >= $${paramCount}`;
        queryParams.push(currentDate);
        paramCount++;
      } else if (status === 'expired') {
        queryStr += ` AND date_end < $${paramCount}`;
        queryParams.push(currentDate);
        paramCount++;
      }
    }
    
    queryStr += ` ORDER BY date_start DESC`;
    
    console.log('Executing query:', queryStr, 'with params:', queryParams);
    
    const result = await query(queryStr, queryParams);
    
    console.log(`Found ${result.rows.length} internships matching the criteria`);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching internships:', error);
    return res.status(500).json({ 
      error: 'Server error: ' + error.message,
      details: error.toString()
    });
  }
};

/**
 * Get internship by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInternshipById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const result = await query(
      `SELECT 
        id, full_names, citizenship, id_passport_number, 
        TO_CHAR(passport_expiry_date, 'YYYY-MM-DD') as passport_expiry_date, 
        department_id, department_name, 
        TO_CHAR(date_start, 'YYYY-MM-DD') as date_start, 
        TO_CHAR(date_end, 'YYYY-MM-DD') as date_end, 
        work_with, additional_info, contact_number,
        status,
        created_by, updated_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM internships
      WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Internship not found' });
    }
    
    // Update status based on end date
    const internship = result.rows[0];
    const endDate = internship.date_end ? new Date(internship.date_end) : null;
    const currentDate = new Date();
    
    if (endDate) {
      internship.status = endDate >= currentDate ? 'Active' : 'Expired';
    }
    
    return res.json(internship);
  } catch (error) {
    console.error('Error fetching internship by ID:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Create a new internship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createInternship = async (req, res) => {
  try {
    const {
      full_names,
      citizenship,
      id_passport_number,
      passport_expiry_date,
      department_id,
      department_name,
      date_start,
      date_end,
      work_with,
      contact_number,
      additional_info,
      created_by
    } = req.body;
    
    // Validate required fields
    if (!full_names || !citizenship || !id_passport_number || !department_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate date formats
    try {
      if (date_start) new Date(date_start);
      if (date_end) new Date(date_end);
      if (passport_expiry_date) new Date(passport_expiry_date);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Check for duplicate ID/Passport number
    const duplicateCheck = await query(
      'SELECT EXISTS(SELECT 1 FROM internships WHERE id_passport_number = $1)',
      [id_passport_number]
    );
    
    if (duplicateCheck.rows[0].exists) {
      return res.status(400).json({
        error: 'ID or Passport number already exists in the system'
      });
    }
    
    // Determine status based on end date
    const currentDate = new Date();
    const endDate = date_end ? new Date(date_end) : null;
    const status = endDate && endDate >= currentDate ? 'Active' : 'Expired';
    
    // Get department name if not provided
    let finalDepartmentName = department_name;
    
    if (!finalDepartmentName && department_id) {
      try {
        const deptResult = await query(
          'SELECT name FROM departments WHERE id = $1',
          [department_id]
        );
        
        if (deptResult.rows.length > 0) {
          finalDepartmentName = deptResult.rows[0].name;
        }
      } catch (deptError) {
        console.warn('Error fetching department name:', deptError);
      }
    }
    
    const result = await query(
      `INSERT INTO internships (
        full_names, citizenship, id_passport_number, passport_expiry_date,
        department_id, department_name, date_start, date_end,
        work_with, contact_number, additional_info, status,
        created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, NOW(), NOW()
      ) RETURNING *`,
      [
        full_names,
        citizenship,
        id_passport_number,
        passport_expiry_date || null,
        department_id,
        finalDepartmentName || '',
        date_start,
        date_end,
        work_with,
        contact_number,
        additional_info || null,
        status,
        created_by || (req.user ? req.user.username : 'system')
      ]
    );
    
    // Log activity
    try {
      const username = req.user ? req.user.username : (created_by || 'system');
      
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [username, `Created internship for ${full_names}`, 'create', result.rows[0].id]
      );
    } catch (logError) {
      console.warn('Failed to log activity for create, but internship was still created:', logError);
    }
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating internship:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update an existing internship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateInternship = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if record exists before updating
    const checkExists = await query(
      'SELECT id FROM internships WHERE id = $1',
      [numericId]
    );
    
    if (checkExists.rows.length === 0) {
      return res.status(404).json({ error: 'Internship not found' });
    }
    
    // Extract fields from updateData
    const {
      full_names,
      citizenship,
      id_passport_number,
      passport_expiry_date,
      department_id,
      department_name,
      date_start,
      date_end,
      work_with,
      contact_number,
      additional_info,
      updated_by,
      status
    } = updateData;
    
    // Validate date formats
    try {
      if (date_start) new Date(date_start);
      if (date_end) new Date(date_end);
      if (passport_expiry_date) new Date(passport_expiry_date);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Determine status based on end date if not provided
    let updatedStatus = status;
    if (!updatedStatus && date_end) {
      const currentDate = new Date();
      const endDate = new Date(date_end);
      
      updatedStatus = endDate >= currentDate ? 'Active' : 'Expired';
    }
    
    // Get department name if not provided but ID is updated
    let finalDepartmentName = department_name;
    
    if (!finalDepartmentName && department_id) {
      try {
        const deptResult = await query(
          'SELECT name FROM departments WHERE id = $1',
          [department_id]
        );
        
        if (deptResult.rows.length > 0) {
          finalDepartmentName = deptResult.rows[0].name;
        }
      } catch (deptError) {
        console.warn('Error fetching department name:', deptError);
      }
    }
    
    const result = await query(
      `UPDATE internships
      SET
        full_names = $2,
        citizenship = $3,
        id_passport_number = $4,
        passport_expiry_date = $5,
        department_id = $6,
        department_name = $7,
        date_start = $8,
        date_end = $9,
        work_with = $10,
        contact_number = $11,
        additional_info = $12,
        status = $13,
        updated_by = $14,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        numericId,
        full_names,
        citizenship,
        id_passport_number,
        passport_expiry_date || null,
        department_id,
        finalDepartmentName || department_name,
        date_start,
        date_end,
        work_with,
        contact_number,
        additional_info || null,
        updatedStatus,
        updated_by || (req.user ? req.user.username : 'system')
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Update failed' });
    }
    
    // Log activity
    try {
      const username = req.user ? req.user.username : (updated_by || 'system');
      
      await query( 
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [username, `Updated internship for ${full_names}`, 'update', numericId]
      );
    } catch (logError) {
      console.warn('Failed to log activity for update, but internship was still updated:', logError);
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating internship:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Delete an internship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteInternship = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Get internship details before deletion for activity log
    const getInternship = await query(
      'SELECT full_names FROM internships WHERE id = $1',
      [numericId]
    );
    
    if (getInternship.rows.length === 0) {
      return res.status(404).json({ error: 'Internship not found' });
    }
    
    const { full_names } = getInternship.rows[0];
    
    // Delete the internship
    await query(
      'DELETE FROM internships WHERE id = $1 RETURNING id',
      [numericId]
    );
    
    // Log activity
    try {
      const username = req.user ? req.user.username : 'system';
      
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [username, `Deleted internship for ${full_names}`, 'delete', numericId]
      );
    } catch (logError) {
      console.warn('Failed to log activity for delete, but internship was still deleted:', logError);
    }
    
    return res.json({ success: true, message: 'Internship deleted successfully' });
  } catch (error) {
    console.error('Error deleting internship:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Check for duplicate ID/passport number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkDuplicateId = async (req, res) => {
  try {
    const { idNumber } = req.query;
    
    if (!idNumber) {
      return res.status(400).json({ error: 'Missing ID number parameter' });
    }
    
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM internships WHERE id_passport_number = $1)',
      [idNumber.trim()]
    );
    
    return res.json({ exists: result.rows[0].exists });
  } catch (error) {
    console.error('Error checking duplicate ID:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get citizenship options from internships table
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCitizenshipOptions = async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT citizenship 
       FROM internships 
       WHERE citizenship IS NOT NULL AND citizenship != '' 
       ORDER BY citizenship ASC`
    );
    
    const options = result.rows.map(row => row.citizenship);
    return res.json(options);
  } catch (error) {
    console.error('Error getting citizenship options:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get supervisor options from internships table
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSupervisors = async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT work_with 
       FROM internships 
       WHERE work_with IS NOT NULL AND work_with != '' 
       ORDER BY work_with ASC`
    );
    
    const supervisors = result.rows.map(row => row.work_with);
    return res.json(supervisors);
  } catch (error) {
    console.error('Error getting supervisors:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Get internship statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInternshipStatistics = async (req, res) => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Get counts of active and expired internships
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM internships WHERE date_end >= $1) AS active_count,
        (SELECT COUNT(*) FROM internships WHERE date_end < $1) AS expired_count,
        (SELECT COUNT(*) FROM internships) AS total_count,
        (SELECT COUNT(DISTINCT department_id) FROM internships WHERE date_end >= $1) AS active_departments
    `;
    
    const result = await query(statsQuery, [currentDate]);
    
    // Get department distribution
    const deptQuery = `
      SELECT department_name, COUNT(*) as count
      FROM internships
      WHERE date_end >= $1
      GROUP BY department_name
      ORDER BY count DESC
    `;
    
    const deptResult = await query(deptQuery, [currentDate]);
    
    // Get citizenship distribution
    const citizenshipQuery = `
      SELECT citizenship, COUNT(*) as count
      FROM internships
      WHERE date_end >= $1
      GROUP BY citizenship
      ORDER BY count DESC
    `;
    
    const citizenshipResult = await query(citizenshipQuery, [currentDate]);
    
    return res.json({
      statistics: result.rows[0],
      departments: deptResult.rows,
      citizenship: citizenshipResult.rows
    });
  } catch (error) {
    console.error('Error getting internship statistics:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};