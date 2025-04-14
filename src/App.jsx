import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
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
import InternshipOverview from './pages/background-checks/InternshipOverview';
import AllBackgroundChecks from './pages/background-checks/AllRequest';
import BackgroundCheckReport from './pages/report/BackgroundCheckReport';

// Stakeholder Pages
import NewStakeHRequest from './pages/stakeholder/NewRequest';
import UpdateStakeHRequests from './pages/stakeholder/UpdateRequest';
import AllStakeHRequests from './pages/stakeholder/AllRequest';
import StakeholderReport from './pages/report/StakeholderReport';

// Service
//import QueueManagement from './pages/security-services/control-panel/QueueManagement';
// import SecurityServices from './pages/security-services/new-request';
// import TaskManagement from './pages/security-services/task';

// GuardShiftForm Pages
import GuardShiftForm from './pages/guardshift/GuardShiftForm';
import GuardShiftReport from './pages/report/GuardShiftReport';

// Equipment Movements 
//import EquipmentMovementLog from './pages/equipment-movement/EquipmentMovementLog';
//import EquipmentMovementReport from './pages/report/EquipmentMovementReport';

// Cleaner Profile Book
//import CleanerProfileBook from './pages/cleaner-profiles/cleaner-profile-book';

// Security Technical Issue 

//import SecurityIssueBook from './pages/security-technical-issues/security-issue-book';
//import TechnicianFillPage from './pages/technician-fill/technician-fill-page'

// Contact Page
import Contact from './pages/Contact';

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
  const { user, loading } = useAuth();
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
    if (!user) return;

    const trackActivity = async () => {
      try {
        // This is implemented in your updated api-service.js
        const response = await fetch('/api/auth/track-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (!response.ok) {
          console.warn('Failed to track user activity');
        }
      } catch (error) {
        console.error('Error tracking activity:', error);
      }
    };
    
    // Track activity every 15 minutes
    const activityInterval = setInterval(trackActivity, 15 * 60 * 1000);
    
    return () => {
      clearInterval(activityInterval);
    };
  }, [user]);

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
          <Route path="/internshipoverview" element={<ProtectedRoute requiredRoles={['admin',, 'security_guard','user']}><AuthenticatedLayout><InternshipOverview /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/all-background-checks" element={<ProtectedRoute requiredRoles={['admin','user', 'user1']}><AuthenticatedLayout><AllBackgroundChecks /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/backgroundcheckreport" element={<ProtectedRoute requiredRoles={['admin','user', 'user1']}><AuthenticatedLayout><BackgroundCheckReport /></AuthenticatedLayout></ProtectedRoute>} />
          
          {/* Stakeholder routes */}
          <Route path="/new-stake-holder-request" element={<ProtectedRoute requiredRoles={['admin','user', 'user2']}><AuthenticatedLayout><NewStakeHRequest /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/update-stake-holder-request/:id" element={<ProtectedRoute requiredRoles={['admin','user', 'user2']}><AuthenticatedLayout><UpdateStakeHRequests /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/all-stake-holder-request" element={<ProtectedRoute requiredRoles={['admin','user','user2']}><AuthenticatedLayout><AllStakeHRequests /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/stakeholderreport" element={<ProtectedRoute requiredRoles={['admin','user', 'user2']}><AuthenticatedLayout><StakeholderReport /></AuthenticatedLayout></ProtectedRoute>} />

            {/* Security service routes */}{/*
          <Route path="/security-services/control-panel/queue-management" element={<ProtectedRoute requiredRoles={['admin','user']}> <AuthenticatedLayout> <QueueManagement /> </AuthenticatedLayout> </ProtectedRoute>}/>
          
          {/* Add routes for other security service pages when they're ready */}
           {/*
          <Route path="/security-services/new-request" element={<ProtectedRoute requiredRoles={['admin', 'user']}> <AuthenticatedLayout> <SecurityServices /> </AuthenticatedLayout> </ProtectedRoute>}/>
          <Route path="/security-services/task" element={<ProtectedRoute requiredRoles={['admin', 'user']}><AuthenticatedLayout> <TaskManagement /> </AuthenticatedLayout> </ProtectedRoute>}/>
          */}

          {/* GuardShift routes */}
          <Route path="/guard-shift" element={<ProtectedRoute requiredRoles={['admin','user','security_guard']}><AuthenticatedLayout><GuardShiftForm /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/guard-shift-report" element={<ProtectedRoute requiredRoles={['admin','user','standarduser']}><AuthenticatedLayout><GuardShiftReport /></AuthenticatedLayout></ProtectedRoute>} />



          {/* Equipment Routes 
          <Route path="/equipment-movement" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><EquipmentMovementLog /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/equipment-movement-report" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><EquipmentMovementReport /></AuthenticatedLayout></ProtectedRoute>} />

          */}  

            {/* Cleaners Routes 
          <Route path="/cleaner-profile-book" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><CleanerProfileBook /></AuthenticatedLayout></ProtectedRoute>} />

          */}


          {/* Security technical Routes 
          <Route path="/security-issue-book" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><SecurityIssueBook /></AuthenticatedLayout></ProtectedRoute>} />
          <Route path="/security-technician-fill-page" element={<ProtectedRoute requiredRoles={['admin','user']}><AuthenticatedLayout><TechnicianFillPage /></AuthenticatedLayout></ProtectedRoute>} />
          
          */}

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