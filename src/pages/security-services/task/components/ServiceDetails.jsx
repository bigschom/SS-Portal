// src/pages/security-services/task/components/ServiceDetails.jsx
import React from 'react';
import { 
  User, 
  Phone, 
  FileText, 
  ClipboardList, 
  Calendar, 
  Clock, 
  ScanLine,
  CreditCard,
  SmartphoneCharging
} from 'lucide-react';
import { SERVICE_TYPES } from '../utils/taskConstants';

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// General request information section
const RequestInfoSection = ({ request }) => (
  <div className="mb-6">
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
      Request Information
    </h3>
    <div className="space-y-3">
      <div className="flex items-center">
        <User className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
          <p className="text-base text-gray-900 dark:text-white">{request.full_names || 'N/A'}</p>
        </div>
      </div>
      
      <div className="flex items-center">
        <FileText className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">ID/Passport</p>
          <p className="text-base text-gray-900 dark:text-white">{request.id_passport || 'N/A'}</p>
        </div>
      </div>
      
      <div className="flex items-center">
        <Phone className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Primary Contact</p>
          <p className="text-base text-gray-900 dark:text-white">{request.primary_contact || 'N/A'}</p>
        </div>
      </div>
      
      {request.secondary_contact && (
        <div className="flex items-center">
          <Phone className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Secondary Contact</p>
            <p className="text-base text-gray-900 dark:text-white">{request.secondary_contact}</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center">
        <Calendar className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Submission Date</p>
          <p className="text-base text-gray-900 dark:text-white">{formatDate(request.created_at)}</p>
        </div>
      </div>
      
      <div className="flex items-center">
        <ClipboardList className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Reference Number</p>
          <p className="text-base text-gray-900 dark:text-white">{request.reference_number || 'N/A'}</p>
        </div>
      </div>
    </div>
  </div>
);

// Call History Request specific details
const CallHistoryDetails = ({ details }) => {
  if (!details || !details.callHistoryRequests) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Call History Details
      </h3>
      
      {details.callHistoryRequests.map((item, index) => (
        <div 
          key={index} 
          className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
              <p className="text-base text-gray-900 dark:text-white">{item.phone_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
              <p className="text-base text-gray-900 dark:text-white">{formatDate(item.start_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">End Date</p>
              <p className="text-base text-gray-900 dark:text-white">{formatDate(item.end_date)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// MoMo Transaction Request specific details
const MomoTransactionDetails = ({ details }) => {
  if (!details || !details.momoTransactions) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        MoMo Transaction Details
      </h3>
      
      {details.momoTransactions.map((item, index) => (
        <div 
          key={index} 
          className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
              <p className="text-base text-gray-900 dark:text-white">{item.phone_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
              <p className="text-base text-gray-900 dark:text-white">{formatDate(item.start_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">End Date</p>
              <p className="text-base text-gray-900 dark:text-white">{formatDate(item.end_date)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Money Refund Request specific details
const MoneyRefundDetails = ({ details }) => {
  if (!details || !details.refundRequests) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Money Refund Details
      </h3>
      
      {details.refundRequests.map((item, index) => (
        <div 
          key={index} 
          className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sender Phone/Account</p>
              <p className="text-base text-gray-900 dark:text-white">{item.phone_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recipient Number</p>
              <p className="text-base text-gray-900 dark:text-white">{item.recipient_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
              <p className="text-base text-gray-900 dark:text-white">{item.amount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transaction Date</p>
              <p className="text-base text-gray-900 dark:text-white">{formatDate(item.transaction_date)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Reason</p>
              <p className="text-base text-gray-900 dark:text-white">{item.reason}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Serial Number Request specific details
const SerialNumberDetails = ({ details }) => {
  if (!details || !details.serialNumberRequests) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Serial Number Details
      </h3>
      
      {details.serialNumberRequests.map((item, index) => (
        <div 
          key={index} 
          className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
              <p className="text-base text-gray-900 dark:text-white">{item.phone_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Device Type</p>
              <p className="text-base text-gray-900 dark:text-white">{item.device_type}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Stolen Phone Check details
const StolenPhoneDetails = ({ details }) => {
  if (!details || !details.imeiRequests) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        IMEI Check Details
      </h3>
      
      {details.imeiRequests.map((item, index) => (
        <div 
          key={index} 
          className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center">
            <SmartphoneCharging className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">IMEI Number</p>
              <p className="text-base text-gray-900 dark:text-white">{item.imei_number}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Unblock Call Request details
const UnblockCallDetails = ({ details }) => {
  if (!details || !details.phoneNumberRequests) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Unblock Call Details
      </h3>
      
      {details.phoneNumberRequests.map((item, index) => (
        <div 
          key={index} 
          className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
              <p className="text-base text-gray-900 dark:text-white">{item.number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date Blocked</p>
              <p className="text-base text-gray-900 dark:text-white">{formatDate(item.date_blocked)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reason Blocked</p>
              <p className="text-base text-gray-900 dark:text-white">{item.reason_blocked || 'N/A'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Unblock MoMo Request details
const UnblockMomoDetails = ({ details }) => {
  if (!details || !details.momoNumberRequests) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Unblock MoMo Details
      </h3>
      
      {details.momoNumberRequests.map((item, index) => (
        <div 
          key={index} 
          className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
              <p className="text-base text-gray-900 dark:text-white">{item.number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date Blocked</p>
              <p className="text-base text-gray-900 dark:text-white">{formatDate(item.date_blocked)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Account Type</p>
              <p className="text-base text-gray-900 dark:text-white">{item.account_type || 'N/A'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Backoffice Appointment details
const BackofficeAppointmentDetails = ({ details }) => {
  if (!details || !details.appointment) return null;
  
  const { backoffice_user, preferred_date, preferred_time } = details.appointment;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Appointment Details
      </h3>
      
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Backoffice User</p>
            <p className="text-base text-gray-900 dark:text-white">{backoffice_user?.fullname || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Preferred Date</p>
            <p className="text-base text-gray-900 dark:text-white">{formatDate(preferred_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Preferred Time</p>
            <p className="text-base text-gray-900 dark:text-white">{preferred_time || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Additional details section
const AdditionalDetails = ({ details }) => {
  if (!details || !details.details) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Additional Details
      </h3>
      
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-900 dark:text-white whitespace-pre-line">
          {details.details}
        </p>
      </div>
    </div>
  );
};

// Main ServiceDetails component
const ServiceDetails = ({ request }) => {
  if (!request) return null;
  
  const renderServiceSpecificDetails = () => {
    switch (request.service_type) {
      case SERVICE_TYPES.CALL_HISTORY:
        return <CallHistoryDetails details={request.service_details} />;
      case SERVICE_TYPES.MOMO_TRANSACTION:
        return <MomoTransactionDetails details={request.service_details} />;
      case SERVICE_TYPES.MONEY_REFUND:
        return <MoneyRefundDetails details={request.service_details} />;
      case SERVICE_TYPES.REQUEST_SERIAL_NUMBER:
        return <SerialNumberDetails details={request.service_details} />;
      case SERVICE_TYPES.CHECK_STOLEN_PHONE:
        return <StolenPhoneDetails details={request.service_details} />;
      case SERVICE_TYPES.UNBLOCK_CALL:
        return <UnblockCallDetails details={request.service_details} />;
      case SERVICE_TYPES.UNBLOCK_MOMO:
        return <UnblockMomoDetails details={request.service_details} />;
      case SERVICE_TYPES.BACKOFFICE_APPOINTMENT:
        return <BackofficeAppointmentDetails details={request.service_details} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <RequestInfoSection request={request} />
      {renderServiceSpecificDetails()}
      <AdditionalDetails details={request.service_details} />
    </div>
  );
};

export default ServiceDetails;