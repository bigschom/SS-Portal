// src/pages/security-services/components/services/MoneyRefundRequest.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, XCircle, Save, Loader2, Plus } from 'lucide-react';
import { useToast, ToastProvider, ToastViewport } from '../../../../components/ui/toast';
import apiService from '../../../../config/api-service';

const MoneyRefundRequest = ({ onBack, serviceType }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    full_names: '',
    id_passport: '',
    primary_contact: '',
    secondary_contact: '',
    details: ''
  });

  // Refund requests state
  const [refundRequests, setRefundRequests] = useState([
    { 
      phone_number: '', 
      recipient_number: '', 
      amount: '', 
      transaction_date: '', 
      reason: '' 
    }
  ]);

  // Form errors state
  const [formErrors, setFormErrors] = useState({});

  // Handle input changes for main form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear the specific error when user starts typing
    if (formErrors[name]) {
      const newErrors = { ...formErrors };
      delete newErrors[name];
      setFormErrors(newErrors);
    }
  };

  // Handle input changes for refund requests
  const handleRefundRequestChange = (index, field, value) => {
    const updatedRequests = [...refundRequests];
    updatedRequests[index][field] = value;
    setRefundRequests(updatedRequests);
    
    // Clear specific error
    const errorKey = `refundRequests.${index}.${field}`;
    if (formErrors[errorKey]) {
      const newErrors = { ...formErrors };
      delete newErrors[errorKey];
      setFormErrors(newErrors);
    }
  };

  // Add another refund request
  const addRefundRequest = () => {
    setRefundRequests([
      ...refundRequests, 
      { 
        phone_number: '', 
        recipient_number: '', 
        amount: '', 
        transaction_date: '', 
        reason: '' 
      }
    ]);
  };

  // Remove a refund request
  const removeRefundRequest = (index) => {
    if (refundRequests.length > 1) {
      const updatedRequests = [...refundRequests];
      updatedRequests.splice(index, 1);
      setRefundRequests(updatedRequests);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    const phoneRegex = /^07\d{8}$/;

    // Validate personal information
    if (!formData.full_names) {
      errors.full_names = 'Full name is required';
    }

    if (!formData.id_passport) {
      errors.id_passport = 'ID number is required';
    }

    if (!formData.primary_contact) {
      errors.primary_contact = 'Primary contact is required';
    } else if (!phoneRegex.test(formData.primary_contact)) {
      errors.primary_contact = 'Enter a valid phone number (07XXXXXXXX)';
    }

    // Validate refund requests
    refundRequests.forEach((request, index) => {
      if (!request.phone_number) {
        errors[`refundRequests.${index}.phone_number`] = 'Sender phone number is required';
      } else if (!/^\d{10,50}$/.test(request.phone_number)) {
        errors[`refundRequests.${index}.phone_number`] = 'Enter a valid phone or account number';
      }

      if (!request.recipient_number) {
        errors[`refundRequests.${index}.recipient_number`] = 'Recipient phone number is required';
      } else if (!/^\d{10}$/.test(request.recipient_number)) {
        errors[`refundRequests.${index}.recipient_number`] = 'Enter a valid 10-digit phone number';
      }

      if (!request.amount) {
        errors[`refundRequests.${index}.amount`] = 'Amount is required';
      } else if (isNaN(parseFloat(request.amount)) || parseFloat(request.amount) <= 0) {
        errors[`refundRequests.${index}.amount`] = 'Enter a valid amount';
      }

      if (!request.transaction_date) {
        errors[`refundRequests.${index}.transaction_date`] = 'Transaction date is required';
      }

      if (!request.reason) {
        errors[`refundRequests.${index}.reason`] = 'Reason for refund is required';
      }
    });

    // Require additional details
    if (!formData.details) {
      errors.details = 'Please provide details about your refund request';
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill all required fields correctly."
      });
      return;
    }
  
    try {
      setIsLoading(true);
      
      const result = await apiService.securityServices.submitMoneyRefundRequest({
        formData,
        refundRequests,
        serviceType,
        userId: null // Set to null as we're not using authentication in this version
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setReferenceNumber(result.referenceNumber);
      setIsSuccess(true);
      
      toast({
        title: "Success",
        description: "Your MoMo Reversal Request has been submitted successfully."
      });
      
    } catch (error) {
      console.error('Error submitting request:', error);
      
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Failed to submit your request. Please try again."
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form for a new request
  const handleNewRequest = () => {
    setFormData({
      full_names: '',
      id_passport: '',
      primary_contact: '',
      secondary_contact: '',
      details: '',
    });
    setRefundRequests([
      { 
        phone_number: '', 
        recipient_number: '', 
        amount: '', 
        transaction_date: '', 
        reason: '' 
      }
    ]);
    setFormErrors({});
    setIsSuccess(false);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header with back button */}
          <div className="flex items-center space-x-3 mb-6">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">MoMo Reversal Request</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Request for MoMo Reversal
              </p>
            </div>
          </div>
          
          {!isSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Panel - Personal Information */}
                <div className="lg:col-span-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-6"
                  >
                    {/* Photo Section */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                          <svg
                            className="w-20 h-20"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Personal Information Fields */}
                    <div className="space-y-4">
                      {/* Full Name Input */}
                      <div>
                        <input
                          name="full_names"
                          value={formData.full_names}
                          onChange={handleChange}
                          placeholder="Full Names"
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${formErrors.full_names ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                        />
                        {formErrors.full_names && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                            {formErrors.full_names}
                          </p>
                        )}
                      </div>

                      {/* ID/Passport Input */}
                      <div>
                        <input
                          name="id_passport"
                          value={formData.id_passport}
                          onChange={handleChange}
                          placeholder="ID Number"
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${formErrors.id_passport ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                        />
                        {formErrors.id_passport && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                            {formErrors.id_passport}
                          </p>
                        )}
                      </div>

                      {/* Primary Contact Input */}
                      <div>
                        <input
                          name="primary_contact"
                          value={formData.primary_contact}
                          onChange={handleChange}
                          placeholder="Primary Contact (07XXXXXXXX)"
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${formErrors.primary_contact ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                        />
                        {formErrors.primary_contact && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                            {formErrors.primary_contact}
                          </p>
                        )}
                      </div>

                      {/* Secondary Contact Input */}
                      <div>
                        <input
                          name="secondary_contact"
                          value={formData.secondary_contact}
                          onChange={handleChange}
                          placeholder="Secondary Contact (Optional)"
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Right Panel - Refund Requests */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Refund Requests Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
                  >
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">
                      Refund Requests
                    </h2>
                    
                    {refundRequests.map((request, index) => (
                      <div 
                        key={index} 
                        className="mb-4 border border-gray-200 dark:border-gray-700 rounded-xl p-4 relative"
                      >
                        {refundRequests.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRefundRequest(index)}
                            className="absolute top-2 right-2 p-1 rounded-full 
                                       hover:bg-gray-100 dark:hover:bg-gray-700 
                                       transition-colors text-gray-500 dark:text-gray-400"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Sender Phone/Account Number Input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Sender Phone/Account Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              value={request.phone_number}
                              onChange={(e) => handleRefundRequestChange(index, 'phone_number', e.target.value)}
                              placeholder="Phone or Account Number"
                              className={`w-full px-4 py-2 rounded-lg border 
                                        ${formErrors[`refundRequests.${index}.phone_number`] 
                                          ? 'border-red-500' 
                                          : 'border-gray-200 dark:border-gray-600'}
                                        bg-white dark:bg-gray-800 dark:text-white
                                        focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                            />
                            {formErrors[`refundRequests.${index}.phone_number`] && (
                              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                                {formErrors[`refundRequests.${index}.phone_number`]}
                              </p>
                            )}
                          </div>

                          {/* Recipient Phone Number Input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Recipient Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              value={request.recipient_number}
                              onChange={(e) => handleRefundRequestChange(index, 'recipient_number', e.target.value)}
                              placeholder="07XXXXXXXX"
                              className={`w-full px-4 py-2 rounded-lg border 
                                        ${formErrors[`refundRequests.${index}.recipient_number`] 
                                          ? 'border-red-500' 
                                          : 'border-gray-200 dark:border-gray-600'}
                                        bg-white dark:bg-gray-800 dark:text-white
                                        focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                            />
                            {formErrors[`refundRequests.${index}.recipient_number`] && (
                              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                                {formErrors[`refundRequests.${index}.recipient_number`]}
                              </p>
                            )}
                          </div>

                          {/* Amount Input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={request.amount}
                              onChange={(e) => handleRefundRequestChange(index, 'amount', e.target.value)}
                              placeholder="Enter amount"
                              step="0.01"
                              className={`w-full px-4 py-2 rounded-lg border 
                                        ${formErrors[`refundRequests.${index}.amount`] 
                                          ? 'border-red-500' 
                                          : 'border-gray-200 dark:border-gray-600'}
                                        bg-white dark:bg-gray-800 dark:text-white
                                        focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                            />
                            {formErrors[`refundRequests.${index}.amount`] && (
                              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                                {formErrors[`refundRequests.${index}.amount`]}
                              </p>
                            )}
                          </div>

                          {/* Transaction Date Input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Transaction Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={request.transaction_date}
                              onChange={(e) => handleRefundRequestChange(index, 'transaction_date', e.target.value)}
                              className={`w-full px-4 py-2 rounded-lg border 
                                        ${formErrors[`refundRequests.${index}.transaction_date`] 
                                          ? 'border-red-500' 
                                          : 'border-gray-200 dark:border-gray-600'}
                                        bg-white dark:bg-gray-800 dark:text-white
                                        focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                            />
                            {formErrors[`refundRequests.${index}.transaction_date`] && (
                              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                                {formErrors[`refundRequests.${index}.transaction_date`]}
                              </p>
                            )}
                          </div>

                          {/* Reason for Refund Input */}
                          <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Reason for Refund <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={request.reason}
                              onChange={(e) => handleRefundRequestChange(index, 'reason', e.target.value)}
                              className={`w-full px-4 py-2 rounded-lg border 
                                        ${formErrors[`refundRequests.${index}.reason`] 
                                          ? 'border-red-500' 
                                          : 'border-gray-200 dark:border-gray-600'}
                                        bg-white dark:bg-gray-800 dark:text-white
                                        focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                            >
                              <option value="">Select Reason for Refund</option>
                              <option value="wrong_recipient">Sent to Wrong Person</option>
                              <option value="transaction_failed">Transaction Failed but Money Deducted</option>
                              <option value="duplicate_transaction">Duplicate Transaction</option>
                              <option value="service_not_received">Service/Product Not Received</option>
                              <option value="fraud">Fraudulent Transaction</option>
                              <option value="other">Other (Please Specify in Details)</option>
                            </select>
                            {formErrors[`refundRequests.${index}.reason`] && (
                              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                                {formErrors[`refundRequests.${index}.reason`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Another Request Button */}
                    <button
                      type="button"
                      onClick={addRefundRequest}
                      className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl
                                 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                                 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      <span>Add Another Refund Request</span>
                    </button>
                  </motion.div>

                  {/* Additional Details Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
                  >
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">
                      Additional Details
                    </h2>
                    <textarea
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Provide more context about your refund request"
                      className={`w-full px-4 py-2 rounded-lg border 
                                 ${formErrors.details ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                 bg-white dark:bg-gray-800 dark:text-white
                                 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
                                 min-h-[100px]`}
                    />
                    {formErrors.details && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                        {formErrors.details}
                      </p>
                    )}
                  </motion.div>

                  {/* Important Note */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-blue-800 dark:text-blue-300"
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium">Important Note</h3>
                        <div className="mt-2 text-sm">
                          <p>
                            Please ensure you provide accurate transaction details. 
                            Refund requests are processed based on transaction verification. 
                            Have transaction proof or screenshots ready if requested.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Form Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end space-x-4 pt-4"
                  >
                    {/* Cancel Button */}
                    <button
                      type="button"
                      onClick={onBack}
                      disabled={isLoading}
                      className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                               text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700
                               transition-colors duration-200
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>

                    {/* Submit Button with Loading State */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 rounded-lg bg-black dark:bg-white 
                               text-white dark:text-black
                               hover:bg-gray-800 dark:hover:bg-gray-200 
                               transition-colors duration-200
                               disabled:opacity-50 disabled:cursor-not-allowed
                               flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <motion.div
                            className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          <span>Submit Request</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Save className="w-8 h-8 text-green-600 dark:text-green-300" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Request Submitted Successfully!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Your MoMo Reversal Request has been submitted with reference number: 
                <span className="font-medium text-gray-900 dark:text-white ml-2">
                  {referenceNumber}
                </span>
              </p>
              <div className="space-x-4">
                <button
                  onClick={onBack}
                  className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                           text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700
                           transition-colors duration-200"
                >
                  Back to Services
                </button>
                <button
                  onClick={handleNewRequest}
                  className="px-6 py-2 rounded-lg bg-black dark:bg-white 
                           text-white dark:text-black
                           hover:bg-gray-800 dark:hover:bg-gray-200 
                           transition-colors duration-200"
                >
                  New Request
                </button>
              </div>
            </motion.div>
          )}
        </div>
        <ToastViewport />
      </div>
    </ToastProvider>
  );
};

export default MoneyRefundRequest;