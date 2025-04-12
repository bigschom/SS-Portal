// src/pages/security-services/components/PrintTemplates.jsx
import React from 'react';
import { format } from 'date-fns';

export const PrintTemplate = ({ service, formData }) => {
  const getTemplateName = () => {
    switch (service.value) {
      case 'request_serial_number':
        return 'Serial Number Request';
      case 'check_stolen_phone':
        return 'Stolen Phone Check';
      case 'unblock_momo':
        return 'MoMo Unblock Request';
      // Add other cases...
      default:
        return 'Service Request';
    }
  };

  const renderFields = () => {
    const fields = {
      request_serial_number: [
        { label: 'Phone Number', value: formData.phone_number },
        { label: 'Phone Brand', value: formData.phone_brand },
        { label: 'Date Range', value: formData.date_range }
      ],
      check_stolen_phone: [
        { label: 'IMEI Numbers', value: formData.imei_numbers?.map(i => i.number).join(', ') }
      ],
      unblock_momo: [
        { label: 'MoMo Number', value: formData.service_number }
      ],
      // Add other service fields...
    };

    return fields[service.value] || [];
  };

  return (
    <div className="print-only p-8">
      <div className="max-w-3xl mx-auto bg-white">
        <div className="border-b-2 border-gray-300 pb-6 mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">
            MTN Service Request
          </h1>
          <h2 className="text-xl text-center text-gray-600">
            {getTemplateName()}
          </h2>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Full Names</p>
              <p className="text-base">{formData.full_names}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">ID/Passport</p>
              <p className="text-base">{formData.id_passport}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Primary Contact</p>
              <p className="text-base">{formData.primary_contact}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Secondary Contact</p>
              <p className="text-base">{formData.secondary_contact || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Service Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {renderFields().map((field, index) => (
              <div key={index}>
                <p className="text-sm font-medium text-gray-500">{field.label}</p>
                <p className="text-base">{field.value || 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>

        {formData.details && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
            <p className="text-base whitespace-pre-wrap">{formData.details}</p>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-gray-500">Request Date</p>
              <p className="text-base">{format(new Date(), 'PPP')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Reference Number</p>
              <p className="text-base">{formData.reference || 'Pending'}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>This is an official service request document from MTN.</p>
          <p>For any inquiries, please contact our customer service.</p>
        </div>
      </div>
    </div>
  );
};

export default PrintTemplate;
