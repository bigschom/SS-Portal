// server/db-init.js
import { query } from './db.js';
import bcrypt from 'bcryptjs';

// Initialize database tables
export const initializeTables = async () => {
  console.log('Checking and initializing database tables...');
  
  try {
    // CORE SYSTEM TABLES
    await createUsersTable();
    await createPasswordHistoryTable();
    await createActivityLogTable();
    await createNotificationSettingsTable();
    
    // SERVICE REQUEST TABLES
    await createServiceRequestsTable();
    await createRequestCommentsTable();
    await createCommentReactionsTable();
    await createRequestHistoryTable();
    await createQueueHandlersTable();
    await createServiceSpecificTables();
    
    // BACKGROUND CHECKS TABLE
    await createBackgroundChecksTable();
    
    // STAKEHOLDER REQUEST TABLE
    await createStakeholderRequestsTable();

    // GUARDSHIFT TABLES
    await createGuardShiftReportsTable();

    //INTERNSHIP TABLES
    await createInternshipsTable();
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

// Helper function to check if a table exists
const checkTableExists = async (tableName) => {
  try {
    const result = await query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    throw error;
  }
};

// Username generation utility function
export const generateUniqueUsername = async (fullName) => {
  // Clean and format the full name
  const cleanName = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/);

  // Generate base username
  let baseUsername = cleanName.length > 1
    ? `${cleanName[0]}.${cleanName[cleanName.length - 1]}`
    : cleanName[0];

  let username = baseUsername;
  let counter = 1;

  // Check and ensure username uniqueness
  while (true) {
    try {
      const result = await query(
        'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)',
        [username]
      );

      if (!result.rows[0].exists) {
        return username;
      }

      // If username exists, append a number
      username = `${baseUsername}${counter}`;
      counter++;
    } catch (error) {
      console.error('Error generating unique username:', error);
      throw error;
    }
  }
};

// ============= CORE SYSTEM TABLES =============

const createUsersTable = async () => {
  try {
    const tableExists = await checkTableExists('users');
    
    if (!tableExists) {
      console.log('Creating users table with enhanced security features...');
      await query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(100) NOT NULL,
          full_name VARCHAR(100),
          role VARCHAR(20) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          
          -- Security-related columns
          failed_login_attempts INTEGER DEFAULT 0,
          locked_at TIMESTAMP,
          last_login TIMESTAMP,
          last_activity TIMESTAMP,
          
          -- Password management columns
          temp_password VARCHAR(100),
          temp_password_expires TIMESTAMP,
          password_change_required BOOLEAN DEFAULT FALSE,
          password_last_changed TIMESTAMP DEFAULT NOW(),
          password_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '3 months',
          
          -- Audit trail using usernames
          created_by VARCHAR(50),
          updated_by VARCHAR(50),
          
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Create function to update password expiration
        CREATE OR REPLACE FUNCTION update_password_expiration()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Reset password expiration when password is changed
          IF OLD.password IS DISTINCT FROM NEW.password THEN
            NEW.password_last_changed = NOW();
            NEW.password_expires_at = NOW() + INTERVAL '3 months';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Trigger to update password expiration
        CREATE TRIGGER password_expiration_trigger
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_password_expiration();

        -- Create indexes for performance optimization
        CREATE INDEX idx_users_username ON users(username);
        CREATE INDEX idx_users_role ON users(role);
        CREATE INDEX idx_users_password_expiration ON users(password_expires_at);
      `);
      console.log('Users table created with enhanced security features');
    }
  } catch (error) {
    console.error('Error creating users table:', error);
    throw error;
  }
};

const createPasswordHistoryTable = async () => {
  try {
    const tableExists = await checkTableExists('password_history');
    
    if (!tableExists) {
      console.log('Creating password_history table...');
      await query(`
        CREATE TABLE password_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          password VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Create an index to improve performance
        CREATE INDEX idx_password_history_user_id ON password_history(user_id);
        
        -- Add trigger to limit password history
        CREATE OR REPLACE FUNCTION limit_password_history()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Delete oldest entries if more than 5 exist for a user
          DELETE FROM password_history 
          WHERE id IN (
            SELECT id FROM (
              SELECT id, 
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as row_num
              FROM password_history
              WHERE user_id = NEW.user_id
            ) ranked
            WHERE row_num > 5
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER enforce_password_history_limit
        AFTER INSERT ON password_history
        FOR EACH ROW
        EXECUTE FUNCTION limit_password_history();
      `);
      console.log('Password history table created');
    }
  } catch (error) {
    console.error('Error creating password history table:', error);
    throw error;
  }
};

const createActivityLogTable = async () => {
  try {
    const tableExists = await checkTableExists('activity_log');
    
    if (!tableExists) {
      console.log('Creating activity_log table...');
      await query(`
        CREATE TABLE activity_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          description TEXT NOT NULL,
          type VARCHAR(50) NOT NULL,
          record_id INTEGER,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Add index for faster searching and filtering
        CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
        CREATE INDEX idx_activity_log_type ON activity_log(type);
        CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
      `);
      console.log('Activity_log table created');
    }
  } catch (error) {
    console.error('Error creating activity log table:', error);
    throw error;
  }
};

const createNotificationSettingsTable = async () => {
  try {
    const tableExists = await checkTableExists('notification_settings');
    
    if (!tableExists) {
      console.log('Creating notification_settings table...');
      await query(`
        CREATE TABLE notification_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          browser_enabled BOOLEAN DEFAULT TRUE,
          sms_enabled BOOLEAN DEFAULT FALSE,
          email_enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(user_id)
        );
        
        -- Add index for faster lookups
        CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
      `);
      console.log('notification_settings table created');
    }
  } catch (error) {
    console.error('Error creating notification settings table:', error);
    throw error;
  }
};

// ============= SERVICE REQUEST RELATED TABLES =============

const createServiceRequestsTable = async () => {
  try {
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
          assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes for common query patterns
        CREATE INDEX idx_service_requests_service_type ON service_requests(service_type);
        CREATE INDEX idx_service_requests_status ON service_requests(status);
        CREATE INDEX idx_service_requests_assigned_to ON service_requests(assigned_to);
        CREATE INDEX idx_service_requests_created_at ON service_requests(created_at);
      `);
      console.log('service_requests table created');
    }
  } catch (error) {
    console.error('Error creating service requests table:', error);
    throw error;
  }
};

