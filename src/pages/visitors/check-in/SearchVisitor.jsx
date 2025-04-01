import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { visitorService } from '../../services/visitorService';
import { useAuth } from '../../hooks/useAuth';

const SearchVisitor = () => {
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Handle special case when # is typed
  useEffect(() => {
    if (searchInput === '#') {
      // Automatically append "00" to "#" to create "#00"
      setSearchInput('#00');
    }
  }, [searchInput]);

  const handleInputChange = (e) => {
    let value = e.target.value;
    
    // Handle # character (for passport mode)
    if (value === '#') {
      value = '#';
    }
    // Handle passport mode case "#00"
    else if (value.startsWith('#')) {
      value = value.slice(0, 3); // Only allow "#00"
    }
    // Handle phone number starting with 250
    else if (value.startsWith('250')) {
      value = value.slice(0, 12);
    } 
    // Handle ID number
    else {
      value = value.slice(0, 16); 
    }

    setSearchInput(value);
    setError('');
    setShowAlert(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (searchInput.trim() === '') {
      setError('Please enter an ID, Phone number, or #00 for Passport');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Handle passport case
      if (searchInput === '#00') {
        navigate('/check-in/form', { 
          state: { 
            isPassport: true,
            isNewVisitor: true 
          } 
        });
        return;
      }

      // Validate input format
      if (searchInput.startsWith('250') && searchInput.length !== 12) {
        throw new Error('Phone number must be 12 digits including 250');
      } else if (!searchInput.startsWith('250') && !searchInput.startsWith('#') && searchInput.length !== 16) {
        throw new Error('ID number must be 16 digits');
      }

      console.log('Searching for visitor with input:', searchInput);
      const result = await visitorService.searchVisitor(searchInput);
      console.log('Search result:', result);
      
      if (!result) {
        const message = searchInput.startsWith('250') 
          ? 'Phone number not found'
          : 'ID number not found';
        setShowAlert(true);
        setError(message);
        return;
      }

      if (result.error) {
        setShowAlert(true);
        setError(result.error);
        return;
      }

      navigate('/check-in/form', { 
        state: { 
          visitor: result,
          isNewVisitor: result.isNewVisitor 
        } 
      });

    } catch (error) {
      console.error('Search error:', error);
      setError(error.message || 'An error occurred during search');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 flex-grow flex items-center justify-center">
        <div className="w-full max-w-xl">
          {/* Search Container */}
          <motion.div
            className="z-10"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <form onSubmit={handleSearch} className="relative mb-8">
              <input
                ref={inputRef}
                type="text"
                maxLength={16}
                className="w-full h-16 px-6 pr-12 text-lg
                  bg-gray-100 dark:bg-gray-800 
                  text-gray-900 dark:text-white
                  border-2 border-gray-200 dark:border-gray-700 
                  rounded-3xl shadow-xl
                  focus:outline-none focus:border-black dark:focus:border-gray-500 
                  transition-all duration-300
                  hover:shadow-2xl
                  placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter ID, Phone Number, or #00 for Passport"
                value={searchInput}
                onChange={handleInputChange}
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2
                  w-8 h-8 flex items-center justify-center
                  text-gray-400 dark:text-gray-500 
                  hover:text-black dark:hover:text-white 
                  transition-colors"
              >
                {isLoading ? (
                  <motion.div
                    className="w-6 h-6 border-2 border-current border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <motion.svg
                    className="w-6 h-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </motion.svg>
                )}
              </button>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full mt-2 text-red-500 dark:text-red-400 text-sm text-center w-full"
                >
                  {error}
                </motion.p>
              )}
            </form>

            {/* Search Guide */}
            <motion.div
              className="bg-gray-100 dark:bg-gray-800 rounded-3xl p-6 shadow-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Search Guide</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p className="flex items-center">
                  <span className="mr-2 text-black dark:text-white">•</span> 
                  ID: requires 16 digits
                </p>
                <p className="flex items-center">
                  <span className="mr-2 text-black dark:text-white">•</span> 
                  Phone Number: 2507********
                </p>
                <p className="flex items-center">
                  <span className="mr-2 text-black dark:text-white">•</span> 
                  For Passport users: Type # and the system will automatically enter Passport mode
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SearchVisitor;