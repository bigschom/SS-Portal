// src/pages/security-services/components/services/UnblockMomoRequest.jsx
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

const UnblockMomoRequest = ({ onBack }) => {
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
      momoNumbers: [{ number: '' }],
      details: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "momoNumbers"
  });

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
          service_type: 'unblock_momo',
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

      // Insert MoMo numbers to unblock
      if (formData.momoNumbers?.length) {
        const momoRequests = formData.momoNumbers.map(item => ({
          request_id: requestData.id,
          phone_number: item.number
        }));

        const { error: momoError } = await supabase
          .from('request_momo_numbers')
          .insert(momoRequests);

        if (momoError) throw momoError;
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
            <h2 className="text-xl font-semibold text-gray-900">Unblock MoMo Account</h2>
            <p className="text-sm text-gray-500">Get assistance with unblocking MoMo</p>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Similar fields as other components */}
              {/* ... */}
            </div>

            {/* MoMo Numbers */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="relative border rounded-lg p-4 bg-[#F5EDE3]">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-700">
                      MoMo Number {index + 1} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...register(`momoNumbers.${index}.number`, {
                        required: 'MoMo number is required',
                        pattern: {
                          value: /^\d{10}$/,
                          message: 'Please enter a valid 10-digit phone number'
                        }
                      })}
                      type="tel"
                      maxLength={10}
                      placeholder="Enter MoMo number to unblock"
                      className="bg-white/50"
                    />
                    {errors.momoNumbers?.[index]?.number && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.momoNumbers[index].number.message}
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
                Add Another MoMo Number
              </Button>
            </div>

            {/* Similar footer and other sections as other components */}
            {/* ... */}
          </CardContent>

          <CardFooter className="flex justify-end space-x-4 pt-6 border-t border-gray-200 bg-[#F5EDE3] rounded-b-lg">
            {/* Similar buttons as other components */}
            {/* ... */}
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

export default UnblockMomoRequest;