const createRequestCommentsTable = async () => {
  try {
    const tableExists = await checkTableExists('request_comments');
    
    if (!tableExists) {
      console.log('Creating request_comments table...');
      await query(`
        CREATE TABLE request_comments (
          id SERIAL PRIMARY KEY,
          request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
          created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          comment TEXT NOT NULL,
          is_send_back_reason BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes for common query patterns
        CREATE INDEX idx_request_comments_request_id ON request_comments(request_id);
        CREATE INDEX idx_request_comments_created_by ON request_comments(created_by);
      `);
      console.log('request_comments table created');
    }
  } catch (error) {
    console.error('Error creating request comments table:', error);
    throw error;
  }
};

const createRequestHistoryTable = async () => {
  try {
    const tableExists = await checkTableExists('request_history');
    
    if (!tableExists) {
      console.log('Creating request_history table...');
      await query(`
        CREATE TABLE request_history (
          id SERIAL PRIMARY KEY,
          request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
          performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(50) NOT NULL,
          details TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes for common query patterns
        CREATE INDEX idx_request_history_request_id ON request_history(request_id);
        CREATE INDEX idx_request_history_performed_by ON request_history(performed_by);
        CREATE INDEX idx_request_history_created_at ON request_history(created_at);
      `);
      console.log('request_history table created');
    }
  } catch (error) {
    console.error('Error creating request history table:', error);
    throw error;
  }
};

const createQueueHandlersTable = async () => {
  try {
    const tableExists = await checkTableExists('queue_handlers');
    
    if (!tableExists) {
      console.log('Creating queue_handlers table...');
      await query(`
        CREATE TABLE queue_handlers (
          id SERIAL PRIMARY KEY,
          service_type VARCHAR(100) NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(service_type, user_id)
        );
        
        -- Add index for service type
        CREATE INDEX idx_queue_handlers_service_type ON queue_handlers(service_type);
      `);
      console.log('queue_handlers table created');
    }
  } catch (error) {
    console.error('Error creating queue handlers table:', error);
    throw error;
  }
};

// ============= SERVICE-SPECIFIC REQUEST TABLES =============

