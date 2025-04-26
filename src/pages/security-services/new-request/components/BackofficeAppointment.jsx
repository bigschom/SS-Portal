import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '../../../../components/ui/card';
import { useToast } from '../../../../components/ui/use-toast';
import { useFormContext } from '../context/FormContext';
import { useAuth } from '../../../../hooks/useAuth';
import apiService from '../../../../config/api-service';

const BackofficeAppointment = ({ onBack, serviceType }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    formData, 
    updateFormData, 
    formErrors, 
    updateFormErrors, 
    clearErrors,
    isSubmitting,
    setIsSubmitting,
    hasError,
    getErrorMessage,
  } = useFormContext();
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [backofficeUsers, setBackofficeUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingError, setLoadingError] = useState(null);

  // Fetch backoffice users
  useEffect(() => {
    const fetchBackofficeUsers = async () => {
      try {
        setLoadingUsers(true);
        setLoadingError(null);
        
        const result = await apiService.users.getBackofficeUsers();
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        setBackofficeUsers(result.users || []);
      } catch (error) {
        console.error('Error fetching backoffice users:', error);
        setLoadingError('Failed to load available staff. Please try again later.');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchBackofficeUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    
    if (hasError(name)) {
      clearErrors([name]);
    }
  };

  const validateForm = () => {
    const errors = {};
    const phoneRegex = /^07\d{8}$/;
    const today = new Date().toISOString().split('T')[0];

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

    if (!formData.backoffice_user) {
      errors.backoffice_user = 'Staff member is required';
    }

    if (!formData.reason) {
      errors.reason = 'Reason for appointment is required';
    }

    if (!formData.preferred_date) {
      errors.preferred_date = 'Preferred date is required';
    } else if (new Date(formData.preferred_date) < new Date(today)) {
      errors.preferred_date = 'Date cannot be in the past';
    }

    if (!formData.preferred_time) {
      errors.preferred_time = 'Preferred time is required';
    }

    // Require additional details
    if (!formData.details) {
      errors.details = 'Please provide details about your appointment request';
    }

    updateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill all required fields correctly.",
      });
      return;
    }
  
    try {
      setIsSubmitting(true);
      
      const result = await apiService.securityServices.submitBackofficeAppointment({
        formData,
        serviceType,
        userId: user.id
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setReferenceNumber(result.referenceNumber);
      setIsSuccess(true);
      
      toast({
        variant: "success",
        title: "Request Submitted",
        description: "Your backoffice appointment request has been submitted successfully.",
      });
      
    } catch (error) {
      console.error('Error submitting request:', error);
      
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Failed to submit your request. Please try again.",
      });
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewRequest = () => {
    updateFormData({
      full_names: '',
      id_passport: '',
      primary_contact: '',
      secondary_contact: '',
      backoffice_user: '',
      preferred_date: '',
      preferred_time: '',
      reason: '',
      details: '',
    });
    clearErrors();
    setIsSuccess(false);
  };
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="mb-6 text-gray-600 dark:text-gray-300"
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Services
        </Button>

        {!isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-xl text-gray-900 dark:text-white">Backoffice Appointment</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      Schedule a meeting with backoffice team
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <form id="backoffice-appointment-form" onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    {/* Personal Information Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Information</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="full_names">
                            Full Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="full_names"
                            name="full_names"
                            value={formData.full_names || ''}
                            onChange={handleChange}
                            className={hasError('full_names') ? 'border-red-500 dark:border-red-800' : ''}
                            disabled={isSubmitting}
                          />
                          {hasError('full_names') && (
                            <p className="text-sm text-red-500">{getErrorMessage('full_names')}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="id_passport">
                            ID Number <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="id_passport"
                            name="id_passport"
                            value={formData.id_passport || ''}
                            onChange={handleChange}
                            className={hasError('id_passport') ? 'border-red-500 dark:border-red-800' : ''}
                            disabled={isSubmitting}
                          />
                          {hasError('id_passport') && (
                            <p className="text-sm text-red-500">{getErrorMessage('id_passport')}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="primary_contact">
                            Primary Contact <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="primary_contact"
                            name="primary_contact"
                            placeholder="07XXXXXXXX"
                            value={formData.primary_contact || ''}
                            onChange={handleChange}
                            className={hasError('primary_contact') ? 'border-red-500 dark:border-red-800' : ''}
                            disabled={isSubmitting}
                          />
                          {hasError('primary_contact') && (
                            <p className="text-sm text-red-500">{getErrorMessage('primary_contact')}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="secondary_contact">
                            Secondary Contact
                          </Label>
                          <Input
                            id="secondary_contact"
                            name="secondary_contact"
                            placeholder="07XXXXXXXX (Optional)"
                            value={formData.secondary_contact || ''}
                            onChange={handleChange}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Appointment Details Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Appointment Details</h3>
                      
                      {loadingError ? (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-4">
                          {loadingError}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="backoffice_user">
                              Select Staff Member <span className="text-red-500">*</span>
                            </Label>
                            <select
                              id="backoffice_user"
                              name="backoffice_user"
                              value={formData.backoffice_user || ''}
                              onChange={handleChange}
                              disabled={loadingUsers || isSubmitting}
                              className={`w-full px-3 py-2 rounded-md border 
                                        ${hasError('backoffice_user') 
                                          ? 'border-red-500 dark:border-red-800' 
                                          : 'border-gray-200 dark:border-gray-700'}
                                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                                        focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                            >
                              <option value="">
                                {loadingUsers ? 'Loading staff members...' : 'Select a staff member'}
                              </option>
                              {backofficeUsers.map(staffMember => (
                                <option key={staffMember.id} value={staffMember.id}>
                                  {staffMember.fullname}
                                </option>
                              ))}
                            </select>
                            {hasError('backoffice_user') && (
                              <p className="text-sm text-red-500">{getErrorMessage('backoffice_user')}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reason">
                              Reason for Meeting <span className="text-red-500">*</span>
                            </Label>
                            <select
                              id="reason"
                              name="reason"
                              value={formData.reason || ''}
                              onChange={handleChange}
                              disabled={isSubmitting}
                              className={`w-full px-3 py-2 rounded-md border 
                                        ${hasError('reason') 
                                          ? 'border-red-500 dark:border-red-800' 
                                          : 'border-gray-200 dark:border-gray-700'}
                                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                                        focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                            >
                              <option value="">Select reason for appointment</option>
                              <option value="account_issue">Account Issue</option>
                              <option value="billing_problem">Billing Problem</option>
                              <option value="service_activation">Service Activation</option>
                              <option value="contract_renewal">Contract Renewal</option>
                              <option value="complaint">File a Complaint</option>
                              <option value="other">Other (Please specify in details)</option>
                            </select>
                            {hasError('reason') && (
                              <p className="text-sm text-red-500">{getErrorMessage('reason')}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="preferred_date">
                              Preferred Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="preferred_date"
                              type="date"
                              name="preferred_date"
                              min={new Date().toISOString().split('T')[0]}
                              value={formData.preferred_date || ''}
                              onChange={handleChange}
                              className={hasError('preferred_date') ? 'border-red-500 dark:border-red-800' : ''}
                              disabled={isSubmitting}
                            />
                            {hasError('preferred_date') && (
                              <p className="text-sm text-red-500">{getErrorMessage('preferred_date')}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="preferred_time">
                            Preferred Time <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="preferred_time"
                              type="time"
                              name="preferred_time"
                              value={formData.preferred_time || ''}
                              onChange={handleChange}
                              className={hasError('preferred_time') ? 'border-red-500 dark:border-red-800' : ''}
                              disabled={isSubmitting}
                            />
                            {hasError('preferred_time') && (
                              <p className="text-sm text-red-500">{getErrorMessage('preferred_time')}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Details Section */}
                    <div className="space-y-2">
                      <Label htmlFor="details">
                        Additional Details <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="details"
                        name="details"
                        rows={4}
                        placeholder="Provide more context about your appointment request"
                        value={formData.details || ''}
                        onChange={handleChange}
                        className={hasError('details') ? 'border-red-500 dark:border-red-800' : ''}
                        disabled={isSubmitting}
                      />
                      {hasError('details') && (
                        <p className="text-sm text-red-500">{getErrorMessage('details')}</p>
                      )}
                    </div>

                    {/* Important Note */}
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-blue-800 dark:text-blue-300">
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
                              Appointment requests are subject to staff availability. 
                              You will receive a confirmation once your appointment is scheduled. 
                              Please arrive 15 minutes before your scheduled time with proper identification.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
              
              <CardFooter className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isSubmitting || loadingUsers}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="backoffice-appointment-form"
                  disabled={isSubmitting || loadingUsers}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Submit Request
                </Button>
              </CardFooter>
            </Card>
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Request Submitted Successfully!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your backoffice appointment request has been submitted with reference number: <span className="font-medium text-gray-900 dark:text-white">{referenceNumber}</span>
            </p>
            <div className="space-x-4">
              <Button
                variant="outline"
                onClick={onBack}
                className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              >
                Back to Services
              </Button>
              <Button
                onClick={handleNewRequest}
                className="bg-black text-white dark:bg-white dark:text-black"
              >
                New Request
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BackofficeAppointment;