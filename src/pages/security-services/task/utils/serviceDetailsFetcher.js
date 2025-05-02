// src/pages/security-services/task/utils/serviceDetailsFetcher.js
import { SERVICE_TYPES } from './taskConstants';

/**
 * Fetches the relevant service-specific details for a request
 * Processes the request object and extracts/enhances service-specific details
 * 
 * @param {Object} request The request object from the API
 * @returns {Object} An enhanced request object with service_details property
 */
export const fetchServiceDetails = async (request) => {
  if (!request) return null;
  
  try {
    // Start with the base request
    const enhancedRequest = { ...request };
    
    // Parse request_comments if it's a JSON string
    if (typeof enhancedRequest.request_comments === 'string') {
      try {
        enhancedRequest.request_comments = JSON.parse(enhancedRequest.request_comments);
      } catch (e) {
        console.warn('Error parsing request_comments:', e);
        enhancedRequest.request_comments = [];
      }
    }
    
    // Parse request_history if it's a JSON string
    if (typeof enhancedRequest.request_history === 'string') {
      try {
        enhancedRequest.request_history = JSON.parse(enhancedRequest.request_history);
      } catch (e) {
        console.warn('Error parsing request_history:', e);
        enhancedRequest.request_history = [];
      }
    }
    
    // Ensure request_comments is an array (even if null in DB)
    if (!Array.isArray(enhancedRequest.request_comments)) {
      enhancedRequest.request_comments = [];
    }
    
    // Ensure request_history is an array (even if null in DB)
    if (!Array.isArray(enhancedRequest.request_history)) {
      enhancedRequest.request_history = [];
    }
    
    // Extract and process service-specific details
    const serviceDetails = { 
      details: enhancedRequest.details
    };
    
    // Add service-specific properties based on the service type
    switch (enhancedRequest.service_type) {
      case SERVICE_TYPES.CALL_HISTORY:
        // Fetch call history details if not already included
        const callHistory = await fetchCallHistoryDetails(enhancedRequest.id);
        serviceDetails.callHistoryRequests = callHistory;
        break;
        
      case SERVICE_TYPES.MOMO_TRANSACTION:
        // Fetch MoMo transaction details if not already included
        const momoTransactions = await fetchMomoTransactionDetails(enhancedRequest.id);
        serviceDetails.momoTransactions = momoTransactions;
        break;
        
      case SERVICE_TYPES.MONEY_REFUND:
        // Fetch money refund details if not already included
        const refundRequests = await fetchMoneyRefundDetails(enhancedRequest.id);
        serviceDetails.refundRequests = refundRequests;
        break;
        
      case SERVICE_TYPES.REQUEST_SERIAL_NUMBER:
        // Fetch serial number details if not already included
        const serialNumberRequests = await fetchSerialNumberDetails(enhancedRequest.id);
        serviceDetails.serialNumberRequests = serialNumberRequests;
        break;
        
      case SERVICE_TYPES.CHECK_STOLEN_PHONE:
        // Fetch stolen phone details if not already included
        const imeiRequests = await fetchStolenPhoneDetails(enhancedRequest.id);
        serviceDetails.imeiRequests = imeiRequests;
        break;
        
      case SERVICE_TYPES.UNBLOCK_CALL:
        // Fetch unblock call details if not already included
        const phoneNumberRequests = await fetchUnblockCallDetails(enhancedRequest.id);
        serviceDetails.phoneNumberRequests = phoneNumberRequests;
        break;
        
      case SERVICE_TYPES.UNBLOCK_MOMO:
        // Fetch unblock MoMo details if not already included
        const momoNumberRequests = await fetchUnblockMomoDetails(enhancedRequest.id);
        serviceDetails.momoNumberRequests = momoNumberRequests;
        break;
        
      case SERVICE_TYPES.BACKOFFICE_APPOINTMENT:
        // Fetch backoffice appointment details if not already included
        const appointment = await fetchBackofficeAppointmentDetails(enhancedRequest.id);
        serviceDetails.appointment = appointment;
        break;
        
      default:
        break;
    }
    
    // Add the service details to the request
    enhancedRequest.service_details = serviceDetails;
    
    return enhancedRequest;
  } catch (error) {
    console.error('Error fetching service details:', error);
    return request;
  }
};

// Helper functions for fetching service-specific details

// Fetch call history details
const fetchCallHistoryDetails = async (requestId) => {
  try {
    // Simulate API call - in a real app, you would make an actual API call
    // This would be replaced with an actual API call to your backend
    // For example: return await apiClient.get(`/api/call-history/${requestId}`);
    
    // For now, we're returning mock data for demonstration
    return [
      {
        id: 1,
        phone_number: '0712345678',
        start_date: '2023-01-01',
        end_date: '2023-01-31'
      }
    ];
  } catch (error) {
    console.error('Error fetching call history details:', error);
    return [];
  }
};

// Fetch MoMo transaction details
const fetchMomoTransactionDetails = async (requestId) => {
  try {
    // Simulate API call
    return [
      {
        id: 1,
        phone_number: '0712345678',
        start_date: '2023-01-01',
        end_date: '2023-01-31'
      }
    ];
  } catch (error) {
    console.error('Error fetching MoMo transaction details:', error);
    return [];
  }
};

// Fetch money refund details
const fetchMoneyRefundDetails = async (requestId) => {
  try {
    // Simulate API call
    return [
      {
        id: 1,
        phone_number: '0712345678',
        recipient_number: '0723456789',
        amount: '1000',
        transaction_date: '2023-01-15',
        reason: 'wrong_recipient'
      }
    ];
  } catch (error) {
    console.error('Error fetching money refund details:', error);
    return [];
  }
};

// Fetch serial number details
const fetchSerialNumberDetails = async (requestId) => {
  try {
    // Simulate API call
    return [
      {
        id: 1,
        phone_number: '0712345678',
        phone_brand: 'Samsung',
        start_date: '2023-01-01',
        end_date: '2023-01-31'
      }
    ];
  } catch (error) {
    console.error('Error fetching serial number details:', error);
    return [];
  }
};

// Fetch stolen phone details
const fetchStolenPhoneDetails = async (requestId) => {
  try {
    // Simulate API call
    return [
      {
        id: 1,
        imei_number: '123456789012345'
      }
    ];
  } catch (error) {
    console.error('Error fetching stolen phone details:', error);
    return [];
  }
};

// Fetch unblock call details
const fetchUnblockCallDetails = async (requestId) => {
  try {
    // Simulate API call
    return [
      {
        id: 1,
        number: '0712345678',
        date_blocked: '2023-01-01',
        reason_blocked: 'unpaid_bills'
      }
    ];
  } catch (error) {
    console.error('Error fetching unblock call details:', error);
    return [];
  }
};

// Fetch unblock MoMo details
const fetchUnblockMomoDetails = async (requestId) => {
  try {
    // Simulate API call
    return [
      {
        id: 1,
        number: '0712345678',
        date_blocked: '2023-01-01',
        account_type: 'normal'
      }
    ];
  } catch (error) {
    console.error('Error fetching unblock MoMo details:', error);
    return [];
  }
};

// Fetch backoffice appointment details
const fetchBackofficeAppointmentDetails = async (requestId) => {
  try {
    // Simulate API call
    return {
      id: 1,
      backoffice_user: {
        id: 2,
        fullname: 'Jane Smith'
      },
      preferred_date: '2023-02-15',
      preferred_time: '10:00'
    };
  } catch (error) {
    console.error('Error fetching backoffice appointment details:', error);
    return null;
  }
};