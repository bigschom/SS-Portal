// src/pages/security-services/components/services/BackofficeAppointment.jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Loader2, ArrowLeft, XCircle, Plus } from 'lucide-react';
import { useToast, ToastProvider, ToastViewport } from '../../../../components/ui/toast';
import apiService from '../../../../config/api-service';

const BackofficeAppointment = ({ onBack }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form configuration with react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      full_names: '',
      id_passport: '',
      primary_contact: '',
      secondary_contact: '',
      backoffice_user: '',
      preferred_date: '',
      preferred_time: '',
      details: ''
    }
  });

  // Fetch backoffice users state
  const [backofficeUsers, setBackofficeUsers] = useState([]);

  // Fetch backoffice users
  useEffect(() => {
    const getBackofficeUsers = async () => {
      try {
        const users = await apiService.securityServices.fetchBackofficeUsers();
        
        // Check if users is an array or has a data property
        const userList = users.data || users;
        
        setBackofficeUsers(Array.isArray(userList) ? userList : []);
      } catch (error) {
        console.error('Error fetching backoffice users:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load backoffice users"
        });
      }
    };

    getBackofficeUsers();
  }, [toast]);

  // Form submission handler
  const onSubmit = async (formData) => {
    setIsLoading(true);
    try {
      // Prepare request data
      const requestData = {
        full_names: formData.full_names,
        id_passport: formData.id_passport,
        primary_contact: formData.primary_contact,
        secondary_contact: formData.secondary_contact || null,
        details: formData.details || null,
        created_by: null // Remove user-specific creation
      };
      
      // Prepare appointment data
      const appointmentData = [{
        backoffice_user_id: formData.backoffice_user,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time
      }];
      
      // Submit backoffice appointment
      const response = await apiService.securityServices.submitBackofficeAppointment(
        requestData, 
        appointmentData
      );
      
      // Check if response contains a reference number
      const referenceNumber = response.referenceNumber || 'N/A';
      
      toast({
        title: "Success",
        description: `Backoffice Appointment submitted successfully! Reference: ${referenceNumber}`
      });
      
      reset();
      setTimeout(() => onBack(), 3000);
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit request. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
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
                        {...register('full_names', { required: 'Full name is required' })}
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

                    {/* ID/Passport Input */}
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

                    {/* Primary Contact Input */}
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

                    {/* Secondary Contact Input (Optional) */}
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
                {/* Backoffice User Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
                >
                  <h2 className="text-xl font-semibold mb-4 dark:text-white">
                    Select Backoffice User <span className="text-red-500">*</span>
                  </h2>
                  
                  <select
                    {...register('backoffice_user', { required: 'Please select a backoffice user' })}
                    className={`w-full px-4 py-2 rounded-lg border 
                               ${errors.backoffice_user ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                               bg-white dark:bg-gray-800 dark:text-white
                               focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                  >
                    <option value="">Select a user</option>
                    {backofficeUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.fullname}
                      </option>
                    ))}
                  </select>
                  {errors.backoffice_user && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                      {errors.backoffice_user.message}
                    </p>
                  )}
                </motion.div>

                {/* Appointment Date and Time */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
                >
                  <h2 className="text-xl font-semibold mb-4 dark:text-white">
                    Appointment Details
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Preferred Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('preferred_date', {
                          required: 'Preferred date is required'
                        })}
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-2 rounded-lg border 
                                   ${errors.preferred_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                   bg-white dark:bg-gray-800 dark:text-white
                                   focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                      />
                      {errors.preferred_date && (
                        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                          {errors.preferred_date.message}
                        </p>
                      )}
                    </div>

                    {/* Preferred Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('preferred_time', {
                          required: 'Preferred time is required'
                        })}
                        type="time"
                        className={`w-full px-4 py-2 rounded-lg border 
                                   ${errors.preferred_time ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                   bg-white dark:bg-gray-800 dark:text-white
                                   focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                      />
                      {errors.preferred_time && (
                        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                          {errors.preferred_time.message}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Additional Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
                >
                  <h2 className="text-xl font-semibold mb-4 dark:text-white">
                    Additional Details
                  </h2>
                  <textarea
                    {...register('details', { required: 'Please provide additional details' })}
                    rows={4}
                    placeholder="Please provide any additional information that might help with your request"
                    className={`w-full px-4 py-2 rounded-lg border ${errors.details ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                    bg-white dark:bg-gray-800 dark:text-white
                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
                    min-h-[100px]`}
                  />
                  {errors.details && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                      {errors.details.message}
                    </p>
                  )}
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
            </div>
          </form>
        </div>
        <ToastViewport />
      </div>
    </ToastProvider>
  );
};

export default BackofficeAppointment;