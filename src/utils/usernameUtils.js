// src/utils/usernameUtils.js

/**
 * Generate a username based on full name
 * @param {string} fullName - Full name of the user
 * @returns {string} Generated username
 */
export const generateUsername = (fullName) => {
    // Remove any extra whitespace and split the name
    const nameParts = fullName.trim().split(/\s+/);
    
    // Take first 6 characters of the first part (last name)
    const lastNamePart = nameParts[nameParts.length - 1]
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .slice(0, 6);
    
    // Take first character of the first part (first name)
    const firstNameInitial = nameParts[0]
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .charAt(0);
    
    // Combine parts
    return `${lastNamePart}${firstNameInitial}`;
  };
  
  /**
   * Validate if a username is unique
   * @param {string} username - Username to check
   * @returns {Promise<boolean>} True if username is unique, false otherwise
   */
  export const isUsernameUnique = async (username) => {
    try {
      // Assuming you have an API service method to check username uniqueness
      const response = await apiService.users.checkUsernameUnique(username);
      return response.isUnique;
    } catch (error) {
      console.error('Error checking username uniqueness:', error);
      return false;
    }
  };
  
  /**
   * Generate a unique username
   * @param {string} fullName - Full name of the user
   * @returns {Promise<string>} Unique username
   */
  export const generateUniqueUsername = async (fullName) => {
    let baseUsername = generateUsername(fullName);
    let counter = 1;
    let uniqueUsername = baseUsername;
  
    while (!(await isUsernameUnique(uniqueUsername))) {
      uniqueUsername = `${baseUsername}${counter}`;
      counter++;
    }
  
    return uniqueUsername;
  };