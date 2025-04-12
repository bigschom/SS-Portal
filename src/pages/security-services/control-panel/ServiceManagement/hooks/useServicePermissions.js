import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import { PREDEFINED_SERVICES } from '../utils/constants';

export const useServicePermissions = (userId = null) => {
  const { user } = useAuth();
  const [permittedServices, setPermittedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const targetUserId = userId || user?.id;
        if (!targetUserId) {
          setPermittedServices([]);
          return;
        }

        // Get user's explicit permissions
        const { data: permissions, error: permError } = await supabase
          .from('user_service_permissions')
          .select('service_type')
          .eq('user_id', targetUserId)
          .eq('can_view', true);

        if (permError) throw permError;

        // Get globally visible services
        const { data: visibleServices, error: visError } = await supabase
          .from('service_management')
          .select('service_type')
          .eq('is_visible', true);

        if (visError) throw visError;

        // Combine permissions
        const userPermissions = new Set(permissions?.map(p => p.service_type) || []);
        const globallyVisible = new Set(visibleServices?.map(s => s.service_type) || []);
        
        // Filter available services
        const availableServices = PREDEFINED_SERVICES.filter(service => 
          userPermissions.has(service.service_type) || globallyVisible.has(service.service_type)
        );

        setPermittedServices(availableServices);
        setError(null);
      } catch (err) {
        console.error('Error fetching service permissions:', err);
        setError(err);
        setPermittedServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, userId]);

  const refresh = () => {
    setLoading(true);
    // This will trigger the useEffect
  };

  return {
    permittedServices,
    loading,
    error,
    refresh
  };
};
