import { 
  Home, 
  Users, 
  Shield, 
  FileCheck, 
  Briefcase, 
  AlertTriangle, 
  Lock, 
  BarChart3, 
  Calendar, 
  Upload, 
  Search, 
  ClipboardList, 
  Bell, 
  Bookmark,
  Wrench,
  FileText,
  List,
  BookOpen,
  CheckSquare,
  Trash2,
  SquareGantt,
  PlusCircle,
  XCircle,
  Database
} from 'lucide-react';

export const roleBasedNavigation = {
  admin: [
    { 
      name: 'Dashboard', 
      path: '/admindashboard', 
      icon: Home 
    },

    {
      name: 'User Management',
      path: '/user-management',
      icon: Users
    },

    { 
      name: 'Guard Shift Report', 
      path: '/guard-shift', 
      icon: ClipboardList
    },

    {
      name: 'Background Checks',
      icon: Shield,
      children: [
        {
          name: 'New Request',
          path: '/new-request',
          icon: FileCheck
        },
        {
          name: 'Delete Requests',
          path: '/delete-background-checks',
          icon: Trash2
        },
        {
          name: 'All Request',
          path: '/all-background-checks',
          icon: List
        },
      ]
    },

    {
      name: 'Intership Checks',
      icon: SquareGantt,
      children: [
        {
          name: 'Intership Overview',
          path: '/internship-overview',
          icon: ClipboardList
        },
        {
          name: 'New Request',
          path: '/new-internship-request',
          icon: PlusCircle
        },
        {
          name: 'Delete Requests',
          path: '/delete-internship-checks',
          icon: XCircle
        },
        {
          name: 'All Internship',
          path: '/all-Internship-checks',
          icon: Database
        },
      ]
    },

    {
      name: 'Stake Holder request',
      icon: Users,
      children: [
        {
          name: 'New Request',
          path: '/new-stake-holder-request',
          icon: FileCheck
        },
        {
          name: 'Delete Requests',
          path: '/delete-stake-holder-requests',
          icon: Trash2
        },
        {
          name: 'All Request',
          path: '/all-stake-holder-request',
          icon: List
        },
      ]
    },

    {
      name: 'Security Services',
      icon: Lock,
      children: [
        {
          name: 'Service Dashboard',
          path: '/security-services/dashboard-page',
          icon: FileCheck
        },
        {
          name: 'Service Management',
          path: '/security-services/service-management',
          icon: FileCheck
        },
        {
          name: 'Service Queue Management',
          path: '/security-services/queue-management',
          icon: FileCheck
        },
        {
          name: 'New Request',
          path: '/security-services/new-request',
          icon: FileCheck
        },
        {
          name: 'Tasks',    
          path: '/security-services/task',
          icon: CheckSquare
        },
      ]
    },
    { name: 'Equipment Movement Log book', path: '/equipment-movement', icon: Wrench },
    //{ name: 'Cleaner Profile Book', path: '/cleaner-profile-book', icon: BookOpen },
    //{ name: 'Security Technical Issue Book', path: '/security-issue-book', icon: Bell },
    //{ name: 'Tecnician Site Book', path: '/security-technician-fill-page', icon: Bell },

    {
      name: 'Reports',
      icon: BarChart3,
      children: [
        { name: 'StakeHolder Request Report', path: '/stakeholderreport', icon: FileText },
        { name: 'Backgroung Checks Report', path: '/backgroundcheckreport', icon: FileText },
        { name: 'Internship Report', path: '/internship-report', icon: FileText },
        { name: 'Guard Shift Daily Report', path: '/guard-shift-report', icon: FileText },
        { name: 'Guard Shift Analytics Report', path: '/guard-shift-report-1', icon: FileText },
        {name: 'Equipment Movement Report', path: '/equipment-movement-report', icon: FileText },
        {name: 'Security Services Report', path: '/security-services/security-services-report', icon: FileText }
      ]
    },
    {
      name: 'UpComing',
      icon: Calendar,
      children: [
        
        

        {
          name: 'Fraud Case',
          icon: AlertTriangle,
          children: [
            {
              name: 'Upload Page',
              path: '/#',
              icon: Upload
            },
            {
              name: 'Search Page',    
              path: '/#',
              icon: Search
            },
          ]
        },
        {
          name: 'Reports',
          icon: BarChart3,
          children: [
            { name: 'Security Services Report', path: '/#', icon: FileText },
          ]
        }
      ]
    },
  ],
  superuser: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    }
  ],
  standarduser: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    },
    { name: 'Guard Shift Report', 
      icon: FileText,
      children: [
        { name: 'Guard Shift Daily Report', path: '/guard-shift-report', icon: FileText },
        { name: 'Guard Shift Analytics Report', path: '/guard-shift-report-1', icon: FileText },

      ]
    },
    {
      name: 'Security Services',
      icon: Lock,
      children: [
        {
          name: 'New Request',
          path: '/security-services/new-request',
          icon: FileCheck
        },
        {
          name: 'Tasks',    
          path: '/security-services/task',
          icon: CheckSquare
        },
      ]
    },
  ],
  security_guard: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    },
    { 
      name: 'Guard Shift Report', 
      path: '/guard-shift', 
      icon: ClipboardList
    },
    {
      name: 'Intership Overview',
      path: '/internship-overview',
      icon: ClipboardList
    },
    { name: 'Equipment Movement Log book', 
      path: '/equipment-movement', 
      icon: Wrench 
    },
    {
      name: 'Security Services',
      icon: Lock,
      children: [
        {
          name: 'New Request',
          path: '/security-services/new-request',
          icon: FileCheck
        },
        {
          name: 'Tasks',    
          path: '/security-services/task',
          icon: CheckSquare
        },
      ]
    },
  ],
  user: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    },
    
    {
      name: 'Security Services',
      icon: Lock,
      children: [
        {
          name: 'New Request',
          path: '/security-services/new-request',
          icon: FileCheck
        },
        {
          name: 'Tasks',    
          path: '/security-services/task',
          icon: CheckSquare
        },
      ]
    },
  ],

  user1: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    },
    {
      name: 'Background Checks',
      icon: Shield,
      children: [
        {
          name: 'New Request',
          path: '/new-request',
          icon: FileCheck
        },
        {
          name: 'All Request',
          path: '/all-background-checks',
          icon: List
        },
      ]
    },
    {
      name: 'Security Services',
      icon: Lock,
      children: [
        {
          name: 'New Request',
          path: '/security-services/new-request',
          icon: FileCheck
        },
        {
          name: 'Tasks',    
          path: '/security-services/task',
          icon: CheckSquare
        },
      ]
    },

    {
      name: 'Reports',
      icon: BarChart3,
      children: [
        { name: 'Backgroung Checks Report', path: '/backgroundcheckreport', icon: FileText },
      ]
    },
  ],

  user2: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    },
    {
      name: 'Stake Holder request',
      icon: Users,
      children: [
        {
          name: 'New Request',
          path: '/new-stake-holder-request',
          icon: FileCheck
        },
        {
          name: 'All Request',
          path: '/all-stake-holder-request',
          icon: List
        },
      ]
    },
    {
      name: 'Security Services',
      icon: Lock,
      children: [
        {
          name: 'New Request',
          path: '/security-services/new-request',
          icon: FileCheck
        },
        {
          name: 'Tasks',    
          path: '/security-services/task',
          icon: CheckSquare
        },
      ]
    },

    {
      name: 'Reports',
      icon: BarChart3,
      children: [
        { name: 'StakeHolder Request Report', path: '/stakeholderreport', icon: FileText },
      ]
    },
  ]
};

// Also update the getRoleDisplayName function in Header.js
export const getRoleDisplayName = (role) => {
  switch(role) {
    case 'admin':
      return 'Administrator';
    case 'superuser':
      return 'superuser';
    case 'standarduser':
      return 'standarduser';
    case 'security_guard':
      return 'Security Guard';
    case 'user':
      return 'User';
    case 'user1':
      return 'User Level 1';
    case 'user2':
      return 'User Level 2';
    default:
      return role;
  }
};
