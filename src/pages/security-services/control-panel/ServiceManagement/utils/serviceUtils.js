
/**
 * Transform a service type string to a display format
 * @param {string} serviceType - The service type in snake_case
 * @returns {string} - The formatted display string
 */
export const formatServiceType = (serviceType) => {
  return serviceType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Calculate status of service assignments
 * @param {Array} assignedUsers - Array of user assignments
 * @returns {Object} - Assignment statistics
 */
export const getAssignmentStats = (assignedUsers) => {
  if (!assignedUsers) return { total: 0, active: 0 };
  
  return {
    total: assignedUsers.length,
    active: assignedUsers.filter(assignment => assignment.is_active).length
  };
};

/**
 * Format SLA hours into a human-readable string
 * @param {number} hours - Number of hours
 * @returns {string} - Formatted time string
 */
export const formatSLATime = (hours) => {
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  let result = `${days} day${days === 1 ? '' : 's'}`;
  if (remainingHours) {
    result += ` ${remainingHours} hour${remainingHours === 1 ? '' : 's'}`;
  }
  return result;
};

/**
 * Get the initial data structure for a new service
 * @returns {Object} - Initial service data
 */
export const getInitialServiceData = () => ({
  service_type: '',
  description: '',
  sla_hours: 24,
  is_visible: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
