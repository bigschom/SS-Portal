// src/utils/constants.js
// Request status constants
export const REQUEST_STATUS = {
    NEW: 'new',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    RESOLVED: 'resolved',
    REOPENED: 'reopened',
    PENDING_INVESTIGATION: 'pending_investigation',
    UNABLE_TO_HANDLE: 'unable_to_handle',
    SENT_BACK: 'sent_back'
  };
  
  // Status configurations for visual elements
  export const STATUS_CONFIG = {
    [REQUEST_STATUS.NEW]: {
      icon: 'CircleDot',
      label: 'New',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-500',
      iconColor: 'text-blue-600'
    },
    [REQUEST_STATUS.IN_PROGRESS]: {
      icon: 'Clock',
      label: 'In Progress',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-500',
      iconColor: 'text-yellow-600'
    },
    [REQUEST_STATUS.COMPLETED]: {
      icon: 'CheckCircle2',
      label: 'Completed',
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-500',
      iconColor: 'text-green-600'
    },
    [REQUEST_STATUS.PENDING_INVESTIGATION]: {
      icon: 'HourglassIcon',
      label: 'Under Investigation',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-500',
      iconColor: 'text-purple-600'
    },
    [REQUEST_STATUS.UNABLE_TO_HANDLE]: {
      icon: 'XCircle',
      label: 'Unable to Handle',
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-500',
      iconColor: 'text-red-600'
    },
    [REQUEST_STATUS.SENT_BACK]: {
      icon: 'RotateCcw',
      label: 'Sent Back',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-500',
      iconColor: 'text-amber-600'
    },
    [REQUEST_STATUS.RESOLVED]: {
      icon: 'CheckCircle2',
      label: 'Resolved',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-500',
      iconColor: 'text-emerald-600'
    },
    [REQUEST_STATUS.REOPENED]: {
      icon: 'FileEdit',
      label: 'Reopened',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-500',
      iconColor: 'text-orange-600'
    }
  };
  
  // Service types
  export const SERVICE_TYPES = {
    REQUEST_SERIAL_NUMBER: 'request_serial_number',
    CHECK_STOLEN_PHONE: 'check_stolen_phone',
    CALL_HISTORY: 'call_history',
    UNBLOCK_CALL: 'unblock_call',
    MOMO_TRANSACTION: 'momo_transaction',
    UNBLOCK_MOMO: 'unblock_momo',
    MONEY_REFUND: 'money_refund',
    AGENT_COMMISSION: 'agent_commission',
    BACKOFFICE_APPOINTMENT: 'backoffice_appointment',
    INTERNET_ISSUE: 'internet_issue',
    REQUEST_FOLLOWUP: 'request_followup'
  };
  
  // Service categories
  export const SERVICE_CATEGORIES = {
    PHONE: 'phone',
    MOMO: 'momo',
    OTHER: 'other'
  };
  
  // Map service types to categories
  export const SERVICE_TYPE_CATEGORIES = {
    [SERVICE_TYPES.REQUEST_SERIAL_NUMBER]: SERVICE_CATEGORIES.PHONE,
    [SERVICE_TYPES.CHECK_STOLEN_PHONE]: SERVICE_CATEGORIES.PHONE,
    [SERVICE_TYPES.CALL_HISTORY]: SERVICE_CATEGORIES.PHONE,
    [SERVICE_TYPES.UNBLOCK_CALL]: SERVICE_CATEGORIES.PHONE,
    [SERVICE_TYPES.MOMO_TRANSACTION]: SERVICE_CATEGORIES.MOMO,
    [SERVICE_TYPES.UNBLOCK_MOMO]: SERVICE_CATEGORIES.MOMO,
    [SERVICE_TYPES.MONEY_REFUND]: SERVICE_CATEGORIES.MOMO,
    [SERVICE_TYPES.AGENT_COMMISSION]: SERVICE_CATEGORIES.OTHER,
    [SERVICE_TYPES.BACKOFFICE_APPOINTMENT]: SERVICE_CATEGORIES.OTHER,
    [SERVICE_TYPES.INTERNET_ISSUE]: SERVICE_CATEGORIES.OTHER,
    [SERVICE_TYPES.REQUEST_FOLLOWUP]: SERVICE_CATEGORIES.OTHER
  };
  
  // Priority levels
  export const PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  };
  
  // Notification types
  export const NOTIFICATION_TYPES = {
    NEW_REQUEST: 'new_request',
    STATUS_CHANGE: 'status_change',
    ASSIGNMENT: 'assignment',
    COMMENT: 'comment',
    REMINDER: 'reminder'
  };
  
  // Form validation patterns
  export const VALIDATION_PATTERNS = {
    PHONE: /^07\d{8}$/,
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    ID_NUMBER: /^\d{16}$/,
    REFERENCE_NUMBER: /^SR\d{6}\d{3}$/
  };
  
  // SMS service configuration (commented out for future implementation)
  /* export const SMS_CONFIG = {
    API_KEY: process.env.SMS_API_KEY || "",
    SENDER_ID: process.env.SMS_SENDER_ID || "SECURITY",
    BASE_URL: process.env.SMS_API_URL || "https://api.sms-provider.com"
  }; */