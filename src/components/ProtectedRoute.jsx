// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading, checkTokenExpiration } = useAuth();
  
  // Check if the token is expired
  const tokenExpired = checkTokenExpiration ? checkTokenExpiration() : false;
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a] dark:text-white" />
      </div>
    );
  }
  
  // If user is not logged in or token is expired, redirect to login
  if (!user || tokenExpired) {
    if (tokenExpired && window.toastService) {
      window.toastService.error('Your session has expired. Please log in again.');
    }
    return <Navigate to="/login" replace />;
  }
  
  // If a specific role or roles are required, check if the user has one of those roles
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    if (window.toastService) {
      window.toastService.warning("You don't have permission to access this page");
    }
    return <Navigate to="/unauthorized" replace />;
  }
  
  // If account is not active, redirect to login
  if (!user.is_active) {
    if (window.toastService) {
      window.toastService.error('Your account is inactive. Please contact an administrator.');
    }
    return <Navigate to="/login" replace />;
  }
  
  // If all checks pass, render the protected component
  return children;
};

export default ProtectedRoute;