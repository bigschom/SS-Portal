import { motion, AnimatePresence } from 'framer-motion';

const CheckoutModal = ({ isOpen, visitor, onClose, onConfirm }) => {
  if (!isOpen || !visitor) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md m-4"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Confirm Check-out for {visitor.full_name}
          </h3>
          
          <div className="mb-6 space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Items Brought:</h4>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-gray-600 dark:text-gray-300">
                {visitor.items || 'No items recorded'}
              </div>
            </div>
            
            {visitor.laptop_brand && (
              <div>
                <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Laptop Details:</h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-gray-600 dark:text-gray-300">
                  <p>Brand: {visitor.laptop_brand}</p>
                  <p>Serial: {visitor.laptop_serial}</p>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                ⚠️ Please verify that the visitor has all their belongings before confirming check-out.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                       hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(visitor.id)}
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
            >
              Confirm Check-out
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutModal;