import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import CheckoutModal from './CheckoutModal';


const CheckOut = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const handleCheckout = (visitor) => {
    setSelectedVisitor(visitor);
    setShowModal(true);
  };

  useEffect(() => {
    if (searchTerm) {
      const delayDebounce = setTimeout(() => {
        fetchVisitors();
      }, 300);

      return () => clearTimeout(delayDebounce);
    } else {
      fetchVisitors();
    }
  }, [currentPage, limit, searchTerm]);

const fetchVisitors = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('visitors')
        .select('*', { count: 'exact' })
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false });

      if (searchTerm.trim()) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,` +
          `identity_number.ilike.%${searchTerm}%,` +
          `phone_number.ilike.%${searchTerm}%,` +
          `purpose.ilike.%${searchTerm}%,` + 
          `visitor_card.ilike.%${searchTerm}%`
        );
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * limit, currentPage * limit - 1);

      if (error) throw error;

      setVisitors(data);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmCheckout = async (visitorId) => {
    try {
      const { error } = await supabase
        .from('visitors')
        .update({ 
          check_out_time: new Date().toISOString(),
          check_out_by: user?.username
        })
        .eq('id', visitorId);

      if (error) throw error;

      setShowModal(false);
      setSelectedVisitor(null);
      fetchVisitors();
      
      // Show success toast
      setToast({
        message: 'Visitor checked out successfully!',
        type: 'success'
      });

      // Automatically remove toast after 3 seconds
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Error checking out visitor:', error);
      
      // Show error toast
      setToast({
        message: 'Failed to check out visitor',
        type: 'error'
      });

      // Automatically remove toast after 3 seconds
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Toast Component
  const Toast = ({ message, type }) => (
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
      {message}
    </motion.div>
  );

 return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
      
      <main>
        <div className="p-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl">
            {/* Search Bar */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="max-w-md">
                <input
                  type="text"
                  placeholder="Search visitors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                           dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-200 w-40">Full Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-200 w-32">ID/Passport</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-200 w-32">Phone Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-200 w-28">Visitor Card</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-200 w-64">Visit Reason</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-200 w-40">Entry Time</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-200 w-32">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                      </td>
                    </tr>
                  ) : visitors.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No active visitors found
                      </td>
                    </tr>
                  ) : (
                    visitors.map((visitor) => (
                      <motion.tr
                        key={visitor.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 truncate">{visitor.full_name}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 truncate">{visitor.identity_number}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 truncate">{visitor.phone_number}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 truncate">{visitor.visitor_card}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{visitor.purpose}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {new Date(visitor.check_in_time).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleCheckout(visitor)}
                            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 
                                     transition-colors duration-200 whitespace-nowrap"
                          >
                            Check-out
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  Rows per page:
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-600
                           dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-gray-600 dark:text-gray-300">
                  Page {currentPage} of {Math.ceil(totalCount / limit)}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded border border-gray-200 dark:border-gray-600
                             disabled:opacity-50 disabled:cursor-not-allowed
                             hover:bg-gray-50 dark:hover:bg-gray-700
                             text-gray-700 dark:text-gray-200"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / limit), prev + 1))}
                    disabled={currentPage === Math.ceil(totalCount / limit)}
                    className="px-4 py-2 rounded border border-gray-200 dark:border-gray-600
                             disabled:opacity-50 disabled:cursor-not-allowed
                             hover:bg-gray-50 dark:hover:bg-gray-700
                             text-gray-700 dark:text-gray-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CheckoutModal
        isOpen={showModal}
        visitor={selectedVisitor}
        onClose={() => {
          setShowModal(false);
          setSelectedVisitor(null);
        }}
        onConfirm={confirmCheckout}
      />
    </div>
  );
};

export default CheckOut;