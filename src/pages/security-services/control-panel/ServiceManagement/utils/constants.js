import { 
  Phone, 
  Shield, 
  History, 
  PhoneCall,
  Wallet,
  Save,
  Users,
  Calendar,
  BadgeHelp,
  Wifi
} from 'lucide-react';

export const PREDEFINED_SERVICES = [
  { 
    id: 'request_serial_number',
    service_type: 'request_serial_number',
    label: 'Request Serial Number',
    description: 'Retrieve stolen phone serial number',
    sla_hours: 24,
    is_visible: true,
    category: 'phone',
    icon: Phone,
    color: 'blue'
  },
  { 
    id: 'check_stolen_phone',
    service_type: 'check_stolen_phone',
    label: 'Check Stolen Phone Status',
    description: 'Check status of stolen phones by IMEI',
    sla_hours: 24,
    is_visible: true,
    category: 'phone',
    icon: Shield,
    color: 'indigo'
  },
  { 
    id: 'call_history',
    service_type: 'call_history',
    label: 'Call History',
    description: 'Request detailed call history records',
    sla_hours: 48,
    is_visible: true,
    category: 'phone',
    icon: History,
    color: 'orange'
  },
  {
    id: 'unblock_call',
    service_type: 'unblock_call',
    label: 'Unblock Number',
    description: 'Request to unblock numbers for calling',
    sla_hours: 24,
    is_visible: true,
    category: 'phone',
    icon: PhoneCall,
    color: 'teal'
  },
  { 
    id: 'unblock_momo',
    service_type: 'unblock_momo',
    label: 'Unblock MoMo Account',
    description: 'Get assistance with unblocking MoMo',
    sla_hours: 24,
    is_visible: true,
    category: 'financial',
    icon: Wallet,
    color: 'green'
  },
  { 
    id: 'money_refund',
    service_type: 'money_refund',
    label: 'Money Refund',
    description: 'Request money refund for failed transactions',
    sla_hours: 48,
    is_visible: true,
    category: 'financial',
    icon: Save,
    color: 'yellow'
  },
  { 
    id: 'momo_transaction',
    service_type: 'momo_transaction',
    label: 'MoMo Transaction',
    description: 'View MoMo transaction details',
    sla_hours: 24,
    is_visible: true,
    category: 'financial',
    icon: Wallet,
    color: 'emerald'
  },
  { 
    id: 'agent_commission',
    service_type: 'agent_commission',
    label: 'Agent Commission',
    description: 'Request agent commission details',
    sla_hours: 24,
    is_visible: true,
    category: 'financial',
    icon: Users,
    color: 'cyan'
  },
  { 
    id: 'backoffice_appointment',
    service_type: 'backoffice_appointment',
    label: 'Backoffice Appointment',
    description: 'Schedule a meeting with backoffice team',
    sla_hours: 72,
    is_visible: true,
    category: 'other',
    icon: Calendar,
    color: 'purple'
  },
  { 
    id: 'rib_followup',
    service_type: 'rib_followup',
    label: 'RIB Request Followup',
    description: 'Track the status of your RIB request',
    sla_hours: 24,
    is_visible: true,
    category: 'other',
    icon: BadgeHelp,
    color: 'red'
  },
  { 
    id: 'internet_issue',
    service_type: 'internet_issue',
    label: 'Internet Issues',
    description: 'Report and resolve internet connectivity problems',
    sla_hours: 24,
    is_visible: true,
    category: 'other',
    icon: Wifi,
    color: 'sky'
  }
];

export const SERVICE_CATEGORIES = [
  { value: 'all', label: 'All Services' },
  { value: 'phone', label: 'Phone Services' },
  { value: 'financial', label: 'Financial Services' },
  { value: 'other', label: 'Other Services' }
];
