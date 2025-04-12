import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, XCircle, Save, Loader2, ArrowLeft, Camera } from 'lucide-react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';

// Alert/Popup Component (from the VisitorForm style)
const Alert = ({ message, type = 'error', onClose }) => (
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

const SerialNumberRequest = ({ onBack }) => {
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
      phoneRequests: [
        {
          phone_number: '',
          phone_brand: '',
          start_date: '',
          end_date: ''
        }
      ],
      details: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "phoneRequests"
  });

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
          service_type: 'request_serial_number',
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

      // Insert phone requests
      if (formData.phoneRequests?.length) {
        const phoneRequests = formData.phoneRequests.map(request => ({
          request_id: requestData.id,
          phone_number: request.phone_number,
          phone_brand: request.phone_brand,
          start_date: request.start_date,
          end_date: request.end_date
        }));

        const { error: phonesError } = await supabase
          .from('request_phone_numbers')
          .insert(phoneRequests);

        if (phonesError) throw phonesError;
      }

      // Create history record
      await supabase
        .from('request_history')
        .insert({
          request_id: requestData.id,
          action: 'created',
          status_from: null,
          status_to: 'new',
          performed_by: user.id,
          details: 'Request created'
        });

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
  // If success, navigate back
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
            <h1 className="text-2xl font-semibold">Request Serial Number</h1>

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
                      {...register('primary_contact', { required: 'Primary contact is required' })}
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
                      maxLength={50}
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

            {/* Right Panel - Phone Requests */}
            <div className="lg:col-span-8 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Fill the information below</h2>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div 
                      key={field.id} 
                      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 relative"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <input
                            {...register(`phoneRequests.${index}.phone_number`, { 
                              required: 'Phone number is required' 
                            })}
                            type="tel"
                            maxLength={10}
                            placeholder="Phone Number"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                     bg-white dark:bg-gray-800 dark:text-white
                                     focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                          />
                        </div>

                        <div>
                          <select
                            {...register(`phoneRequests.${index}.phone_brand`, { 
                              required: 'Phone brand is required' 
                            })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                     bg-white dark:bg-gray-800 dark:text-white
                                     focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                          >
                            <option value="">Select Phone Brand</option>
                            {['Airtel Imagine', 'Asus (ROG, Zenfone)', 'BlackBerry', 'Google (Pixel)', 'Honor', 'HTC', 'Huawei', 'iPhone', 'Infinix', 'Itel', 'Lenovo', 'LG', 'Micromax', 'Motorola', 'MTN Ikosora', 'MTN Taci', 'Nokia', 'OnePlus', 'Oppo', 'Realme', 'Samsung', 'Sony', 'Techno', 'Vivo', 'Xiaomi', 'ZTE', 'Unlisted'].map(brand => (
                              <option key={brand} value={brand.toLowerCase()}>
                                {brand}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Period <span className="text-red-500">*</span>
                      </label>
                          <input
                            {...register(`phoneRequests.${index}.start_date`, { 
                              required: 'Start date is required' 
                            })}
                            type="date"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                     bg-white dark:bg-gray-800 dark:text-white
                                     focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                          />
                        </div>

                        <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End Period <span className="text-red-500">*</span>
                      </label>
                          <input
                            {...register(`phoneRequests.${index}.end_date`, { 
                              required: 'End date is required' 
                            })}
                            type="date"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                     bg-white dark:bg-gray-800 dark:text-white
                                     focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                          />
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
                      phone_number: '',
                      phone_brand: '',
                      start_date: '',
                      end_date: ''
                    })}
                    className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                             transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    <span>Add Another Phone Request</span>
                  </button>
                </div>
              </motion.div>

              {/* Additional Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Additional Details</h2>
                <textarea
                  {...register('details')}
                  rows={4}
                  placeholder="Any additional information (optional)"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                           bg-white dark:bg-gray-800 dark:text-white
                           focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
                           min-h-[100px]"
                />
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
                      Please ensure that the customer is requesting serial numbers 
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

export default SerialNumberRequest;