const createServiceSpecificTables = async () => {
  // Define the service-specific table creation functions in an array
  const serviceSpecificTables = [
    {
      name: 'phone_number_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE phone_number_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            phone_number VARCHAR(20) NOT NULL,
            phone_brand VARCHAR(50),
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX idx_phone_number_requests_service_request_id ON phone_number_requests(service_request_id);
          CREATE INDEX idx_phone_number_requests_phone_number ON phone_number_requests(phone_number);
        `);
      }
    },
    {
      name: 'stolen_phone_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE stolen_phone_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            imei_number VARCHAR(20) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX idx_stolen_phone_requests_service_request_id ON stolen_phone_requests(service_request_id);
          CREATE INDEX idx_stolen_phone_requests_imei_number ON stolen_phone_requests(imei_number);
        `);
      }
    },
    {
      name: 'momo_transaction_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE momo_transaction_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            phone_number VARCHAR(20) NOT NULL,
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX idx_momo_transaction_requests_service_request_id ON momo_transaction_requests(service_request_id);
          CREATE INDEX idx_momo_transaction_requests_phone_number ON momo_transaction_requests(phone_number);
        `);
      }
    },
    {
      name: 'money_refund_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE money_refund_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            phone_number VARCHAR(20) NOT NULL,
            recipient_number VARCHAR(20),
            amount DECIMAL(10, 2),
            transaction_date DATE,
            reason VARCHAR(100),
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX idx_money_refund_requests_service_request_id ON money_refund_requests(service_request_id);
          CREATE INDEX idx_money_refund_requests_phone_number ON money_refund_requests(phone_number);
        `);
      }
    },
    {
      name: 'unblock_momo_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE unblock_momo_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            phone_number VARCHAR(20) NOT NULL,
            date_blocked DATE,
            account_type VARCHAR(50),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX idx_unblock_momo_requests_service_request_id ON unblock_momo_requests(service_request_id);
          CREATE INDEX idx_unblock_momo_requests_phone_number ON unblock_momo_requests(phone_number);
        `);
      }
    },
    {
      name: 'backoffice_appointments',
      createFn: async () => {
        await query(`
          CREATE TABLE backoffice_appointments (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            backoffice_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            preferred_date DATE NOT NULL,
            preferred_time TIME NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_backoffice_appointments_service_request_id ON backoffice_appointments(service_request_id);
          CREATE INDEX idx_backoffice_appointments_backoffice_user_id ON backoffice_appointments(backoffice_user_id);
          CREATE INDEX idx_backoffice_appointments_preferred_date ON backoffice_appointments(preferred_date);
        `);
      }
    },
    {
      name: 'call_history_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE call_history_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            phone_number VARCHAR(20) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_call_history_requests_service_request_id ON call_history_requests(service_request_id);
          CREATE INDEX idx_call_history_requests_phone_number ON call_history_requests(phone_number);
        `);
      }
    },
    {
      name: 'serial_number_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE serial_number_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            phone_number VARCHAR(20) NOT NULL,
            phone_brand VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_serial_number_requests_service_request_id ON serial_number_requests(service_request_id);
          CREATE INDEX idx_serial_number_requests_phone_number ON serial_number_requests(phone_number);
        `);
      }
    },
    {
      name: 'unblock_call_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE unblock_call_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            phone_number VARCHAR(20) NOT NULL,
            date_blocked DATE,
            reason_blocked VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_unblock_call_requests_service_request_id ON unblock_call_requests(service_request_id);
          CREATE INDEX idx_unblock_call_requests_phone_number ON unblock_call_requests(phone_number);
        `);
      }
    },
    {
      name: 'other_requests',
      createFn: async () => {
        await query(`
          CREATE TABLE other_requests (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
            reference_number VARCHAR(100) NOT NULL,
            request_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_other_requests_service_request_id ON other_requests(service_request_id);
          CREATE INDEX idx_other_requests_reference_number ON other_requests(reference_number);
        `);
      }
    },
    {
      name: 'routing_rules',
      createFn: async () => {
        await query(`
          CREATE TABLE routing_rules (
            id SERIAL PRIMARY KEY,
            service_type VARCHAR(100) NOT NULL UNIQUE,
            is_active BOOLEAN NOT NULL DEFAULT true,
            auto_assign BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }
    },
    {
      name: 'user_assignments',
      createFn: async () => {
        await query(`
          CREATE TABLE user_assignments (
            id SERIAL PRIMARY KEY,
            service_type VARCHAR(100) NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(service_type, user_id),
            FOREIGN KEY (service_type) REFERENCES routing_rules(service_type) ON DELETE CASCADE
          );
        `);
      }
    }
  ];

  // Create each service-specific table if it doesn't exist
  try {
    for (const table of serviceSpecificTables) {
      const tableExists = await checkTableExists(table.name);
      
      if (!tableExists) {
        console.log(`Creating ${table.name} table...`);
        await table.createFn();
        console.log(`${table.name} table created`);
      }
    }
  } catch (error) {
    console.error('Error creating service-specific tables:', error);
    throw error;
  }
};

// ============= BACKGROUND CHECKS TABLES =============

const createBackgroundChecksTable = async () => {
  try {
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
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes for common query patterns
        CREATE INDEX idx_background_checks_id_passport_number ON background_checks(id_passport_number);
        CREATE INDEX idx_background_checks_status ON background_checks(status);
        CREATE INDEX idx_background_checks_submitted_date ON background_checks(submitted_date);
      `);
      console.log('Background_checks table created');
    }
  } catch (error) {
    console.error('Error creating background checks table:', error);
    throw error;
  }
};


