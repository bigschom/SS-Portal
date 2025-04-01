import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';
import { visitorService } from '../../services/visitorService';
import { DEPARTMENTS } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import DocumentScanner from '../../components/DocumentScanner';
import CameraModal from '../../components/CameraModal';

// Alert/Popup Component
const Alert = ({ message, type = 'error', onClose, onConfirm }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg
      ${type === 'success' 
        ? 'bg-black text-white dark:bg-white dark:text-black' 
        : 'bg-red-500 text-white'
      }
      transition-colors duration-300`}
  >
    <div className="flex items-center space-x-4">
      <span>{message}</span>
      {onConfirm && (
        <div className="flex space-x-2">
          <button 
            onClick={onConfirm} 
            className="px-3 py-1 bg-white/30 hover:bg-white/40 rounded-lg"
          >
            Confirm
          </button>
          <button 
            onClick={onClose} 
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}
      {!onConfirm && (
        <button 
          onClick={onClose} 
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg"
        >
          Close
        </button>
      )}
    </div>
  </motion.div>
);

const VisitorForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // States
  const [availableCards, setAvailableCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [hasLaptop, setHasLaptop] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isEditable, setIsEditable] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error');
  const [alertConfirmAction, setAlertConfirmAction] = useState(null);
  const [isPassportUser, setIsPassportUser] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    identityNumber: '',
    gender: '',
    phoneNumber: '',
    nationality: '', 
    visitorCard: '',
    department: '',
    purpose: '',
    items: '',
    laptopBrand: '',
    laptopSerial: ''
  });
  
  const [errors, setErrors] = useState({});


{/* Photo Section */}
const renderPhotoSection = () => (
  <div className="flex flex-col items-center">
    <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
      {isPassportUser ? (
        photoUrl ? (
          <div className="relative group w-full h-full">
            <img 
              src={photoUrl} 
              alt="Visitor" 
              className="w-full h-full object-cover"
            />
            <div 
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => {
                setPhotoUrl(null);
                setFormData(prev => ({
                  ...prev,
                  fullName: '',
                  identityNumber: '',
                  gender: '',
                  nationality: ''
                }));
              }}
            >
              <span className="text-white text-sm">Click to retake</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCameraOpen(true)}
            className="w-full h-full flex items-center justify-center cursor-pointer
                     hover:bg-gray-200 dark:hover:bg-gray-600 
                     transition-colors duration-200"
          >
            <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </button>
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          <svg
            className="w-20 h-20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </div>

    {/* Camera Modal */}
    <CameraModal
      isOpen={isCameraOpen}
      onClose={() => setIsCameraOpen(false)}
      onCapture={(data) => {
        setPhotoUrl(data.photoUrl);
        setFormData(prev => ({
          ...prev,
          fullName: data.fullName || prev.fullName,
          identityNumber: data.identityNumber || prev.identityNumber,
          gender: data.gender || prev.gender,
          nationality: data.nationality || prev.nationality
        }));
      }}
    />
  </div>
);

  // Load visitor data and handle #00 case
  useEffect(() => {
    const { visitor, isPassport } = location.state || {};
    
    if (!visitor && !isPassport) {
      navigate('/check-in');
      return;
    }

    // Set passport user flag
    setIsPassportUser(isPassport || false);

    if (visitor) {
      setFormData(prev => ({
        ...prev,
        fullName: visitor.fullName || '',
        identityNumber: visitor.identityNumber || '',
        gender: visitor.gender || '',
        phoneNumber: visitor.phoneNumber || '',
        nationality: visitor.nationality || '',
      }));
      setPhotoUrl(visitor.photoUrl || null);
      setIsEditable(false); // Disable editing for existing visitor
    } else if (isPassport) {
      // Enable all fields for passport case (#00)
      setIsEditable(true);
      setFormData(prev => ({
        ...prev,
        nationality: '' // Reset nationality for new passport user
      }));
    }
  }, [location.state, navigate]);

  // Load available cards when department changes
  useEffect(() => {
    const loadAvailableCards = async () => {
      if (!selectedDepartment) return;
      
      try {
        // Fetch both available and used cards
        const availableCardsResponse = await visitorService.getAvailableCards(selectedDepartment);
        
        // Check for used cards
        const usedCardsResponse = await visitorService.getUsedCards(selectedDepartment);
        
        // Filter out used cards
        const filteredCards = availableCardsResponse.filter(
          card => !usedCardsResponse.includes(card)
        );

        setAvailableCards(filteredCards);
      } catch (error) {
        console.error('Error loading cards:', error);
        showErrorAlert('Failed to load available cards');
      }
    };

    loadAvailableCards();
  }, [selectedDepartment]);

  // Show error alert
  const showErrorAlert = (message) => {
    setAlertMessage(message);
    setAlertType('error');
    setShowAlert(true);
    setAlertConfirmAction(null);

    // Automatically remove alert after 3 seconds
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  // Show success alert
  const showSuccessAlert = (message, confirmAction = null) => {
    setAlertMessage(message);
    setAlertType('success');
    setShowAlert(true);
    setAlertConfirmAction(confirmAction);

    // Automatically remove alert after 3 seconds if no confirm action
    if (!confirmAction) {
      setTimeout(() => {
        setShowAlert(false);
        // Navigate after the alert is hidden
        navigate('/check-in', { 
          state: { 
            success: true,
            message: 'Visitor checked in successfully'
          }
        });
      }, 3000);
    }
  };

  // Handle department change
  const handleDepartmentChange = async (e) => {
    const deptId = e.target.value;
    setSelectedDepartment(deptId);
    setFormData(prev => ({ ...prev, department: deptId, visitorCard: '' }));
    setErrors(prev => ({ ...prev, department: '', visitorCard: '' }));
  };

// Form validation
const validateForm = () => {
  const newErrors = {};

  // Photo validation for passport users
  if (isPassportUser && !photoUrl) {
    newErrors.photo = 'Please capture a photo of the passport/ID';
  }

  // Required fields
  if (!formData.fullName) newErrors.fullName = 'Full name is required';
  
  if (!formData.phoneNumber) {
    newErrors.phoneNumber = 'Phone number is required';
  } else if (!formData.phoneNumber.match(/^250\d{9}$/)) {
    newErrors.phoneNumber = 'Phone number must start with 250 followed by 9 digits';
  }

  // Nationality validation only for passport users
  if (isPassportUser) {
    if (!formData.nationality) {
      newErrors.nationality = 'Nationality is required for passport users';
    }
  }

  // For passport users (#00), require identity number
  if (isPassportUser && !formData.identityNumber) {
    newErrors.identityNumber = 'ID or Passport number is required';
  }

  if (!formData.department) newErrors.department = 'Department is required';
  if (!formData.visitorCard) newErrors.visitorCard = 'Visitor card is required';
  if (!formData.purpose) newErrors.purpose = 'Purpose is required';

  // Laptop validation
  if (hasLaptop) {
    if (!formData.laptopBrand) newErrors.laptopBrand = 'Laptop brand is required';
    if (!formData.laptopSerial) newErrors.laptopSerial = 'Serial number is required';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
  // Handle form submission
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Check photo first for passport users
  if (isPassportUser && !photoUrl) {
    showErrorAlert('Please capture a photo of the passport/ID');
    return;
  }

  if (!validateForm()) {
    showErrorAlert('Please fill in all required fields');
    return;
  }

  if (!user?.username) {
    showErrorAlert('User session expired. Please log in again.');
    return;
  }

  setIsLoading(true);
  try {
    await visitorService.checkInVisitor({
      ...formData,
      isPassport: isPassportUser,
      photoUrl: photoUrl // Make sure to include the photo
    }, user.username);
    
    showSuccessAlert('Visitor checked in successfully');
  } catch (error) {
    console.error('Check-in error:', error);
    showErrorAlert(error.message || 'An error occurred during check-in');
  } finally {
    setIsLoading(false);
  }
};

  // Close alert handler
  const handleCloseAlert = () => {
    setShowAlert(false);
    if (alertConfirmAction) {
      alertConfirmAction();
    } else {
      // If no confirm action, navigate to check-in page
      navigate('/check-in', { 
        state: { 
          success: true,
          message: 'Visitor checked in successfully'
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white relative">
      {/* Alert Popup */}
      <AnimatePresence>
        {showAlert && (
          <Alert 
            message={alertMessage} 
            type={alertType}
            onClose={handleCloseAlert}
            onConfirm={alertConfirmAction ? handleCloseAlert : null}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Panel - Photo and Personal Info */}
            <div className="lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-6"
              >
                {renderPhotoSection()}
                

                 {/* Personal Information */}
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.fullName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                ${!isEditable ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}
                                dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                      readOnly={!isEditable}
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Phone Number (250...)"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const formattedValue = value.startsWith('250') 
                          ? value.slice(0, 12) 
                          : `250${value}`.slice(0, 12);
                        setFormData({ ...formData, phoneNumber: formattedValue });
                      }}
                      maxLength={12}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.phoneNumber ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                ${!isEditable ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}
                                dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                      readOnly={!isEditable}
                    />
                    {errors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.phoneNumber}</p>
                    )}
                  </div>

                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                              ${!isEditable ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}
                              dark:text-white
                              focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                    disabled={!isEditable}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>

                  <input
                    type="text"
                    placeholder={isEditable ? "Insert ID or Passport" : "ID Number (Auto-filled)"}
                    value={formData.identityNumber}
                    onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                    maxLength={16}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                              ${!isEditable ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}
                              dark:text-white
                              focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                    readOnly={!isEditable}
                  />

                  {/* Nationality - Only show for passport users (#00) */}
                  {isPassportUser && (
                    <div>
                      <input
                        type="text"
                        placeholder="Nationality"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg border 
                                  ${errors.nationality ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                  bg-white dark:bg-gray-800 dark:text-white
                                  focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                      />
                      {errors.nationality && (
                        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                          {errors.nationality}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Panel - Visit Details */}
            <div className="lg:col-span-8 space-y-6">
              {/* Department and Card Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Department & Card</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <select
                      value={formData.department}
                      onChange={handleDepartmentChange}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.department ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    {errors.department && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.department}</p>
                    )}
                  </div>

                  <div>
                    <select
                      value={formData.visitorCard}
                      onChange={(e) => setFormData({ ...formData, visitorCard: e.target.value })}
                      disabled={!selectedDepartment || availableCards.length === 0}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.visitorCard ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
                                disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500`}
                    >
                      <option value="">Select Visitor Card</option>
                      {availableCards.map(card => (
                        <option key={card} value={card}>{card}</option>
                      ))}
                    </select>
                    {errors.visitorCard && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.visitorCard}</p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Purpose and Items */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Visit Details</h2>
                <div className="space-y-4">
                  <div>
                    <textarea
                      placeholder="Purpose of Visit"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.purpose ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
                                min-h-[100px]`}
                    />
                    {errors.purpose && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.purpose}</p>
                    )}
                  </div>

                  <div>
                    <textarea
                      placeholder="Items Brought (Optional)"
                      value={formData.items}
                      onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                               bg-white dark:bg-gray-800 dark:text-white
                               focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
                               min-h-[100px]"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Laptop Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold dark:text-white">Laptop Information</h2>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasLaptop}
                      onChange={(e) => {
                        setHasLaptop(e.target.checked);
                        if (!e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            laptopBrand: '',
                            laptopSerial: ''
                          }));
                          setErrors(prev => ({
                            ...prev,
                            laptopBrand: '',
                            laptopSerial: ''
                          }));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 
                               text-black dark:text-white
                               focus:ring-black dark:focus:ring-white"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Visitor has a laptop
                    </span>
                  </label>
                </div>

                <AnimatePresence>
                  {hasLaptop && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <input
                          type="text"
                          placeholder="Laptop Brand"
                          value={formData.laptopBrand}
                          onChange={(e) => setFormData({ ...formData, laptopBrand: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${errors.laptopBrand ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                        />
                        {errors.laptopBrand && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.laptopBrand}</p>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Serial Number"
                          value={formData.laptopSerial}
                          onChange={(e) => setFormData({ ...formData, laptopSerial: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${errors.laptopSerial ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                        />
                        {errors.laptopSerial && (
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.laptopSerial}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Form Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end space-x-4 pt-4"
              >
                <button
                  type="button"
                  onClick={() => navigate('/check-in')}
                  disabled={isLoading}
                  className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                           text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700
                           transition-colors duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 rounded-lg bg-black dark:bg-white 
                           text-white dark:text-black
                           hover:bg-gray-800 dark:hover:bg-gray-200 
                           transition-colors duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Complete Check-In</span>
                  )}
                </button>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitorForm;