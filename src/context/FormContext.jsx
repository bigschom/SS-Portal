// src/context/FormContext.jsx
import React, { createContext, useContext, useState } from 'react';

// Create the context
const FormContext = createContext(null);

// Form provider component with enhanced validation and error handling
export const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);
  const [formHistory, setFormHistory] = useState([]);

  // Update form data with tracking of changes
  const updateFormData = (newData) => {
    setFormData(prevData => {
      const updatedData = { ...prevData, ...newData };
      
      // Track form changes in history for potential rollback
      setFormHistory(prevHistory => [
        ...prevHistory,
        { timestamp: new Date(), data: prevData }
      ]);
      
      return updatedData;
    });
  };

  // Update form errors with more detailed message structure
  const updateFormErrors = (newErrors) => {
    setFormErrors(prevErrors => ({
      ...prevErrors,
      ...newErrors
    }));
  };

  // Clear form errors for specific fields
  const clearErrors = (fields) => {
    if (Array.isArray(fields)) {
      const newErrors = { ...formErrors };
      fields.forEach(field => {
        delete newErrors[field];
      });
      setFormErrors(newErrors);
    } else {
      setFormErrors({});
    }
  };

  // Reset form data with option to preserve specific fields
  const resetForm = (preserveFields = []) => {
    if (preserveFields.length > 0) {
      const preservedData = {};
      preserveFields.forEach(field => {
        if (formData[field] !== undefined) {
          preservedData[field] = formData[field];
        }
      });
      setFormData(preservedData);
    } else {
      setFormData({});
    }
    
    setFormErrors({});
    setCurrentStep(1);
    setFormHistory([]);
  };

  // Undo last form change
  const undoLastChange = () => {
    if (formHistory.length > 0) {
      const lastState = formHistory[formHistory.length - 1];
      setFormData(lastState.data);
      setFormHistory(prevHistory => prevHistory.slice(0, -1));
      return true;
    }
    return false;
  };

  // Multi-step form navigation with validation option
  const nextStep = (validateCurrentStep = true) => {
    if (validateCurrentStep) {
      // Check for errors in current step
      const hasErrors = Object.keys(formErrors).length > 0;
      if (hasErrors) {
        return false;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      return true;
    }
    return false;
  };

  // Move to previous step in multi-step form with option to save current data
  const prevStep = (saveCurrentData = true) => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      return true;
    }
    return false;
  };

  // Initialize multi-step form with validation structure
  const initMultiStepForm = (steps, initialData = {}) => {
    setTotalSteps(steps);
    setCurrentStep(1);
    setFormData(initialData);
    setFormErrors({});
    setFormHistory([]);
  };

  // Enhanced validation with detailed error tracking
  const validateField = (field, value, rules) => {
    let error = null;
    
    // Apply validation rules
    if (rules) {
      if (rules.required && (!value || value.trim() === '')) {
        error = `${field} is required`;
      } else if (rules.pattern && !rules.pattern.test(value)) {
        error = rules.message || `${field} is invalid`;
      } else if (rules.minLength && value.length < rules.minLength) {
        error = `${field} must be at least ${rules.minLength} characters`;
      } else if (rules.maxLength && value.length > rules.maxLength) {
        error = `${field} cannot exceed ${rules.maxLength} characters`;
      } else if (rules.custom && typeof rules.custom === 'function') {
        error = rules.custom(value);
      }
    }
    
    // Update errors state
    if (error) {
      updateFormErrors({ [field]: error });
      return false;
    } else {
      clearErrors([field]);
      return true;
    }
  };

  // Generate a reference number with improved uniqueness
  const generateReferenceNumber = (serviceType) => {
    const prefix = 'SR';
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}${year}${month}${day}-${timestamp}${randomDigits}`;
  };

  // Value object to be provided by context
  const value = {
    formData,
    formErrors,
    isSubmitting,
    currentStep,
    totalSteps,
    updateFormData,
    updateFormErrors,
    clearErrors,
    resetForm,
    nextStep,
    prevStep,
    initMultiStepForm,
    setIsSubmitting,
    undoLastChange,
    validateField,
    hasError: (field) => formErrors[field] ? true : false,
    getErrorMessage: (field) => formErrors[field] || '',
    generateReferenceNumber
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

// Custom hook to use the form context
export const useFormContext = () => {
  const context = useContext(FormContext);
  if (context === null) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

export default FormContext;