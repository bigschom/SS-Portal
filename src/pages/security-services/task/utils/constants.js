// Request status codes
export const REQUEST_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  PENDING_INVESTIGATION: 'pending_investigation',
  COMPLETED: 'completed',
  SENT_BACK: 'sent_back',
  UNABLE_TO_HANDLE: 'unable_to_handle'
};

// Status configuration (for visual styling, etc.)
export const STATUS_CONFIG = {
  [REQUEST_STATUS.NEW]: { 
    label: 'New', 
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    darkBgColor: 'dark:bg-blue-900/20',
    darkTextColor: 'dark:text-blue-300',
    border: 'border-l-blue-500'
  },
  [REQUEST_STATUS.IN_PROGRESS]: { 
    label: 'In Progress', 
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    darkBgColor: 'dark:bg-yellow-900/20',
    darkTextColor: 'dark:text-yellow-300',
    border: 'border-l-yellow-500'
  },
  [REQUEST_STATUS.PENDING_INVESTIGATION]: { 
    label: 'Pending Investigation', 
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    darkBgColor: 'dark:bg-orange-900/20',
    darkTextColor: 'dark:text-orange-300',
    border: 'border-l-orange-500'
  },
  [REQUEST_STATUS.COMPLETED]: { 
    label: 'Completed', 
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    darkBgColor: 'dark:bg-green-900/20',
    darkTextColor: 'dark:text-green-300',
    border: 'border-l-green-500'
  },
  [REQUEST_STATUS.SENT_BACK]: { 
    label: 'Sent Back', 
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    darkBgColor: 'dark:bg-red-900/20',
    darkTextColor: 'dark:text-red-300',
    border: 'border-l-red-500'
  },
  [REQUEST_STATUS.UNABLE_TO_HANDLE]: { 
    label: 'Unable to Handle', 
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200',
    darkBgColor: 'dark:bg-gray-900/40',
    darkTextColor: 'dark:text-gray-300',
    border: 'border-l-gray-500'
  }
};

// Permissions
export const PERMISSIONS = {
  MANAGE_HANDLERS: '/security_services/manage_handlers',
  TASK_PAGE: '/security_services/task_page'
};

// Request types - extend as needed for your specific service types
export const REQUEST_TYPES = {
  PHONE_NUMBER: 'phone_number',
  MOMO_NUMBER: 'momo_number',
  CALL_HISTORY: 'call_history',
  IMEI_NUMBER: 'imei_number',
  BLOCKED_NUMBER: 'blocked_number',
  INTERNET_ISSUES: 'internet_issues',
  REFUND: 'refund',
  REQUEST_SERIAL_NUMBER: 'request_serial_number'
};

// Timeout settings
export const TIMEOUT = {
  AUTO_RETURN_MS: 30 * 60 * 1000, // 30 minutes in milliseconds
  WARNING_THRESHOLD_MINUTES: 5 // Show warning when 5 minutes or less remaining
};
