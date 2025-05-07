import React, { useState, useEffect } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Button } from '../../../../components/ui/button';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import taskService from '../../../../services/task-service';
import { REQUEST_TYPES } from '../utils/constants';

/**
 * Dialog for editing a request
 */
const EditDialog = ({ 
  open, 
  onOpenChange 
}) => {
  const { 
    user, 
    selectedRequest,
    editableData,
    setEditableData,
    setRequestLoading,
    setError,
    setSuccess,
    fetchRequests
  } = useTaskContext();
  
  // Form validation state
  const [validation, setValidation] = useState({
    isValid: true,
    errors: {}
  });
  
  // Initialize editable data when selectedRequest changes
  useEffect(() => {
    if (selectedRequest) {
      setEditableData(selectedRequest);
    }
  }, [selectedRequest, setEditableData]);
  
  // Validate phone number format
  const validatePhoneNumber = (phone) => {
    // Simple validation for 10-digit phone number
    return /^\d{10}$/.test(phone);
  };
  
  // Validate the form
  const validateForm = () => {
    const errors = {};
    
    // Basic validation
    if (!editableData.full_names?.trim()) {
      errors.full_names = 'Full name is required';
    }
    
    if (!editableData.id_passport?.trim()) {
      errors.id_passport = 'ID/Passport is required';
    }
    
    if (!editableData.primary_contact?.trim()) {
      errors.primary_contact = 'Primary contact is required';
    } else if (!validatePhoneNumber(editableData.primary_contact)) {
      errors.primary_contact = 'Phone number must be 10 digits';
    }
    
    // Validate secondary contact if provided
    if (editableData.secondary_contact?.trim() && !validatePhoneNumber(editableData.secondary_contact)) {
      errors.secondary_contact = 'Phone number must be 10 digits';
    }
    
    // Validate service-specific fields
    if (editableData.service_type === REQUEST_TYPES.PHONE_NUMBER) {
      const phoneErrors = [];
      
      // Validate phone numbers
      editableData.request_phone_numbers?.forEach((phone, index) => {
        const phoneError = {};
        
        if (!phone.phone_number?.trim()) {
          phoneError.phone_number = 'Phone number is required';
        } else if (!validatePhoneNumber(phone.phone_number)) {
          phoneError.phone_number = 'Phone number must be 10 digits';
        }
        
        if (Object.keys(phoneError).length > 0) {
          phoneErrors[index] = phoneError;
        }
      });
      
      if (phoneErrors.length > 0) {
        errors.phone_numbers = phoneErrors;
      }
    }
    
    // Set validation state
    const isValid = Object.keys(errors).length === 0;
    setValidation({ isValid, errors });
    
    return isValid;
  };
  
  // Handle save
  const handleSaveEdit = async () => {
    if (!validateForm() || !selectedRequest || !user) return;

    setRequestLoading(selectedRequest.id, true);
    try {
      // Prepare data for update
      const updateData = {
        full_names: editableData.full_names,
        id_passport: editableData.id_passport,
        primary_contact: editableData.primary_contact,
        secondary_contact: editableData.secondary_contact,
        details: editableData.details,
        updated_by: user.id
      };

      // Update main request data
      await taskService.updateRequestData(selectedRequest.id, updateData);

      // Handle service-specific updates
      switch (selectedRequest.service_type) {
        case REQUEST_TYPES.PHONE_NUMBER:
          if (editableData.request_phone_numbers && editableData.request_phone_numbers.length > 0) {
            // Prepare phone number updates
            const phoneNumberUpdates = editableData.request_phone_numbers.map(phoneNumber => ({
              id: phoneNumber.id,
              phone_number: phoneNumber.phone_number,
              phone_brand: phoneNumber.phone_brand,
              request_id: selectedRequest.id
            }));

            // Send phone number updates to backend
            await taskService.updateServiceSpecificData(
              selectedRequest.id, 
              'phone_numbers', 
              phoneNumberUpdates
            );
          }
          break;
        
        case REQUEST_TYPES.MOMO_NUMBER:
          // Similar logic for MoMo numbers
          if (editableData.request_momo_numbers && editableData.request_momo_numbers.length > 0) {
            const momoNumberUpdates = editableData.request_momo_numbers.map(momoNumber => ({
              id: momoNumber.id,
              phone_number: momoNumber.phone_number,
              account_type: momoNumber.account_type,
              request_id: selectedRequest.id
            }));

            await taskService.updateServiceSpecificData(
              selectedRequest.id, 
              'momo_numbers', 
              momoNumberUpdates
            );
          }
          break;
        
        // Add cases for other service types as needed
        default:
          break;
      }

      // Refresh data
      if (typeof fetchRequests === 'function') {
        await fetchRequests();
      }

      setSuccess('Request updated successfully');
      onOpenChange(false);
    } catch (err) {
      console.error('Error in handleSaveEdit:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };

  // Handle changes to main form fields
  const handleInputChange = (field, value) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle changes to phone numbers
  const handlePhoneNumberChange = (index, field, value) => {
    setEditableData(prev => {
      const updatedPhones = [...(prev.request_phone_numbers || [])];
      if (!updatedPhones[index]) {
        updatedPhones[index] = {};
      }
      updatedPhones[index][field] = value;
      return {
        ...prev,
        request_phone_numbers: updatedPhones
      };
    });
  };

  // Add a new phone number
  const addPhoneNumber = () => {
    setEditableData(prev => {
      const updatedPhones = [...(prev.request_phone_numbers || [])];
      updatedPhones.push({ phone_number: '', phone_brand: '' });
      return {
        ...prev,
        request_phone_numbers: updatedPhones
      };
    });
  };

  // Remove a phone number
  const removePhoneNumber = (index) => {
    setEditableData(prev => {
      const updatedPhones = [...(prev.request_phone_numbers || [])];
      updatedPhones.splice(index, 1);
      return {
        ...prev,
        request_phone_numbers: updatedPhones
      };
    });
  };
  
  // Render form fields for a specific service type
  const renderServiceSpecificFields = () => {
    if (!editableData || !editableData.service_type) return null;
    
    switch (editableData.service_type) {
      case REQUEST_TYPES.PHONE_NUMBER:
        return (
          <div className="border rounded-lg p-4 mt-4">
            <h3 className="font-medium mb-2">Phone Information</h3>
            
            {editableData.request_phone_numbers?.map((phone, index) => (
              <div key={phone.id || `new-${index}`} className="mb-4 border-b pb-4 last:border-0 last:pb-0 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={phone.phone_number || ''}
                      onChange={(e) => handlePhoneNumberChange(index, 'phone_number', e.target.value)}
                      maxLength={10}
                      className={validation.errors?.phone_numbers?.[index]?.phone_number ? 'border-red-500' : ''}
                    />
                    {validation.errors?.phone_numbers?.[index]?.phone_number && (
                      <p className="text-xs text-red-500 mt-1">
                        {validation.errors.phone_numbers[index].phone_number}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Brand</label>
                    <Input
                      value={phone.phone_brand || ''}
                      onChange={(e) => handlePhoneNumberChange(index, 'phone_brand', e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Remove button */}
                {editableData.request_phone_numbers.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 text-red-500 hover:text-red-700"
                    onClick={() => removePhoneNumber(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {/* Add new phone button */}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={addPhoneNumber}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Phone Number
            </Button>
          </div>
        );
      
      // Add more cases for other service types
        
      default:
        return null;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Request</AlertDialogTitle>
          <AlertDialogDescription>
            Make changes to the request information below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {editableData && (
          <div className="py-4 space-y-4">
            {/* Main request fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Names <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editableData.full_names || ''}
                  onChange={(e) => handleInputChange('full_names', e.target.value)}
                  className={validation.errors?.full_names ? 'border-red-500' : ''}
                />
                {validation.errors?.full_names && (
                  <p className="text-xs text-red-500 mt-1">{validation.errors.full_names}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  ID/Passport <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editableData.id_passport || ''}
                  onChange={(e) => handleInputChange('id_passport', e.target.value)}
                  maxLength={16}
                  className={validation.errors?.id_passport ? 'border-red-500' : ''}
                />
                {validation.errors?.id_passport && (
                  <p className="text-xs text-red-500 mt-1">{validation.errors.id_passport}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Primary Contact <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editableData.primary_contact || ''}
                  onChange={(e) => handleInputChange('primary_contact', e.target.value)}
                  maxLength={10}
                  className={validation.errors?.primary_contact ? 'border-red-500' : ''}
                />
                {validation.errors?.primary_contact && (
                  <p className="text-xs text-red-500 mt-1">{validation.errors.primary_contact}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Secondary Contact</label>
                <Input
                  value={editableData.secondary_contact || ''}
                  onChange={(e) => handleInputChange('secondary_contact', e.target.value)}
                  maxLength={10}
                  className={validation.errors?.secondary_contact ? 'border-red-500' : ''}
                />
                {validation.errors?.secondary_contact && (
                  <p className="text-xs text-red-500 mt-1">{validation.errors.secondary_contact}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Details</label>
              <Textarea
                value={editableData.details || ''}
                onChange={(e) => handleInputChange('details', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            {/* Service-specific fields */}
            {renderServiceSpecificFields()}
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={selectedRequest?.isActionLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSaveEdit}
            disabled={selectedRequest?.isActionLoading}
            className="bg-black text-white hover:bg-gray-800"
          >
            {selectedRequest?.isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EditDialog;