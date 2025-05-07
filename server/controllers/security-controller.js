// server/controllers/security-controller.js
import { query } from '../db.js';
import { generateReferenceNumber, getNextSequentialNumber } from '../../src/pages/security-services/new-request/utils/referenceNumberUtils.js';

/**
 * Get available security services
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAvailableServices = async (req, res) => {
  try {
    const services = [
      {
        id: 1,
        service_type: 'request_serial_number',
        name: 'Request Serial Number',
        description: 'Request a new serial number'
      },
      {
        id: 2,
        service_type: 'stolen_phone_check',
        name: 'Stolen Phone Check',
        description: 'Check if a phone is reported stolen'
      },
      {
        id: 3,
        service_type: 'call_history_request',
        name: 'Call History Request',
        description: 'Request call history'
      },
      {
        id: 4,
        service_type: 'unblock_call_request',
        name: 'Unblock Call Request',
        description: 'Request to unblock calls'
      },
      {
        id: 5,
        service_type: 'unblock_momo_request',
        name: 'Unblock MoMo Request',
        description: 'Request to unblock MoMo account'
      },
      {
        id: 6,
        service_type: 'money_refund_request',
        name: 'Money Refund Request',
        description: 'Request a money refund'
      },
      {
        id: 7,
        service_type: 'momo_transaction_request',
        name: 'MoMo Transaction Request',
        description: 'Request MoMo transaction details'
      },
      {
        id: 8,
        service_type: 'backoffice_appointment',
        name: 'Backoffice Appointment',
        description: 'Schedule a backoffice appointment'
      }
    ];
    
    res.json({ services });
  } catch (error) {
    console.error('Error fetching security services:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get user service permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserServicePermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real-world scenario, you'd fetch these from a database based on user role/permissions
    const allPermissions = [
      'request_serial_number',
      'stolen_phone_check',
      'call_history_request',
      'unblock_call_request',
      'unblock_momo_request',
      'money_refund_request',
      'momo_transaction_request',
      'backoffice_appointment'
    ];
    
    // For this example, we'll return all permissions
    // In a real app, you'd filter based on user role or specific user permissions
    res.json({ permissions: allPermissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get backoffice users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBackofficeUsers = async (req, res) => {
  try {
    console.log('Fetching backoffice users');
    
    // Fetch active backoffice users from the database
    const result = await query(`
      SELECT 
        id, 
        full_name AS fullname, 
        role,
        username
      FROM users 
      WHERE 
        is_active = true 
        AND role IN ('backoffice', 'admin', 'support')
      ORDER BY full_name
    `);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching backoffice users:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit backoffice appointment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitBackofficeAppointment = async (req, res) => {
  try {
    const { request, appointments } = req.body;
    
    console.log('Received backoffice appointment request:', { request, appointments });
    
    // Validate required fields
    if (!request || !appointments || !Array.isArray(appointments)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Validate selected backoffice user exists and is active
    const userCheck = await query(
      `SELECT id FROM users 
       WHERE id = $1 
       AND is_active = true 
       AND role IN ('backoffice', 'admin', 'support')`,
      [appointments[0].backoffice_user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive backoffice user' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = req.body.userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        'backoffice_appointment',
        request.full_names,
        request.id_passport,
        request.primary_contact,
        request.secondary_contact || null,
        request.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert appointment details
    for (const appointment of appointments) {
      await query(
        `INSERT INTO backoffice_appointments (
          service_request_id,
          backoffice_user_id,
          preferred_date,
          preferred_time
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          appointment.backoffice_user_id,
          appointment.preferred_date,
          appointment.preferred_time
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Backoffice appointment created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating backoffice appointment:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit call history request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitCallHistoryRequest = async (req, res) => {
  try {
    const { formData, callHistoryRequests, serviceType, userId } = req.body;
    
    console.log('Received call history request:', { formData, callHistoryRequests });
    
    // Validate required fields
    if (!formData || !callHistoryRequests || !Array.isArray(callHistoryRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'call_history_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert call history request details
    for (const request of callHistoryRequests) {
      await query(
        `INSERT INTO call_history_requests (
          service_request_id,
          phone_number,
          start_date,
          end_date
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          request.phone_number,
          request.start_date,
          request.end_date
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Call history request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating call history request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit MoMo transaction request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitMomoTransactionRequest = async (req, res) => {
  try {
    const { formData, momoTransactions, serviceType, userId } = req.body;
    
    console.log('Received MoMo transaction request:', { formData, momoTransactions });
    
    // Validate required fields
    if (!formData || !momoTransactions || !Array.isArray(momoTransactions)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'momo_transaction_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert MoMo transaction request details
    for (const transaction of momoTransactions) {
      await query(
        `INSERT INTO momo_transaction_requests (
          service_request_id,
          phone_number,
          start_date,
          end_date
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          transaction.phone_number,
          transaction.start_date,
          transaction.end_date
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('MoMo transaction request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating MoMo transaction request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit unblock MoMo request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitUnblockMomoRequest = async (req, res) => {
  try {
    const { formData, momoNumberRequests, serviceType, userId } = req.body;
    
    console.log('Received unblock MoMo request:', { formData, momoNumberRequests });
    
    // Validate required fields
    if (!formData || !momoNumberRequests || !Array.isArray(momoNumberRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'unblock_momo_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert unblock MoMo request details
    for (const request of momoNumberRequests) {
      await query(
        `INSERT INTO unblock_momo_requests (
          service_request_id,
          phone_number,
          date_blocked,
          account_type
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          request.number,
          request.date_blocked || null,
          request.account_type
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Unblock MoMo request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating unblock MoMo request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit money refund request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitMoneyRefundRequest = async (req, res) => {
  try {
    const { formData, refundRequests, serviceType, userId } = req.body;
    
    console.log('Received money refund request:', { formData, refundRequests });
    
    // Validate required fields
    if (!formData || !refundRequests || !Array.isArray(refundRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'money_refund_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert money refund request details
    for (const request of refundRequests) {
      await query(
        `INSERT INTO money_refund_requests (
          service_request_id,
          phone_number,
          recipient_number,
          amount,
          transaction_date,
          reason
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          serviceRequestId,
          request.phone_number,
          request.recipient_number,
          parseFloat(request.amount),
          request.transaction_date,
          request.reason
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Money refund request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating money refund request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit serial number request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitSerialNumberRequest = async (req, res) => {
  try {
    const { formData, phoneRequests, serviceType, userId } = req.body;
    
    console.log('Received serial number request:', { formData, phoneRequests });
    
    // Validate required fields
    if (!formData || !phoneRequests || !Array.isArray(phoneRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'serial_number_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert serial number request details
    for (const request of phoneRequests) {
      await query(
        `INSERT INTO serial_number_requests (
          service_request_id,
          phone_number,
          phone_brand,
          start_date,
          end_date
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          serviceRequestId,
          request.phone_number,
          request.phone_brand,
          request.start_date,
          request.end_date
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Serial number request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating serial number request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit stolen phone check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitStolenPhoneCheck = async (req, res) => {
  try {
    const { formData, imeiRequests, serviceType, userId } = req.body;
    
    console.log('Received stolen phone check request:', { formData, imeiRequests });
    
    // Validate required fields
    if (!formData || !imeiRequests || !Array.isArray(imeiRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'stolen_phone_check',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert stolen phone check request details
    for (const request of imeiRequests) {
      await query(
        `INSERT INTO stolen_phone_requests (
          service_request_id,
          imei_number
        ) VALUES ($1, $2)`,
        [
          serviceRequestId,
          request.imei_number
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Stolen phone check request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating stolen phone check request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit unblock call request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitUnblockCallRequest = async (req, res) => {
  try {
    const { formData, phoneNumberRequests, serviceType, userId } = req.body;
    
    console.log('Received unblock call request:', { formData, phoneNumberRequests });
    
    // Validate required fields
    if (!formData || !phoneNumberRequests || !Array.isArray(phoneNumberRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'unblock_call_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert unblock call request details
    for (const request of phoneNumberRequests) {
      await query(
        `INSERT INTO unblock_call_requests (
          service_request_id,
          phone_number,
          date_blocked,
          reason_blocked
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          request.number,
          request.date_blocked || null,
          request.reason_blocked || null
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Unblock call request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating unblock call request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Submit other request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitOtherRequest = async (req, res) => {
  try {
    const { formData, otherRequests, serviceType, userId } = req.body;
    
    console.log('Received other request:', { formData, otherRequests });
    
    // Validate required fields
    if (!formData || !otherRequests || !Array.isArray(otherRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Get existing reference numbers for the current year
    const existingRefResult = await query(
      `SELECT reference_number FROM service_requests 
       WHERE reference_number LIKE 'SSR-${new Date().getFullYear()}-%'`
    );
    
    // Extract reference numbers array
    const refNumbers = existingRefResult.rows.map(row => row.reference_number);
    
    // Get next sequential number and generate reference number using utility functions
    const nextSeqNumber = getNextSequentialNumber(refNumbers);
    const referenceNumber = generateReferenceNumber(nextSeqNumber);
    
    // Get the creator's ID - use either the user ID from request or from the auth token
    const createdBy = userId || req.user.id || req.user.username;
    
    if (!createdBy) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'User information not available' });
    }
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'other_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        createdBy,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert other request details
    for (const request of otherRequests) {
      await query(
        `INSERT INTO other_requests (
          service_request_id,
          reference_number,
          request_date
        ) VALUES ($1, $2, $3)`,
        [
          serviceRequestId,
          request.number,
          request.request_date
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Other request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating other request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};