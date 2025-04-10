// src/components/common/Toast.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

const Toast = ({ type = 'success', message, duration = 5000, onClose }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(), 300); // Allow animation to complete
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-white" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-white" />;
      default:
        return <CheckCircle className="w-5 h-5 text-white" />;
    }
  };
  
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 dark:bg-green-600';
      case 'warning':
        return 'bg-amber-500 dark:bg-amber-600';
      case 'error':
        return 'bg-red-500 dark:bg-red-600';
      default:
        return 'bg-blue-500 dark:bg-blue-600';
    }
  };
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg ${getBackgroundColor()}`}
          role="alert"
        >
          <div className="flex items-center">
            <div className="mr-3">
              {getIcon()}
            </div>
            <div className="text-white font-medium mr-6">
              {message}
            </div>
            <button
              onClick={() => {
                setVisible(false);
                setTimeout(() => onClose(), 300);
              }}
              className="ml-auto bg-transparent text-white rounded-lg p-1.5 hover:bg-white/20 inline-flex items-center justify-center"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ToastContainer to manage multiple toasts
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  
  const addToast = (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };
  
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };
  
  // Create a global toast service
  if (typeof window !== 'undefined' && !window.toastService) {
    window.toastService = {
      success: (message, duration) => addToast({ type: 'success', message, duration }),
      warning: (message, duration) => addToast({ type: 'warning', message, duration }),
      error: (message, duration) => addToast({ type: 'error', message, duration }),
      info: (message, duration) => addToast({ type: 'info', message, duration }),
      remove: removeToast
    };
  }
  
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration || 5000}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;