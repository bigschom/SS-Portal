import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import apiService from './config/api-service';
import { getRoleBasedDashboard } from './utils/roleRoutes';
import ProtectedRoute from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from './components/common/Toast';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
 
// Pages
import LoginPage from './pages/Login/Login';
import UserManagement from './pages/UserManagement/UserManagement';
import Unauthorized from './pages/Unauthorized';

// Dashboard Pages
import AdminDashboard from './pages/dashboard/AdminDashboard';
import UserDashboard from './pages/dashboard/UserDashboard';

// Background Check Pages
import NewRequest from './pages/background-checks/NewRequest';
import UpdateBackgroundChecks from './pages/background-checks/UpdateRequest';
import AllBackgroundChecks from './pages/background-checks/AllRequest';
import BackgroundCheckReport from './pages/report/BackgroundCheckReport';
import DeleteBackgroundChecks from './pages/background-checks/DeleteBackgroundChecks';

// internship Check Pages
import NewInternshipRequest from './pages/internship-checks/NewInternshipRequest';
import UpdateInternshipRequest from './pages/internship-checks/UpdateInternshipRequest';
import AllInternshipChecks from './pages/internship-checks/AllInternshipChecks';
import DeleteInternshipChecks from './pages/internship-checks/DeleteInternshipChecks';
import InternshipOverview from './pages/internship-checks/InternshipOverview';
import InternshipReport from './pages/report/InternshipReport';

// Stakeholder Pages
import NewStakeHRequest from './pages/stakeholder/NewRequest';
import UpdateStakeHRequests from './pages/stakeholder/UpdateRequest';
import AllStakeHRequests from './pages/stakeholder/AllRequest';
import StakeholderReport from './pages/report/StakeholderReport';
import DeleteStakeHRequests from './pages/stakeholder/DeleteStakeHRequests';

// Service
import QueueManagement from './pages/security-services/control-panel/QueueManagement';
import SecurityServices from './pages/security-services/new-request';

import { TaskProvider } from './pages/security-services/task/context/TaskContext';
//import ServiceManagementPage from './pages/security-services/service-management/ServiceManagementPage';
//import QueueManagementPage from './pages/security-services/queue-management/QueueManagementPage';
//import DashboardPage from './pages/security-services/dashboard/DashboardPage';
import SecurityServicesReport from './pages/report/SecurityServicesReport';



//task
import TasksPage from './pages/security-services/task/index';

// GuardShiftForm Pages
import GuardShiftForm from './pages/guardshift/GuardShiftForm';
import GuardShiftReport from './pages/report/GuardShiftReport';
import GuardShiftReport1 from './pages/report/GuardShiftReport1';

// Equipment Movements 
import EquipmentMovementLog from './pages/equipment-movement/EquipmentMovementLog';
import EquipmentMovementReport from './pages/report/EquipmentMovementReport';
import EquipmentDatabaseManagement from './pages/equipment-movement/EquipmentDatabaseManagement';

// Contact Page
import Contact from './pages/Contact';

// TaskPageWrapper component to provide TaskContext
const TaskPageWrapper = () => {
  return (
    <TaskProvider>
      <TasksPage />
    </TaskProvider>
  );
};

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a]" />
  </div>
);

// Root redirect component to prevent infinite loops
const RootRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [redirected, setRedirected] = useState(false);
  
  useEffect(() => {
    if (!loading && !redirected) {
      const destination = user ? getRoleBasedDashboard(user.role) : "/login";
      navigate(destination, { replace: true });
      setRedirected(true);
    }
  }, [user, navigate, redirected, loading]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a] dark:text-white" />
    </div>
  );
};

const AuthenticatedLayout = ({ children }) => {
  const { checkTokenExpiration } = useAuth();
  
  // Check if token is valid on each authenticated page render
  useEffect(() => {
    checkTokenExpiration();
  }, [checkTokenExpiration]);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="flex-grow py-10">{children}</main>
      <Footer />
    </div>
  );
};

const App = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize dark mode based on system preference or stored value
  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);
  
  // Prevent back button after logout
  useEffect(() => {
    const handlePopState = (event) => {
      const userLoggedOut = sessionStorage.getItem('userLoggedOut') === 'true';
      
      // If user is logged out and trying to access a protected route
      if (userLoggedOut && location.pathname !== '/login') {
        // Prevent the navigation
        navigate('/login', { replace: true });
        
        // Show a toast notification if available
        if (window.toastService) {
          window.toastService.warning('Your session has ended. Please log in again.');
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, location]);

  // Track user activity to prevent session timeouts
  useEffect(() => {
    // Function to handle inactivity and session timeout
    const checkAndHandleInactivity = async () => {
      if (!user) return;

      try {
        // Track activity
        await apiService.auth.trackActivity();

        // Optional: Check for potential timeout
        const activityCheck = await apiService.auth.getCurrentActivity();
        
        // If the backend indicates session should be terminated
        if (activityCheck?.shouldLogout) {
          logout();
          navigate('/login');
          
          if (window.toastService) {
            window.toastService.warning('Your session has expired due to inactivity.');
          }
        }
      } catch (error) {
        console.error('Error during activity tracking:', error);
        
        // Fallback logout mechanism
        if (error.response?.status === 401) {
          logout();
          navigate('/login');
        }
      }
    };
    
    // Track activity immediately and then every 15 minutes
    checkAndHandleInactivity();
    const activityInterval = setInterval(checkAndHandleInactivity, 15 * 60 * 1000);
    
    // Set up global event listeners for user activity
    const resetActivityTimer = () => {
      if (user) {
        checkAndHandleInactivity();
      }
    };

    // Listen to various user interaction events
    window.addEventListener('mousemove', resetActivityTimer);
    window.addEventListener('keydown', resetActivityTimer);
    window.addEventListener('click', resetActivityTimer);
    window.addEventListener('scroll', resetActivityTimer);
    
    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('mousemove', resetActivityTimer);
      window.removeEventListener('keydown', resetActivityTimer);
      window.removeEventListener('click', resetActivityTimer);
      window.removeEventListener('scroll', resetActivityTimer);
    };
  }, [user, logout, navigate]);

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <>
      {/* Global Toast Container */}
      <ToastContainer />
      
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={user ? <Navigate to={getRoleBasedDashboard(user.role)} replace /> : <LoginPage />} />

          {/* Dashboard routes */}
          <Route path="/admindashboard" element={<ProtectedRoute requiredRoles={['admin']}><AuthenticatedLayout><AdminDashboard /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/userdashboard" element={<ProtectedRoute requiredRoles={['admin','superuser','standarduser', 'security_guard','user', 'user1', 'user2']}><AuthenticatedLayout><UserDashboard /></AuthenticatedLayout></ProtectedRoute>} />
          
          {/* User Management routes */}
          <Route path="/user-management" element={<ProtectedRoute requiredRoles={['admin']}><AuthenticatedLayout><UserManagement /></AuthenticatedLayout></ProtectedRoute>} />

          {/* Background Check routes */}
          <Route path="/new-request" element={<ProtectedRoute requiredRoles={['admin','user', 'user1']}><AuthenticatedLayout><NewRequest /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/update-background-checks/:id" element={<ProtectedRoute requiredRoles={['admin','user', 'user1']}><AuthenticatedLayout><UpdateBackgroundChecks /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/all-background-checks" element={<ProtectedRoute requiredRoles={['admin','user', 'user1']}><AuthenticatedLayout><AllBackgroundChecks /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/backgroundcheckreport" element={<ProtectedRoute requiredRoles={['admin','user', 'user1']}><AuthenticatedLayout><BackgroundCheckReport /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/delete-background-checks" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><DeleteBackgroundChecks /></AuthenticatedLayout></ProtectedRoute>} />

          {/* internship Check routes */}
          <Route path="/new-internship-request" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><NewInternshipRequest /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/update-internship-request/:id" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><UpdateInternshipRequest /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/all-Internship-checks" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><AllInternshipChecks /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/delete-internship-checks" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><DeleteInternshipChecks /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/internship-overview" element={<ProtectedRoute requiredRoles={['admin', 'security_guard','user']}><AuthenticatedLayout><InternshipOverview /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/internship-report" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><InternshipReport /></AuthenticatedLayout></ProtectedRoute>} />

          {/* Stakeholder routes */}
          <Route path="/new-stake-holder-request" element={<ProtectedRoute requiredRoles={['admin','user', 'user2']}><AuthenticatedLayout><NewStakeHRequest /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/update-stake-holder-request/:id" element={<ProtectedRoute requiredRoles={['admin','user', 'user2']}><AuthenticatedLayout><UpdateStakeHRequests /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/all-stake-holder-request" element={<ProtectedRoute requiredRoles={['admin','user','user2']}><AuthenticatedLayout><AllStakeHRequests /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/stakeholderreport" element={<ProtectedRoute requiredRoles={['admin','user', 'user2']}><AuthenticatedLayout><StakeholderReport /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/delete-stake-holder-requests" element={<ProtectedRoute requiredRoles={['admin','user', 'user2']}><AuthenticatedLayout><DeleteStakeHRequests /></AuthenticatedLayout></ProtectedRoute>} />

          {/* Security service routes */}
          <Route path="/security-services/new-request" element={<ProtectedRoute requiredRoles={['admin','standarduser', 'security_guard','user', 'user1', 'user2']}><AuthenticatedLayout><SecurityServices /></AuthenticatedLayout></ProtectedRoute>} />

          {/* Task routes */}
          <Route path="/security-services/task" element={<ProtectedRoute requiredRoles={['admin', 'standarduser', 'security_guard','user', 'user1', 'user2']}><AuthenticatedLayout><TaskPageWrapper /></AuthenticatedLayout></ProtectedRoute>} />

          {/* Under Maintainance routes 
          <Route path="/security-services/queue-management" element={<ProtectedRoute requiredRoles={['admin', 'user']}><AuthenticatedLayout><QueueManagementPage /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/security-services/service-management" element={<ProtectedRoute requiredRoles={['admin', 'user']}><AuthenticatedLayout><ServiceManagementPage /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/security-services/dashboard-page" element={<ProtectedRoute requiredRoles={['admin', 'user']}><AuthenticatedLayout><DashboardPage /></AuthenticatedLayout></ProtectedRoute>} />
            */}

          <Route path="/security-services/security-services-report" element={<ProtectedRoute requiredRoles={['admin', 'user']}><AuthenticatedLayout><SecurityServicesReport /></AuthenticatedLayout></ProtectedRoute>} />

          {/* GuardShift routes */}
          <Route path="/guard-shift" element={<ProtectedRoute requiredRoles={['admin','user','security_guard']}><AuthenticatedLayout><GuardShiftForm /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/guard-shift-report" element={<ProtectedRoute requiredRoles={['admin','user','standarduser']}><AuthenticatedLayout><GuardShiftReport /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/guard-shift-report-1" element={<ProtectedRoute requiredRoles={['admin','user','standarduser']}><AuthenticatedLayout><GuardShiftReport1 /></AuthenticatedLayout></ProtectedRoute>} />

          {/* Equipment Routes */} 
          <Route path="/equipment-movement" element={<ProtectedRoute requiredRoles={['admin','user','security_guard']}><AuthenticatedLayout><EquipmentMovementLog /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="Equipment-database-management" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><EquipmentDatabaseManagement /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/equipment-movement-report" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><EquipmentMovementReport /></AuthenticatedLayout></ProtectedRoute>} />

          {/* Contact route */}
          <Route path="/contact" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><Contact /></AuthenticatedLayout></ProtectedRoute>} />

          {/* Root route redirect - using a component to prevent infinite loops */}
          <Route path="/" element={<RootRedirect />} />

          {/* Unauthorized and catch-all routes */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/unauthorized" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;