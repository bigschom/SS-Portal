export const getRoleBasedDashboard = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return '/admindashboard';
      case 'superuser':
        return '/securityguarddashboard';
      case 'standarduser':
        return '/supervisordashboard';
      case 'user':
      case 'user1':
      case 'user2': 
        return '/userdashboard';
      case 'manager':
        return '/managerdashboard';
      default:
        return '/unauthorized';
    }
  };