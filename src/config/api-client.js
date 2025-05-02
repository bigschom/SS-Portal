// src/config/api-client.js
import axios from 'axios';

// Set base URL from environment variable
let API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  // If no explicit API URL is provided, construct it dynamically
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (isDevelopment) {
    // In development, connect to the server on localhost or the current hostname
    // The backend should be running on port 5000
    const hostname = window.location.hostname;
    API_URL = `http://${hostname}:5000/api`;
    
    console.log('Development API URL:', API_URL);
  } else {
    // In production, default to relative path
    API_URL = '/api';
  }
}

// Create axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for cookie-based auth
});

// Add auth token if available
apiClient.interceptors.request.use(config => {
  // Try sessionStorage first since that's where we're storing the user now
  const user = sessionStorage.getItem('user');
  
  if (user) {
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser && parsedUser.token) {
        config.headers.Authorization = `Bearer ${parsedUser.token}`;
      }
    } catch (error) {
      console.error('Error parsing user from sessionStorage:', error);
    }
  }
  return config;
});

// Add response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Token expired or unauthorized, redirecting to login');
      // Don't redirect if we're already on the login page
      if (!window.location.pathname.includes('/login')) {
        // Optional: clear any stored session data
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('tempUser');
        sessionStorage.removeItem('passwordChangeRequired');
        
        // Redirect to login page
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;