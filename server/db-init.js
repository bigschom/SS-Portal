// server/db-init.js
import { query } from './db.js';

// Initialize database tables
export const initializeTables = async () => {
  console.log('Checking and initializing database tables...');
  
  try {
    // Check and create users table if it doesn't exist
    await createUsersTable();
    
    // Check and create activity_log table if it doesn't exist
    await createActivityLogTable();
    
    // Check and create background_checks table if it doesn't exist
    await createBackgroundChecksTable();
    
    // Check and create stakeholder_requests table if it doesn't exist
    await createStakeholderRequestsTable();
    
    // Check and create guard_shift_reports table if it doesn't exist
    await createGuardShiftReportsTable();

    // Check and create queue_handlers table if it doesn't exist
    await createQueueHandlersTable();
        
    // Check and create service_requests table if it doesn't exist
    await createServiceRequestsTable();

    // Check and create notification_settings table if it doesn't exist
    await createNotificationSettingsTable();

    // Check and create request_comments table if it doesn't exist
    await createRequestCommentsTable();

    // Check and create request_history table if it doesn't exist
    await createRequestHistoryTable();

    // Check and create service-specific tables
    await createPhoneNumberRequestsTable();
    await createStolenPhoneRequestsTable();
    await createMomoTransactionRequestsTable();
    await createMoneyRefundRequestsTable();
    await createMomoUnblockRequestsTable();
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

const createUsersTable = async () => {
  const tableExists = await checkTableExists('users');
  
  if (!tableExists) {
    console.log('Creating users table...');
    await query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        full_name VARCHAR(100),
        role VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_at TIMESTAMP,
        last_login TIMESTAMP,
        last_activity TIMESTAMP,
        temp_password VARCHAR(100),
        temp_password_expires TIMESTAMP,
        password_change_required BOOLEAN DEFAULT FALSE,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Users table created');
  }
};

const createActivityLogTable = async () => {
  const tableExists = await checkTableExists('activity_log');
  
  if (!tableExists) {
    console.log('Creating activity_log table...');
    await query(`
      CREATE TABLE activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        record_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Activity_log table created');
  }
};

const createBackgroundChecksTable = async () => {
  const tableExists = await checkTableExists('background_checks');
  
  if (!tableExists) {
    console.log('Creating background_checks table...');
    await query(`
      CREATE TABLE background_checks (
        id SERIAL PRIMARY KEY,
        full_names VARCHAR(100) NOT NULL,
        citizenship VARCHAR(50),
        id_passport_number VARCHAR(50) UNIQUE NOT NULL,
        passport_expiry_date DATE,
        department_id INTEGER,
        department_name VARCHAR(100),
        role_id INTEGER,
        role_type VARCHAR(50),
        role VARCHAR(200),
        submitted_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        closed_date DATE,
        closed_by VARCHAR(100),
        requested_by VARCHAR(100),
        from_company VARCHAR(100),
        duration VARCHAR(50),
        operating_country VARCHAR(50),
        date_start DATE,
        date_end DATE,
        work_with TEXT,
        additional_info TEXT,
        contact_number VARCHAR(20),
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Background_checks table created');
  }
};

const createStakeholderRequestsTable = async () => {
  const tableExists = await checkTableExists('stakeholder_requests');
  
  if (!tableExists) {
    console.log('Creating stakeholder_requests table...');
    await query(`
      CREATE TABLE stakeholder_requests (
        id SERIAL PRIMARY KEY,
        date_received DATE NOT NULL,
        reference_number VARCHAR(50),
        sender VARCHAR(100) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL,
        response_date DATE,
        answered_by VARCHAR(100),
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Stakeholder_requests table created');
  }
};

const createGuardShiftReportsTable = async () => {
  const tableExists = await checkTableExists('guard_shift_reports');
  
  if (!tableExists) {
    console.log('Creating guard_shift_reports table...');
    await query(`
            CREATE TABLE guard_shift_reports (
        id SERIAL PRIMARY KEY,
        guard_name VARCHAR(100) NOT NULL,
        shift_type VARCHAR(50) NOT NULL,
        location VARCHAR(100) NOT NULL,
        shift_date DATE NOT NULL,
        shift_start_time TIMESTAMP,
        shift_end_time TIMESTAMP,
        has_incident BOOLEAN DEFAULT FALSE,
        incident_details TEXT,
        incident_time TIMESTAMP,
        actions_taken TEXT,
        cctv_status VARCHAR(50),
        cctv_issues TEXT,
        cctv_supervision_reason VARCHAR(50),
        cctv_supervision_other_reason TEXT,
        electricity_status VARCHAR(50),
        water_status VARCHAR(50),
        office_status VARCHAR(50),
        parking_status VARCHAR(50),
        team_members JSONB,
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Guard_shift_reports table created');
  }
};

const createQueueHandlersTable = async () => {
  const tableExists = await checkTableExists('queue_handlers');
  
  if (!tableExists) {
    console.log('Creating queue_handlers table...');
    await query(`
      CREATE TABLE queue_handlers (
        id SERIAL PRIMARY KEY,
        service_type VARCHAR(100) NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(service_type, user_id)
      )
    `);
    console.log('queue_handlers table created');
  }
};

const createServiceRequestsTable = async () => {
  const tableExists = await checkTableExists('service_requests');
  
  if (!tableExists) {
    console.log('Creating service_requests table...');
    await query(`
      CREATE TABLE service_requests (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        service_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        full_names VARCHAR(100) NOT NULL,
        id_passport VARCHAR(50),
        primary_contact VARCHAR(20),
        secondary_contact VARCHAR(20),
        details TEXT,
        assigned_to INTEGER,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('service_requests table created');
  }
};

const createNotificationSettingsTable = async () => {
  const tableExists = await checkTableExists('notification_settings');
  
  if (!tableExists) {
    console.log('Creating notification_settings table...');
    await query(`
      CREATE TABLE notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        browser_enabled BOOLEAN DEFAULT TRUE,
        sms_enabled BOOLEAN DEFAULT FALSE,
        email_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    console.log('notification_settings table created');
  }
};

const createRequestCommentsTable = async () => {
  const tableExists = await checkTableExists('request_comments');
  
  if (!tableExists) {
    console.log('Creating request_comments table...');
    await query(`
      CREATE TABLE request_comments (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        comment TEXT NOT NULL,
        is_send_back_reason BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('request_comments table created');
  }
};

const createRequestHistoryTable = async () => {
  const tableExists = await checkTableExists('request_history');
  
  if (!tableExists) {
    console.log('Creating request_history table...');
    await query(`
      CREATE TABLE request_history (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL,
        performed_by INTEGER,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('request_history table created');
  }
};

const createPhoneNumberRequestsTable = async () => {
  const tableExists = await checkTableExists('phone_number_requests');
  
  if (!tableExists) {
    console.log('Creating phone_number_requests table...');
    await query(`
      CREATE TABLE phone_number_requests (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        phone_brand VARCHAR(50),
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('phone_number_requests table created');
  }
};

const createStolenPhoneRequestsTable = async () => {
  const tableExists = await checkTableExists('stolen_phone_requests');
  
  if (!tableExists) {
    console.log('Creating stolen_phone_requests table...');
    await query(`
      CREATE TABLE stolen_phone_requests (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL,
        imei_number VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('stolen_phone_requests table created');
  }
};

const createMomoTransactionRequestsTable = async () => {
  const tableExists = await checkTableExists('momo_transaction_requests');
  
  if (!tableExists) {
    console.log('Creating momo_transaction_requests table...');
    await query(`
      CREATE TABLE momo_transaction_requests (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('momo_transaction_requests table created');
  }
};

const createMoneyRefundRequestsTable = async () => {
  const tableExists = await checkTableExists('money_refund_requests');
  
  if (!tableExists) {
    console.log('Creating money_refund_requests table...');
    await query(`
      CREATE TABLE money_refund_requests (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        recipient_number VARCHAR(20),
        amount DECIMAL(10, 2),
        transaction_date DATE,
        reason VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('money_refund_requests table created');
  }
};

const createMomoUnblockRequestsTable = async () => {
  const tableExists = await checkTableExists('momo_unblock_requests');
  
  if (!tableExists) {
    console.log('Creating momo_unblock_requests table...');
    await query(`
      CREATE TABLE momo_unblock_requests (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        date_blocked DATE,
        account_type VARCHAR(50),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('momo_unblock_requests table created');
  }
};


// Helper function to check if a table exists
const checkTableExists = async (tableName) => {
  const result = await query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
    [tableName]
  );
  return result.rows[0].exists;
};

