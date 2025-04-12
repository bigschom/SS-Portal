import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';

// Alert/Popup Component
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
      <button 
        onClick={onClose} 
        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg"
      >
        OK
      </button>
    </div>
  </motion.div>
);

const BackofficeAppointment = ({ onBack }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [backofficeUsers, setBackofficeUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingError, setLoadingError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      full_names: '',
      id_passport: '',
      primary_contact: '',
      secondary_contact: '',
      backoffice_user: '',
      preferred_date: '',
      preferred_time: '',
      reason: '',
      details: ''
    }
  });

  // Fetch backoffice users
  useEffect(() => {
    const fetchBackofficeUsers = async () => {
      try {
        setLoadingUsers(true);
        setLoadingError(null);
        const { data, error } = await supabase
          .from('users')
          .select('id, fullname')
          .eq('status', 'active')
          .in('role', ['admin', 'backoffice'])
          .order('fullname');

        if (error) throw error;
        setBackofficeUsers(data || []);
      } catch (error) {
        console.error('Error fetching backoffice users:', error);
        setLoadingError('Failed to load available staff. Please try again later.');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchBackofficeUsers();
  }, []);

  // Show success alert
  const showSuccessAlert = (message) => {
    setAlertMessage(message);
    setAlertType('success');
    setShowAlert(true);
  };

  // Show error alert
  const showErrorAlert = (message) => {
    setAlertMessage(message);
    setAlertType('error');
    setShowAlert(true);
  };

  const onSubmit = async (formData) => {
    setIsLoading(true);
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
      const { data: lastRequest } = await supabase
        .from('service_requests')
        .select('reference_number')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastSeq = lastRequest?.[0] ? parseInt(lastRequest[0].reference_number.slice(-3)) : 0;
      const newSeq = (lastSeq + 1).toString().padStart(3, '0');
      const referenceNumber = `SR${dateStr}${newSeq}`;

      const { data: requestData, error: requestError } = await supabase
        .from('service_requests')
        .insert({
          reference_number: referenceNumber,
          service_type: 'backoffice_appointment',
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

      // Insert appointment details
      const { error: appointmentError } = await supabase
        .from('request_backoffice_appointments')
        .insert({
          request_id: requestData.id,
          backoffice_user_id: formData.backoffice_user,
          preferred_date: formData.preferred_date,
          preferred_time: formData.preferred_time,
          reason: formData.reason
        });

      if (appointmentError) throw appointmentError;

      showSuccessAlert(`Appointment request submitted successfully! Reference: ${referenceNumber}`);
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
    if (alertType === 'success') {
      onBack();
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
            <h1 className="text-2xl font-semibold">Backoffice Appointment</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Schedule a meeting with backoffice team
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

            {/* Right Panel - Appointment Details */}
            <div className="lg:col-span-8 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Appointment Details</h2>
                
                {loadingError ? (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-4">
                    {loadingError}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Select Staff Member <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register('backoffice_user', { required: 'Staff member is required' })}
                          disabled={loadingUsers}
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${errors.backoffice_user ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
                                    disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
                        >
                          <option value="">
                            {loadingUsers ? 'Loading staff members...' : 'Select a staff member'}
                          </option>
                          {backofficeUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.fullname}
                            </option>
                          ))}
                        </select>
                        {errors.backoffice_user && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.backoffice_user.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Reason for Meeting <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register('reason', { required: 'Reason is required' })}
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${errors.reason ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                        >
                          <option value="">Select reason for appointment</option>
                          <option value="account_issue">Account Issue</option>
                          <option value="billing_problem">Billing Problem</option>
                          <option value="service_activation">Service Activation</option>
                          <option value="contract_renewal">Contract Renewal</option>
                          <option value="complaint">File a Complaint</option>
                          <option value="other">Other (Please specify in details)</option>
                        </select>
                        {errors.reason && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.reason.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Preferred Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register('preferred_date', { required: 'Preferred date is required' })}
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${errors.preferred_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                        />
                        {errors.preferred_date && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.preferred_date.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Preferred Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register('preferred_time', { required: 'Preferred time is required' })}
                          type="time"
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${errors.preferred_time ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                        />
                        {errors.preferred_time && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.preferred_time.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                  {...register('details', { required: 'Please provide details about your appointment request' })}
                  rows={4}
                  placeholder="Please provide more details about why you need this appointment and any specific questions or issues you want to discuss"
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> Appointment requests are subject to staff availability. 
                      You will receive a confirmation once your appointment is scheduled. Please arrive 
                      15 minutes before your scheduled time with proper identification.
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
                  disabled={isLoading || loadingUsers}
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

export default BackofficeAppointment;
