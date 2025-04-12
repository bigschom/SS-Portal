import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, XCircle, Save, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';

// Alert/Popup Component (from the VisitorForm style)
const Alert = ({ message, type = 'error', onClose, onConfirm }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg
      ${type === 'success' 
        ? 'bg-black text-white dark:bg-white dark:text-black' 
        : 'bg-red-500 text-white'
      }
      transition-colors duration-300`}
  >
    <div className="flex items-center space-x-4">
      <span>{message}</span>
      {onConfirm && (
        <div className="flex space-x-2">
          <button 
            onClick={onConfirm} 
            className="px-3 py-1 bg-white/30 hover:bg-white/40 rounded-lg"
          >
            Confirm
          </button>
          <button 
            onClick={onClose} 
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}
      {!onConfirm && (
        <button 
          onClick={onClose} 
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg"
        >
          Close
        </button>
      )}
    </div>
  </motion.div>
);

const UnblockCallRequest = ({ onBack }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [alertConfirmAction, setAlertConfirmAction] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      full_names: '',
      id_passport: '',
      primary_contact: '',
      secondary_contact: '',
      phoneNumbers: [{
        number: '',
        date_blocked: '',
        reason_blocked: ''
      }],
      details: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "phoneNumbers"
  });

  // Show success alert
  const showSuccessAlert = (message) => {
    setAlertMessage(message);
    setAlertType('success');
    setShowAlert(true);
    setAlertConfirmAction(() => () => {
      setShowAlert(false);
      onBack();
    });
  };

  // Show error alert
  const showErrorAlert = (message) => {
    setAlertMessage(message);
    setAlertType('error');
    setShowAlert(true);
    setAlertConfirmAction(null);

    // Automatically remove alert after 3 seconds
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const onSubmit = async (formData) => {
    setIsLoading(true);
    try {
      // Generate reference number
      const today = new Date();
      const dateStr = today.toISOString().slice(2,10).replace(/-/g,'');
      const { data: lastRequest } = await supabase
        .from('service_requests')
        .select('reference_number')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const lastSeq = lastRequest?.[0] ? parseInt(lastRequest[0].reference_number.slice(-3)) : 0;
      const newSeq = (lastSeq + 1).toString().padStart(3, '0');
      const referenceNumber = `SR${dateStr}${newSeq}`;
      
      // Create main service request
      const { data: requestData, error: requestError } = await supabase
        .from('service_requests')
        .insert({
          reference_number: referenceNumber,
          service_type: 'unblock_call',
          status: 'new',
          priority: 'normal',
          full_names: formData.full_names,
          id_passport: formData.id_passport,
          primary_contact: formData.primary_contact,
          secondary_contact: formData.secondary_contact || null,
          details: formData.details,
          created_by: user.id
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Insert phone numbers to unblock
      if (formData.phoneNumbers?.length) {
        const phoneRequests = formData.phoneNumbers.map(item => ({
          request_id: requestData.id,
          phone_number: item.number,
          date_blocked: item.date_blocked || null,
          reason_blocked: item.reason_blocked || null
        }));

        const { error: phoneError } = await supabase
          .from('request_blocked_numbers')
          .insert(phoneRequests);

        if (phoneError) throw phoneError;
      }

      showSuccessAlert(`Request submitted successfully! Reference: ${referenceNumber}`);
      reset();
    } catch (error) {
      console.error('Submission error:', error);
      showErrorAlert('Error submitting request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Close alert handler
  const handleCloseAlert = () => {
    setShowAlert(false);
    if (alertConfirmAction) {
      alertConfirmAction();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative">
      {/* Alert Popup */}
      <AnimatePresence>
        {showAlert && (
          <Alert 
            message={alertMessage} 
            type={alertType}
            onClose={handleCloseAlert}
            onConfirm={alertConfirmAction ? handleCloseAlert : null}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header with back button */}
        <div className="flex items-center space-x-3 mb-6">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Unblock Number Request</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Request to unblock numbers for calling
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Panel - User Information */}
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

                {/* Personal Information */}
                <div className="space-y-4">
                  <div>
                    <input
                      {...register('full_names', { required: 'Full names are required' })}
                      type="text"
                      placeholder="Full Names"
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.full_names ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                    />
                    {errors.full_names && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.full_names.message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      {...register('id_passport', { 
                        required: 'ID/Passport is required',
                        maxLength: {
                          value: 16,
                          message: 'ID/Passport cannot exceed 16 characters'
                        }
                      })}
                      type="text"
                      maxLength={16}
                      placeholder="ID/Passport Number"
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.id_passport ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                    />
                    {errors.id_passport && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.id_passport.message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      {...register('primary_contact', { 
                        required: 'Primary contact is required',
                        pattern: {
                          value: /^\d{10}$/,
                          message: 'Please enter a valid 10-digit phone number'
                        }
                      })}
                      type="tel"
                      maxLength={10}
                      placeholder="Primary Contact"
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.primary_contact ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                    />
                    {errors.primary_contact && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.primary_contact.message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      {...register('secondary_contact')}
                      type="tel"
                      maxLength={10}
                      placeholder="Secondary Contact (Optional)"
                      className={`w-full px-4 py-2 rounded-lg border 
                                border-gray-200 dark:border-gray-600
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Panel - Blocked Numbers */}
            <div className="lg:col-span-8 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Numbers to Unblock</h2>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div 
                      key={field.id} 
                      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 relative"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <input
                            {...register(`phoneNumbers.${index}.number`, {
                              required: 'Phone number is required',
                              pattern: {
                                value: /^\d{10}$/,
                                message: 'Please enter a valid 10-digit phone number'
                              }
                            })}
                            type="tel"
                            maxLength={10}
                            placeholder="Phone Number"
                            className={`w-full px-4 py-2 rounded-lg border 
                                      ${errors.phoneNumbers?.[index]?.number ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                      bg-white dark:bg-gray-800 dark:text-white
                                      focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                          />
                          {errors.phoneNumbers?.[index]?.number && (
                            <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                              {errors.phoneNumbers[index].number.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <input
                            {...register(`phoneNumbers.${index}.date_blocked`)}
                            type="date"
                            placeholder="Date Blocked (if known)"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                     bg-white dark:bg-gray-800 dark:text-white
                                     focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                          />
                        </div>

                        <div>
                          <select
                            {...register(`phoneNumbers.${index}.reason_blocked`)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                     bg-white dark:bg-gray-800 dark:text-white
                                     focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                          >
                            <option value="">Reason for Blocking</option>
                            <option value="unpaid_bills">Unpaid Bills</option>
                            <option value="fraud_concern">Fraud Case</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </div>
                      </div>
                      
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="absolute -top-3 -right-3 p-1 bg-white dark:bg-gray-700 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => append({
                      number: '',
                      date_blocked: '',
                      reason_blocked: ''
                    })}
                    className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                             transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    <span>Add Another Number</span>
                  </button>
                </div>
              </motion.div>

              {/* Additional Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">
                  Additional Details <span className="text-red-500">*</span>
                </h2>
                <textarea
                  {...register('details', { required: 'Please provide details about your request' })}
                  rows={4}
                  placeholder="Please explain why you need these numbers unblocked and provide any additional information that might help with your request"
                  className={`w-full px-4 py-2 rounded-lg border 
                             ${errors.details ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                             bg-white dark:bg-gray-800 dark:text-white
                             focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
                             min-h-[100px]`}
                />
                {errors.details && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.details.message}</p>
                )}
              </motion.div>

                            {/* Important Note */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <svg className="w-5 h-5 text-blue-700 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-300">Important Note</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Please ensure that the customer is requesting the sim card unblock 
                      for phone numbers registered under their name. Whenever possible, verify that the provided 
                      phone numbers are registered to the customer's identity. This is required for security 
                      purposes and to protect our customers' privacy.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Form Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end space-x-4 pt-4"
              >
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnblockCallRequest;
