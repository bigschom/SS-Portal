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


// Helper function to check if a table exists
const checkTableExists = async (tableName) => {
  const result = await query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
    [tableName]
  );
  return result.rows[0].exists;
};

