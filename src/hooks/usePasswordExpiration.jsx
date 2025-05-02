// src/hooks/usePasswordExpiration.js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';

const PASSWORD_EXPIRATION_DAYS = 90; // 3 months
const PASSWORD_WARNING_DAYS = 10; // 10 days before expiration

export const usePasswordExpiration = () => {
  const { user } = useAuth();
  const [passwordExpirationWarning, setPasswordExpirationWarning] = useState(null);

  useEffect(() => {
    if (!user || !user.password_last_changed) return;

    const lastChangedDate = new Date(user.password_last_changed);
    const currentDate = new Date();
    const daysSinceLastChange = Math.floor(
      (currentDate - lastChangedDate) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastChange >= PASSWORD_EXPIRATION_DAYS) {
      // Password has expired
      return {
        isExpired: true,
        message: 'Your password has expired. Please change it immediately.'
      };
    }

    if (daysSinceLastChange >= PASSWORD_EXPIRATION_DAYS - PASSWORD_WARNING_DAYS) {
      // Within 10 days of expiration
      const daysRemaining = PASSWORD_EXPIRATION_DAYS - daysSinceLastChange;
      setPasswordExpirationWarning(`Your password will expire in ${daysRemaining} days. Please change it soon.`);
    }

    return {
      isExpired: false,
      warning: passwordExpirationWarning
    };
  }, [user]);

  return passwordExpirationWarning;
};