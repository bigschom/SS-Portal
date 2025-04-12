// src/pages/security-services/components/services/InternetIssueRequest.jsx
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, XCircle, Save, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import { SuccessPopup } from './SuccessPopup';

const InternetIssueRequest = ({ onBack }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      internetIssues: [{
        number: ''
      }],
      issue_type: '',
      issue_description: '',
      details: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "internetIssues"
  });

  const onSubmit = async (formData) => {
    setIsLoading(true);
    try {
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
      
      const { data: requestData, error: requestError } = await supabase
        .from('service_requests')
        .insert({
          reference_number: referenceNumber,
          service_type: 'internet_issue',
          status: 'new',
          priority: 'normal',
          full_names: formData.full_names,
          id_passport: formData.id_passport,
          primary_contact: formData.primary_contact,
          secondary_contact: formData.secondary_contact || null,
          details: formData.details,
          issue_type: formData.issue_type,
          issue_description: formData.issue_description,
          created_by: user.id
        })
        .select()
        .single();

      if (requestError) throw requestError;

      if (formData.internetIssues?.length) {
        const internetRequests = formData.internetIssues.map(issue => ({
          request_id: requestData.id,
          phone_number: issue.number
        }));

        const { error: internetError } = await supabase
          .from('request_internet_issues')
          .insert(internetRequests);

        if (internetError) throw internetError;
      }

      setSuccessMessage(`Request submitted successfully! Reference: ${referenceNumber}`);
      setShowSuccess(true);
      reset();
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <Card className="bg-[#F8F5F0]">
        <CardHeader className="flex flex-row items-center space-x-4 bg-[#F5EDE3] rounded-t-lg">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Internet Issue Report</h2>
            <p className="text-sm text-gray-500">Report and resolve internet connectivity problems</p>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field">
                <label className="block text-sm font-medium text-gray-700">
                  Full Names <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('full_names', { required: 'Full names are required' })}
                  placeholder="Enter full names"
                  className="bg-white/50"
                />
                {errors.full_names && (
                  <p className="mt-1 text-sm text-red-500">{errors.full_names.message}</p>
                )}
              </div>

              <div className="form-field">
                <label className="block text-sm font-medium text-gray-700">
                  ID/Passport <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('id_passport', { 
                    required: 'ID/Passport is required',
                    maxLength: {
                      value: 16,
                      message: 'ID/Passport cannot exceed 16 characters'
                    }
                  })}
                  maxLength={16}
                  placeholder="Enter ID/Passport number"
                  className="bg-white/50"
                />
                {errors.id_passport && (
                  <p className="mt-1 text-sm text-red-500">{errors.id_passport.message}</p>
                )}
              </div>

              <div className="form-field">
                <label className="block text-sm font-medium text-gray-700">
                  Primary Contact <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('primary_contact', { 
                    required: 'Primary contact is required',
                    pattern: {
                      value: /^\d{10}$/,
                      message: 'Please enter a valid 10-digit phone number'
                    }
                  })}
                  type="tel"
                  maxLength={10}
                  placeholder="Enter primary contact"
                  className="bg-white/50"
                />
                {errors.primary_contact && (
                  <p className="mt-1 text-sm text-red-500">{errors.primary_contact.message}</p>
                )}
              </div>

              <div className="form-field">
                <label className="block text-sm font-medium text-gray-700">
                  Secondary Contact
                </label>
                <Input
                  {...register('secondary_contact')}
                  placeholder="Enter secondary contact"
                  className="bg-white/50"
                />
              </div>
            </div>

            {/* Issue Type and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field">
                <label className="block text-sm font-medium text-gray-700">
                  Issue Type <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('issue_type', { required: 'Issue type is required' })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white/50 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select issue type</option>
                  <option value="no_connection">No Connection</option>
                  <option value="slow_speed">Slow Speed</option>
                  <option value="intermittent">Intermittent Connection</option>
                  <option value="data_bundle">Data Bundle Issue</option>
                  <option value="other">Other</option>
                </select>
                {errors.issue_type && (
                  <p className="mt-1 text-sm text-red-500">{errors.issue_type.message}</p>
                )}
              </div>

              <div className="form-field">
                <label className="block text-sm font-medium text-gray-700">
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('issue_description', { required: 'Issue description is required' })}
                  placeholder="Brief description of the issue"
                  className="bg-white/50"
                />
                {errors.issue_description && (
                  <p className="mt-1 text-sm text-red-500">{errors.issue_description.message}</p>
                )}
              </div>
            </div>

            {/* Internet Issue Numbers */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="relative border rounded-lg p-4 bg-[#F5EDE3]">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number {index + 1} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...register(`internetIssues.${index}.number`, {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^\d{10}$/,
                          message: 'Please enter a valid 10-digit phone number'
                        }
                      })}
                      type="tel"
                      maxLength={10}
                      placeholder="Enter phone number with internet issue"
                      className="bg-white/50"
                    />
                    {errors.internetIssues?.[index]?.number && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.internetIssues[index].number.message}
                      </p>
                    )}
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={() => remove(index)}
                    >
                      <XCircle className="h-5 w-5 text-gray-500 hover:text-red-500" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ number: '' })}
                className="w-full bg-[#F5EDE3] hover:bg-[#F5EDE3]/80"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Number
              </Button>
            </div>

            {/* Details Field */}
            <div className="form-field">
              <label className="block text-sm font-medium text-gray-700">
                Additional Details
              </label>
              <textarea
                {...register('details')}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white/50"
                placeholder="Any additional information about the issue (optional)"
              />
            </div>

            {/* Important Note */}
            <Alert className="bg-blue-50/50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <strong>Important Note:</strong> Please provide accurate phone numbers and detailed 
                information about the internet issues you are experiencing for faster resolution.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex justify-end space-x-4 pt-6 border-t border-gray-200 bg-[#F5EDE3] rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="bg-white/50 hover:bg-white/70"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {showSuccess && (
        <SuccessPopup
          message={successMessage}
          onClose={() => {
            setShowSuccess(false);
            onBack();
          }}
        />
      )}
    </motion.div>
  );
};

export default InternetIssueRequest;
