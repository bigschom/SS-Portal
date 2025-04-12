// src/pages/security-services/components/services/RibFollowupRequest.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import { SuccessPopup } from './SuccessPopup';

const RibFollowupRequest = ({ onBack }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      rib_number: '',
      rib_station: '',
      details: ''
    }
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
          service_type: 'rib_followup',
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

      // Insert RIB followup details
      const { error: ribError } = await supabase
        .from('request_rib_followup')
        .insert({
          request_id: requestData.id,
          rib_number: formData.rib_number,
          rib_station: formData.rib_station
        });

      if (ribError) throw ribError;

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
            <h2 className="text-xl font-semibold text-gray-900">RIB Request Followup</h2>
            <p className="text-sm text-gray-500">Track the status of your RIB request</p>
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

            {/* RIB Specific Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field">
                <label className="block text-sm font-medium text-gray-700">
                  RIB Number <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('rib_number', {
                    required: 'RIB number is required'
                  })}
                  placeholder="Enter RIB number"
                  className="bg-white/50"
                />
                {errors.rib_number && (
                  <p className="mt-1 text-sm text-red-500">{errors.rib_number.message}</p>
                )}
              </div>

              <div className="form-field">
                <label className="block text-sm font-medium text-gray-700">
                  RIB Station <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('rib_station', {
                    required: 'RIB station is required'
                  })}
                  placeholder="Enter RIB station"
                  className="bg-white/50"
                />
                {errors.rib_station && (
                  <p className="mt-1 text-sm text-red-500">{errors.rib_station.message}</p>
                )}
              </div>
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
                placeholder="Any additional information (optional)"
              />
            </div>

            {/* Important Note */}
            <Alert className="bg-blue-50/50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <strong>Important Note:</strong> Please ensure you provide the correct RIB number 
                and station information for accurate tracking of your request.
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

export default RibFollowupRequest;