// ============= INTERNSHIP TABLES =============

const createInternshipsTable = async () => {
  try {
    const tableExists = await checkTableExists('internships');
    
    if (!tableExists) {
      console.log('Creating internships table...');
      await query(`
        CREATE TABLE IF NOT EXISTS internships (
          id SERIAL PRIMARY KEY,
          full_names VARCHAR(255) NOT NULL,
          citizenship VARCHAR(100) NOT NULL,
          id_passport_number VARCHAR(100) UNIQUE NOT NULL,
          passport_expiry_date DATE,
          department_id INTEGER,
          department_name VARCHAR(255),
          work_with VARCHAR(255),
          contact_number VARCHAR(50),
          date_start DATE NOT NULL,
          date_end DATE NOT NULL,
          additional_info TEXT,
          status VARCHAR(50) DEFAULT 'Active',
          created_by VARCHAR(100),
          updated_by VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
  
    }
      console.log('Internships table created successfully');
    } catch (error) {
      console.error('Error creating internships table:', error);
    throw error;
    }
  };


// ============= STAKEHOLDER REQUEST TABLES =============

const createStakeholderRequestsTable = async () => {
  try {
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
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes for common query patterns
        CREATE INDEX idx_stakeholder_requests_status ON stakeholder_requests(status);
        CREATE INDEX idx_stakeholder_requests_date_received ON stakeholder_requests(date_received);
        CREATE INDEX idx_stakeholder_requests_reference_number ON stakeholder_requests(reference_number);
      `);
      console.log('Stakeholder_requests table created');
    }
  } catch (error) {
    console.error('Error creating stakeholder requests table:', error);
    throw error;
  }
};

// ============= GUARDSHIFT REPORT TABLES =============

const createGuardShiftReportsTable = async () => {
  try {
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
          created_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes for common query patterns
        CREATE INDEX idx_guard_shift_reports_shift_date ON guard_shift_reports(shift_date);
        CREATE INDEX idx_guard_shift_reports_location ON guard_shift_reports(location);
        CREATE INDEX idx_guard_shift_reports_has_incident ON guard_shift_reports(has_incident);
      `);
      console.log('Guard_shift_reports table created');
    }
  } catch (error) {
    console.error('Error creating guard shift reports table:', error);
    throw error;
  }
};

// Add this function after createRequestCommentsTable
const createCommentReactionsTable = async () => {
  try {
    const tableExists = await checkTableExists('comment_reactions');
    
    if (!tableExists) {
      console.log('Creating comment_reactions table...');
      await query(`
        CREATE TABLE comment_reactions (
          id SERIAL PRIMARY KEY,
          comment_id INTEGER NOT NULL REFERENCES request_comments(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(comment_id, user_id)
        );
        
        -- Add indexes for common query patterns
        CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
        CREATE INDEX idx_comment_reactions_user_id ON comment_reactions(user_id);
      `);
      console.log('comment_reactions table created');
    }
  } catch (error) {
    console.error('Error creating comment reactions table:', error);
    throw error;
  }
};
