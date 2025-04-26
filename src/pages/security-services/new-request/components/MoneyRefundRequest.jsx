import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, XCircle, Save, Loader2 } from 'lucide-react';
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

const MoneyRefundRequest = ({ onBack, serviceType }) => {
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
  const [refundRequests, setRefundRequests] = useState([
    { 
      phone_number: '', 
      recipient_number: '', 
      amount: '', 
      transaction_date: '', 
      reason: '' 
    }
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    
    if (hasError(name)) {
      clearErrors([name]);
    }
  };

  const handleRefundRequestChange = (index, field, value) => {
    const updatedRequests = [...refundRequests];
    updatedRequests[index][field] = value;
    setRefundRequests(updatedRequests);
    
    const errorKey = `refundRequests.${index}.${field}`;
    if (hasError(errorKey)) {
      clearErrors([errorKey]);
    }
  };

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

  const removeRefundRequest = (index) => {
    if (refundRequests.length > 1) {
      const updatedRequests = [...refundRequests];
      updatedRequests.splice(index, 1);
      setRefundRequests(updatedRequests);
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
      
      const result = await apiService.securityServices.submitMoneyRefundRequest({
        formData,
        refundRequests,
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
        description: "Your money refund request has been submitted successfully.",
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
                    <CardTitle className="text-xl text-gray-900 dark:text-white">Money Refund Request</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      Request refund for failed transactions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <form id="money-refund-form" onSubmit={handleSubmit}>
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

                    {/* Refund Requests Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Refund Requests</h3>
                      
                      {refundRequests.map((request, index) => (
                        <div 
                          key={index}
                          className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative"
                        >
                          {refundRequests.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                              onClick={() => removeRefundRequest(index)}
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          )}
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>
                                Sender Phone/Account Number <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                placeholder="Phone or Account Number"
                                value={request.phone_number}
                                onChange={(e) => handleRefundRequestChange(index, 'phone_number', e.target.value)}
                                className={hasError(`refundRequests.${index}.phone_number`) ? 'border-red-500 dark:border-red-800' : ''}
                                disabled={isSubmitting}
                              />
                              {hasError(`refundRequests.${index}.phone_number`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`refundRequests.${index}.phone_number`)}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>
                                Recipient Phone Number <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                placeholder="07XXXXXXXX"
                                value={request.recipient_number}
                                onChange={(e) => handleRefundRequestChange(index, 'recipient_number', e.target.value)}
                                className={hasError(`refundRequests.${index}.recipient_number`) ? 'border-red-500 dark:border-red-800' : ''}
                                disabled={isSubmitting}
                              />
                              {hasError(`refundRequests.${index}.recipient_number`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`refundRequests.${index}.recipient_number`)}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>
                                Amount <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                step="0.01"
                                value={request.amount}
                                onChange={(e) => handleRefundRequestChange(index, 'amount', e.target.value)}
                                className={hasError(`refundRequests.${index}.amount`) ? 'border-red-500 dark:border-red-800' : ''}
                                disabled={isSubmitting}
                              />
                              {hasError(`refundRequests.${index}.amount`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`refundRequests.${index}.amount`)}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>
                                Transaction Date <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="date"
                                value={request.transaction_date}
                                onChange={(e) => handleRefundRequestChange(index, 'transaction_date', e.target.value)}
                                className={hasError(`refundRequests.${index}.transaction_date`) ? 'border-red-500 dark:border-red-800' : ''}
                                disabled={isSubmitting}
                              />
                              {hasError(`refundRequests.${index}.transaction_date`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`refundRequests.${index}.transaction_date`)}</p>
                              )}
                            </div>

                            <div className="col-span-full space-y-2">
                              <Label>
                                Reason for Refund <span className="text-red-500">*</span>
                              </Label>
                              <select
                                value={request.reason}
                                onChange={(e) => handleRefundRequestChange(index, 'reason', e.target.value)}
                                className={`w-full px-3 py-2 rounded-md border 
                                          ${hasError(`refundRequests.${index}.reason`) 
                                            ? 'border-red-500 dark:border-red-800' 
                                            : 'border-gray-200 dark:border-gray-700'}
                                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                                          focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                                disabled={isSubmitting}
                              >
                                <option value="">Select Reason for Refund</option>
                                <option value="wrong_recipient">Sent to Wrong Person</option>
                                <option value="transaction_failed">Transaction Failed but Money Deducted</option>
                                <option value="duplicate_transaction">Duplicate Transaction</option>
                                <option value="service_not_received">Service/Product Not Received</option>
                                <option value="fraud">Fraudulent Transaction</option>
                                <option value="other">Other (Please Specify in Details)</option>
                              </select>
                              {hasError(`refundRequests.${index}.reason`) && (
                                <p className="text-sm text-red-500">{getErrorMessage(`refundRequests.${index}.reason`)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addRefundRequest}
                        disabled={isSubmitting}
                        className="w-full mt-2"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Add Another Refund Request
                      </Button>
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
                        placeholder="Provide more context about your refund request"
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
                              Please ensure you provide accurate transaction details. 
                              Refund requests are processed based on transaction verification. 
                              Have transaction proof or screenshots ready if requested.
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
                  form="money-refund-form"
                  disabled={isSubmitting}
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
              Your money refund request has been submitted with reference number: <span className="font-medium text-gray-900 dark:text-white">{referenceNumber}</span>
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

export default MoneyRefundRequest;