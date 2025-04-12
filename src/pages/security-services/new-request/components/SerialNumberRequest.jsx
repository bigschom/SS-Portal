// src/pages/security-services/new-request/components/SerialNumberRequest.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Smartphone, Loader2, CheckCircle, Plus, X } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/db';

const SerialNumberRequest = ({ onBack, serviceType }) => {
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
    generateReferenceNumber
  } = useFormContext();
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [phoneRequests, setPhoneRequests] = useState([
    { phone_number: '', phone_brand: '', start_date: '', end_date: '' }
  ]);

  // Initialize form fields
  useEffect(() => {
    updateFormData({
      full_names: formData.full_names || '',
      id_passport: formData.id_passport || '',
      primary_contact: formData.primary_contact || '',
      secondary_contact: formData.secondary_contact || '',
      details: formData.details || '',
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    
    // Clear error when user types
    if (hasError(name)) {
      clearErrors([name]);
    }
  };

  const handlePhoneRequestChange = (index, field, value) => {
    const updatedRequests = [...phoneRequests];
    updatedRequests[index][field] = value;
    setPhoneRequests(updatedRequests);
    
    // Clear field-specific error if exists
    const errorKey = `phoneRequests.${index}.${field}`;
    if (hasError(errorKey)) {
      clearErrors([errorKey]);
    }
  };

  const addPhoneRequest = () => {
    setPhoneRequests([...phoneRequests, { phone_number: '', phone_brand: '', start_date: '', end_date: '' }]);
  };

  const removePhoneRequest = (index) => {
    if (phoneRequests.length > 1) {
      const updatedRequests = [...phoneRequests];
      updatedRequests.splice(index, 1);
      setPhoneRequests(updatedRequests);
    }
  };

  const validateForm = () => {
    const errors = {};
    const phoneRegex = /^07\d{8}$/;

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

    // Validate phone requests
    phoneRequests.forEach((request, index) => {
      if (!request.phone_number) {
        errors[`phoneRequests.${index}.phone_number`] = 'Phone number is required';
      } else if (!phoneRegex.test(request.phone_number)) {
        errors[`phoneRequests.${index}.phone_number`] = 'Enter a valid phone number (07XXXXXXXX)';
      }

      if (!request.phone_brand) {
        errors[`phoneRequests.${index}.phone_brand`] = 'Phone brand is required';
      }

      if (!request.start_date) {
        errors[`phoneRequests.${index}.start_date`] = 'Start date is required';
      }

      if (!request.end_date) {
        errors[`phoneRequests.${index}.end_date`] = 'End date is required';
      }
    });

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
      
      // Generate reference number
      const ref = generateReferenceNumber(serviceType);
      setReferenceNumber(ref);
      
      // Use a transaction to ensure all operations succeed or fail together
      await db.transaction(async (client) => {
        // Create main service request
        const { rows: [request] } = await client.query(`
          INSERT INTO service_requests (
            reference_number, service_type, status, created_by, 
            full_names, id_passport, primary_contact, secondary_contact, details, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING id
        `, [
          ref,
          serviceType,
          'new',
          user.id,
          formData.full_names,
          formData.id_passport,
          formData.primary_contact,
          formData.secondary_contact || null,
          formData.details || null
        ]);
        
        // Insert phone requests
        for (const phoneRequest of phoneRequests) {
          await client.query(`
            INSERT INTO request_phone_numbers (
              request_id, phone_number, phone_brand, start_date, end_date
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            request.id,
            phoneRequest.phone_number,
            phoneRequest.phone_brand,
            phoneRequest.start_date,
            phoneRequest.end_date
          ]);
        }
        
        // Create history record
        await client.query(`
          INSERT INTO request_history (
            request_id, action, status_from, status_to, performed_by, details
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          request.id,
          'created',
          null,
          'new',
          user.id,
          'Request created'
        ]);
      });
      
      // Show success state
      setIsSuccess(true);
      
      toast({
        variant: "success",
        title: "Request Submitted",
        description: "Your serial number request has been submitted successfully.",
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
    // Reset form data
    updateFormData({
      full_names: '',
      id_passport: '',
      primary_contact: '',
      secondary_contact: '',
      details: '',
    });
    setPhoneRequests([
      { phone_number: '', phone_brand: '', start_date: '', end_date: '' }
    ]);
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
                  <Smartphone className="h-6 w-6 text-blue-500" />
                  <div>
                    <CardTitle className="text-xl text-gray-900 dark:text-white">Request Serial Number</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      Request for device IMEI or SIM card serial number
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <form id="serial-number-form" onSubmit={handleSubmit}>
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

                    {/* Phone Requests Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Phone Information</h3>
                      
                      {phoneRequests.map((request, index) => (
                        <div 
                          key={index}
                          className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative"
                        >
                          {phoneRequests.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                              onClick={() => removePhoneRequest(index)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          )}
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>
                                Phone Number <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                placeholder="07XXXXXXXX"
                                value={request.phone_number}
                                onChange={(e) => handlePhoneRequestChange(index, 'phone_number', e.target.value)}
                                className={hasError(`phoneRequests.${index}.phone_number`) ? 'border-red-500 dark:border-red-800' : ''}
                                disabled={isSubmitting}
                              />
                              {hasError(`phoneRequests.${index}.phone_number`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`phoneRequests.${index}.phone_number`)}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>
                                Phone Brand <span className="text-red-500">*</span>
                              </Label>
                              <select
                                value={request.phone_brand}
                                onChange={(e) => handlePhoneRequestChange(index, 'phone_brand', e.target.value)}
                                className={`w-full px-3 py-2 rounded-md border ${
                                  hasError(`phoneRequests.${index}.phone_brand`) 
                                    ? 'border-red-500 dark:border-red-800' 
                                    : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                                disabled={isSubmitting}
                              >
                                <option value="">Select Phone Brand</option>
                                {[
                                  'Airtel Imagine', 'Asus', 'BlackBerry', 'Google', 'Honor',
                                  'HTC', 'Huawei', 'iPhone', 'Infinix', 'Itel', 'Lenovo',
                                  'LG', 'Micromax', 'Motorola', 'MTN Ikosora', 'MTN Taci',
                                  'Nokia', 'OnePlus', 'Oppo', 'Realme', 'Samsung', 'Sony',
                                  'Techno', 'Vivo', 'Xiaomi', 'ZTE', 'Unlisted'
                                ].map(brand => (
                                  <option key={brand} value={brand.toLowerCase()}>
                                    {brand}
                                  </option>
                                ))}
                              </select>
                              {hasError(`phoneRequests.${index}.phone_brand`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`phoneRequests.${index}.phone_brand`)}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>
                                Start Period <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="date"
                                value={request.start_date}
                                onChange={(e) => handlePhoneRequestChange(index, 'start_date', e.target.value)}
                                className={hasError(`phoneRequests.${index}.start_date`) ? 'border-red-500 dark:border-red-800' : ''}
                                disabled={isSubmitting}
                              />
                              {hasError(`phoneRequests.${index}.start_date`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`phoneRequests.${index}.start_date`)}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>
                                End Period <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="date"
                                value={request.end_date}
                                onChange={(e) => handlePhoneRequestChange(index, 'end_date', e.target.value)}
                                className={hasError(`phoneRequests.${index}.end_date`) ? 'border-red-500 dark:border-red-800' : ''}
                                disabled={isSubmitting}
                              />
                              {hasError(`phoneRequests.${index}.end_date`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`phoneRequests.${index}.end_date`)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addPhoneRequest}
                        disabled={isSubmitting}
                        className="w-full mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Phone
                      </Button>
                    </div>

                    {/* Additional Details Section */}
                    <div className="space-y-2">
                      <Label htmlFor="details">Additional Details</Label>
                      <Textarea
                        id="details"
                        name="details"
                        rows={4}
                        placeholder="Any additional information that might help with your request"
                        value={formData.details || ''}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
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
                              Please ensure that the customer is requesting serial numbers 
                              for phone numbers registered under their name. Whenever possible, verify that the provided 
                              phone numbers are registered to the customer's identity. This is required for security 
                              purposes and to protect our customers' privacy.
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="serial-number-form"
                  disabled={isSubmitting}
                  className="bg-[#0A2647] text-white hover:bg-[#0A2647]/90 dark:bg-white dark:text-[#0A2647] dark:hover:bg-white/90"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
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
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Request Submitted Successfully!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your serial number request has been submitted with reference number: <span className="font-medium text-gray-900 dark:text-white">{referenceNumber}</span>
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
                className="bg-[#0A2647] text-white hover:bg-[#0A2647]/90 dark:bg-white dark:text-[#0A2647] dark:hover:bg-white/90"
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

export default SerialNumberRequest;