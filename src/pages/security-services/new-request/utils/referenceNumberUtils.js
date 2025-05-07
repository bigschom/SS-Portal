// src/pages/security-services/new-request/utilsreferenceNumberUtils.js

/**
 * Generates a reference number in the format SSR-YEAR-SEQUENTIAL NUMBER
 * Example: SSR-2025-001
 * @param {number} sequentialNumber - The sequential number to use
 * @returns {string} - The formatted reference number
 */
export const generateReferenceNumber = (sequentialNumber) => {
  const now = new Date();
  const year = now.getFullYear();
  const sequence = String(sequentialNumber).padStart(3, '0');
  
  return `SSR-${year}-${sequence}`;
};

/**
* Gets the next sequential number from existing reference numbers
* @param {Array} existingReferenceNumbers - Array of existing reference numbers
* @returns {number} - The next sequential number
*/
export const getNextSequentialNumber = (existingReferenceNumbers) => {
  if (!existingReferenceNumbers || existingReferenceNumbers.length === 0) {
    return 1;
  }
  
  // Get current year
  const now = new Date();
  const year = now.getFullYear();
  const yearStr = year.toString();
  
  // Filter reference numbers for current year
  const thisYearsReferenceNumbers = existingReferenceNumbers.filter(refNum => {
    // Extract year part from SSR-2025-001 format
    const yearPartOfRefNum = refNum.split('-')[1];
    return yearPartOfRefNum === yearStr;
  });
  
  if (thisYearsReferenceNumbers.length === 0) {
    return 1;
  }
  
  // Extract the sequential numbers and find the maximum
  const sequentialNumbers = thisYearsReferenceNumbers.map(refNum => {
    // Extract sequence part (after the second dash)
    const parts = refNum.split('-');
    if (parts.length < 3) return 0;
    
    const sequencePart = parts[2];
    return parseInt(sequencePart, 10);
  });
  
  const maxSequentialNumber = Math.max(...sequentialNumbers);
  return maxSequentialNumber + 1;
};