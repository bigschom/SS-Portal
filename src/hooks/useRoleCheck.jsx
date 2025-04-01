import { useAuth } from '../../hooks/useAuth';

/**
 * Custom hook for checking user role-based access permissions
 * @returns {Object} - Object with methods for checking role-based permissions
 */
const useRoleCheck = () => {
  const { user } = useAuth();

  /**
   * Check if current user has the admin role
   * @returns {boolean} - True if user is an admin
   */
  const isAdmin = () => {
    if (!user) return false;
    return user.role === 'admin';
  };

  /**
   * Check if current user has the manager role
   * @returns {boolean} - True if user is a manager
   */
  const isSuperUser = () => {
    if (!user) return false;
    return user.role === 'superuser';
  };

  /**
   * Check if current user has the supervisor role
   * @returns {boolean} - True if user is a supervisor
   */
  const isStandardUser = () => {
    if (!user) return false;
    return user.role === 'standarduser';
  };

  /**
   * Check if current user has the security guard role
   * @returns {boolean} - True if user is a security guard
   */
  const isSecurityGuard = () => {
    if (!user) return false;
    return user.role === 'security_guard';
  };

  /**
   * Check if current user has the basic user role
   * @returns {boolean} - True if user has the basic user role
   */
  const isBasicUser = () => {
    if (!user) return false;
    return user.role === 'user';
  };

  /**
   * Check if current user has the user1 role
   * @returns {boolean} - True if user has the user1 role
   */
  const isUser1 = () => {
    if (!user) return false;
    return user.role === 'user1';
  };

  /**
   * Check if current user has the user2 role
   * @returns {boolean} - True if user has the user2 role
   */
  const isUser2 = () => {
    if (!user) return false;
    return user.role === 'user2';
  };

  /**
   * Check if the user has any type of user role (basic, user1, or user2)
   * @returns {boolean} - True if user has any of the user roles
   */
  const isAnyUserRole = () => {
    return isBasicUser() || isUser1() || isUser2();
  };

  /**
   * Check if the user has any of the specified roles
   * @param {Array<string>} roles - Array of roles to check
   * @returns {boolean} - True if user has any of the specified roles
   */
  const hasAnyRole = (roles) => {
    if (!user || !roles || !Array.isArray(roles)) return false;
    return roles.includes(user.role);
  };

  /**
   * Check if the user has permission level equal to or higher than the specified role
   * @param {string} minimumRole - Minimum role required
   * @returns {boolean} - True if user has sufficient permission
   */
  const hasMinimumRole = (minimumRole) => {
    if (!user) return false;
    
    const roleHierarchy = {
      'admin': 7,
      'superuser': 6,
      'standarduser': 5,
      'security_guard': 4,
      'user': 3,
      'user1': 2,
      'user2': 1
    };
    
    const userRoleValue = roleHierarchy[user.role] || 0;
    const requiredRoleValue = roleHierarchy[minimumRole] || 0;
    
    return userRoleValue >= requiredRoleValue;
  };

  /**
   * Check if the user can manage users (admin only)
   * @returns {boolean} - True if user can manage users
   */
  const canManageUsers = () => {
    return isAdmin();
  };

  /**
   * Check if the user can manage security personnel (admin and manager)
   * @returns {boolean} - True if user can manage security personnel
   */
  const canManageSecurityPersonnel = () => {
    return isAdmin() || isSuperUser();
  };

  /**
   * Check if the user can generate reports (admin, manager, supervisor)
   * @returns {boolean} - True if user can generate reports
   */
  const canGenerateReports = () => {
    return isAdmin() || isSuperUser() || isSupervisor();
  };

  /**
   * Check if the user can view all security incidents
   * @returns {boolean} - True if user can view all security incidents
   */
  const canViewAllIncidents = () => {
    return isAdmin() || isSuperUser() || isSupervisor();
  };

  /**
   * Check if the user can only view their assigned incidents
   * @returns {boolean} - True if user is restricted to viewing assigned incidents
   */
  const canOnlyViewAssignedIncidents = () => {
    return isSecurityGuard() || isBasicUser() || isUser1() || isUser2();
  };

  /**
   * Check if the user can upload supporting documents
   * @returns {boolean} - True if user can upload documents
   */
  const canUploadDocuments = () => {
    return true; // All users can upload documents
  };

  /**
   * Check if the user can access system configuration
   * @returns {boolean} - True if user can access system configuration
   */
  const canAccessSystemConfig = () => {
    return isAdmin();
  };

  /**
   * Check if the user can approve access requests
   * @returns {boolean} - True if user can approve access requests
   */
  const canApproveAccessRequests = () => {
    return isAdmin() || isSuperUser();
  };

  /**
   * Check if the user can perform account operations (password resets, etc.)
   * @returns {boolean} - True if user can perform account operations
   */
  const canPerformAccountOperations = () => {
    return isAdmin();
  };

  return {
    isAdmin,
    isSuperUser,
    isStandardUser,
    isSecurityGuard,
    isBasicUser,
    isUser1,
    isUser2,
    isAnyUserRole,
    hasAnyRole,
    hasMinimumRole,
    canManageUsers,
    canManageSecurityPersonnel,
    canGenerateReports,
    canViewAllIncidents,
    canOnlyViewAssignedIncidents,
    canUploadDocuments,
    canAccessSystemConfig,
    canApproveAccessRequests,
    canPerformAccountOperations
  };
};

export default useRoleCheck;