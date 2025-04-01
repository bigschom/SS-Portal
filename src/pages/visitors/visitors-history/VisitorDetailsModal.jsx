import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { mockIdApi } from '../../services/mockApi';

const VisitorDetailsModal = ({ isOpen, visitor, onClose }) => {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPhoto = async () => {
      if (visitor?.identity_number) {
        setIsLoading(true);
        try {
          const photo = await mockIdApi.getPhoto(visitor.identity_number);
          setPhotoUrl(photo);
        } catch (error) {
          console.error('Error fetching photo:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (isOpen && visitor) {
      fetchPhoto();
    } else {
      setPhotoUrl(null);
    }
  }, [isOpen, visitor]);

  if (!isOpen || !visitor) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-3xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Visitor Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Photo Section */}
          <div className="md:col-span-1">
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600 border-t-black dark:border-t-white"></div>
                </div>
              ) : photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={visitor.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Badge Status */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Badge Status</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  visitor.check_out_time 
                    ? 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300' 
                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                }`}>
                  {visitor.check_out_time ? 'Checked Out' : 'Active'}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Card: {visitor.visitor_card}
              </div>
            </div>
          </div>

          {/* Details Sections */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Full Name" value={visitor.full_name} />
                <InfoItem label="ID/Passport" value={visitor.identity_number} />
                <InfoItem label="Phone Number" value={visitor.phone_number} />
      
              </div>
            </div>

            {/* Visit Details */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visit Details</h3>
              <div className="space-y-4">
                <InfoItem label="Purpose" value={visitor.purpose} fullWidth />
                <InfoItem label="Items Brought" value={visitor.items || 'None'} fullWidth />
                {visitor.laptop_brand && (
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Laptop Brand" value={visitor.laptop_brand} />
                    <InfoItem label="Serial Number" value={visitor.laptop_serial} />
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visit Timeline</h3>
              <div className="space-y-4">
                <InfoItem 
                  label="Check In" 
                  value={new Date(visitor.check_in_time).toLocaleString()} 
                  fullWidth 
                />
                {visitor.check_out_time && (
                  <InfoItem 
                    label="Check Out" 
                    value={new Date(visitor.check_out_time).toLocaleString()} 
                    fullWidth 
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black 
                     rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 
                     transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Helper component for consistent info display
const InfoItem = ({ label, value, fullWidth = false }) => (
  <div className={fullWidth ? 'col-span-2' : ''}>
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{value}</dd>
  </div>
);

export default VisitorDetailsModal;