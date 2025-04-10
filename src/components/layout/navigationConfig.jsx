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
  CheckSquare
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
      name: 'Background Checks',
      icon: Shield,
      children: [
        {
          name: 'New Request',
          path: '/new-request',
          icon: FileCheck
        },
        {
          name: 'Intership Overview',
          path: '/internshipoverview',
          icon: Briefcase
        },
        {
          name: 'All Request',
          path: '/all-background-checks',
          icon: List
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
          name: 'All Request',
          path: '/all-stake-holder-request',
          icon: List
        },
      ]
    },

    {
      name: 'Reports',
      icon: BarChart3,
      children: [
        { name: 'StakeHolder Request Report', path: '/stakeholderreport', icon: FileText },
        { name: 'Backgroung Checks Report', path: '/backgroundcheckreport', icon: FileText },
      ]
    },
    {
      name: 'UpComing',
      icon: Calendar,
      children: [
        { name: 'Equipment Movement Log book', path: '/stakeholderreport', icon: Wrench },
        { name: 'Cleaner Profile Book', path: '/backgroundcheckreport', icon: BookOpen },
        { name: 'Security Technical Issue Book', path: '/GuardShiftReport', icon: Bell },
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
          name: 'Security Services',
          icon: Lock,
          children: [
            {
              name: 'New Request',
              path: '/#',
              icon: FileCheck
            },
            {
              name: 'Tasks',    
              path: '//#',
              icon: CheckSquare
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
    },
    {
      name: 'Reports',
      icon: BarChart3,
      children: [
        { name: 'Guard Shift Report', path: '/GuardShiftReport', icon: FileText }
      ]
    }
  ],
  standarduser: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    },
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
    { name: 'Backgroung Checks Report', path: '/backgroundcheckreport', icon: FileText },
  ],
  security_guard: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    }
  ],
  user: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    },
  ],

  user1: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    },
  ],

  user2: [
    { 
      name: 'Dashboard', 
      path: '/userdashboard', 
      icon: Home 
    }
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
