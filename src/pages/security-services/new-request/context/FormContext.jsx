// src/pages/security-services/new-request/context/FormContext.jsx
import React, { createContext, useContext, useState } from 'react';

// Create the context
const FormContext = createContext();

// Hook to use the form context
export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

// Form provider component
export const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);

  // Update form data
  const updateFormData = (newData) => {
    setFormData(prevData => ({
      ...prevData,
      ...newData
    }));
  };

  // Update form errors
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

  // Reset form data
  const resetForm = () => {
    setFormData({});
    setFormErrors({});
    setCurrentStep(1);
  };

  // Move to next step in multi-step form
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Move to previous step in multi-step form
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Initialize multi-step form
  const initMultiStepForm = (steps) => {
    setTotalSteps(steps);
    setCurrentStep(1);
  };

  // Check if a field has an error
  const hasError = (field) => {
    return formErrors[field] ? true : false;
  };

  // Get error message for a field
  const getErrorMessage = (field) => {
    return formErrors[field] || '';
  };

  // Generate a reference number
  const generateReferenceNumber = (serviceType) => {
    const prefix = 'SR';
    const timestamp = Date.now().toString();
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp.substring(timestamp.length - 6)}${randomDigits}`;
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
    hasError,
    getErrorMessage,
    generateReferenceNumber
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

export default FormContext;