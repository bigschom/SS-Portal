export const getRoleBasedDashboard = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return '/admindashboard';
      case 'superuser':
      case 'standarduser': 
      case 'security_guard':
      case 'user':
      case 'user1':
      case 'user2':
        return '/userdashboard';
      default:
        return '/unauthorized';
    }
  };