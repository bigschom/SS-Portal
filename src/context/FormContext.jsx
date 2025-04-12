// src/context/FormContext.jsx
import React, { createContext, useContext, useState } from 'react';

// Create context
const FormContext = createContext(undefined);

// Hook to use the form context
export const useFormContext = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

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

  // Clear form errors
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

  // Multi-step form navigation
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const initMultiStepForm = (steps) => {
    setTotalSteps(steps);
    setCurrentStep(1);
  };

  // Check if field has error
  const hasError = (field) => {
    return !!formErrors[field];
  };

  // Get error message
  const getErrorMessage = (field) => {
    return formErrors[field] || '';
  };

  // Generate reference number
  const generateReferenceNumber = (serviceType) => {
    const prefix = 'SR';
    const date = new Date();
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}${year}${month}${day}${random}`;
  };

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