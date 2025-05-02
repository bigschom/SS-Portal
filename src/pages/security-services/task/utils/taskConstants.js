// src/pages/security-services/task/utils/taskConstants.js
import {
    Clock,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    HourglassIcon,
    XCircle,
    FileEdit,
    CircleDot
  } from 'lucide-react';
  
  export const REQUEST_STATUS = {
    NEW: 'new',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    PENDING_INVESTIGATION: 'pending_investigation',
    UNABLE_TO_HANDLE: 'unable_to_handle',
    SENT_BACK: 'sent_back'
  };
  
  export const STATUS_CONFIG = {
    [REQUEST_STATUS.NEW]: {
      icon: CircleDot,
      label: 'New',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-500',
      iconColor: 'text-blue-600'
    },
    [REQUEST_STATUS.IN_PROGRESS]: {
      icon: Clock,
      label: 'In Progress',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-500',
      iconColor: 'text-yellow-600'
    },
    [REQUEST_STATUS.COMPLETED]: {
      icon: CheckCircle2,
      label: 'Completed',
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-500',
      iconColor: 'text-green-600'
    },
    [REQUEST_STATUS.PENDING_INVESTIGATION]: {
      icon: HourglassIcon,
      label: 'Under Investigation',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-500',
      iconColor: 'text-purple-600'
    },
    [REQUEST_STATUS.UNABLE_TO_HANDLE]: {
      icon: XCircle,
      label: 'Unable to Handle',
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-500',
      iconColor: 'text-red-600'
    },
    [REQUEST_STATUS.SENT_BACK]: {
      icon: RotateCcw,
      label: 'Sent Back',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-500',
      iconColor: 'text-amber-600'
    }
  };
  
  export const SERVICE_TYPES = {
    REQUEST_SERIAL_NUMBER: 'request_serial_number',
    CHECK_STOLEN_PHONE: 'check_stolen_phone',
    CALL_HISTORY: 'call_history',
    UNBLOCK_CALL: 'unblock_call',
    UNBLOCK_MOMO: 'unblock_momo',
    MONEY_REFUND: 'money_refund',
    MOMO_TRANSACTION: 'momo_transaction',
    BACKOFFICE_APPOINTMENT: 'backoffice_appointment'
  };
  
  export const SERVICE_LABELS = {
    [SERVICE_TYPES.REQUEST_SERIAL_NUMBER]: 'Serial Number Request',
    [SERVICE_TYPES.CHECK_STOLEN_PHONE]: 'Stolen Phone Check',
    [SERVICE_TYPES.CALL_HISTORY]: 'Call History Request',
    [SERVICE_TYPES.UNBLOCK_CALL]: 'Unblock Call Request',
    [SERVICE_TYPES.UNBLOCK_MOMO]: 'Unblock MoMo Request',
    [SERVICE_TYPES.MONEY_REFUND]: 'Money Refund Request',
    [SERVICE_TYPES.MOMO_TRANSACTION]: 'MoMo Transaction History',
    [SERVICE_TYPES.BACKOFFICE_APPOINTMENT]: 'Backoffice Appointment'
  };
  
  export const TASK_EVENTS = {
    STATUS_CHANGE: 'status_change',
    COMMENT_ADDED: 'comment_added',
    REMINDER_DUE: 'reminder_due'
  };