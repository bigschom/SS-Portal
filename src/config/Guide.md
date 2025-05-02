# API Service Refactoring Guide

This guide outlines how to refactor the large `api-service.js` file into a modular structure that's more maintainable and organized.

## 1. Project Structure

```
/src
├── config/
│   ├── api-client.js         # Base API client configuration
│   ├── api-service.js        # Main API service that imports modules
│   └── endpoints.js          # Optional - API endpoint configuration
│
├── services/
│   ├── auth-service.js       # Authentication related endpoints
│   ├── user-service.js       # User management related endpoints
│   ├── background-service.js # Background checks related endpoints
│   ├── stakeholder-service.js # Stakeholder requests endpoints
│   ├── guard-service.js      # Guard shift reports endpoints
│   ├── security-service.js   # Security components endpoints
│   ├── queue-service.js      # Queue management endpoints
│   ├── notification-service.js # Notification related endpoints
│   ├── task-service.js       # Task management endpoints
│   └── activity-log-service.js # Activity logging endpoints
│
└── utils/
    ├── cache-utils.js        # Request caching utilities
    └── queue-utils.js        # Request queue utilities
```

## 2. Implementation Steps (Continued)

### Step 1: Create the Base Configuration

1. Create the `api-client.js` file in the `config` directory.
   - Move all API client configuration, interceptors, and URL setup from the original file.

2. Create utility files in the `utils` directory.
   - Move the request queue and cache implementations.

### Step 2: Split Into Service Modules

For each service area (auth, users, etc.):

1. Create a dedicated service file (e.g., `auth-service.js`, `user-service.js`).
2. Copy the related methods from the original file.
3. Replace references to other parts of the original file with imports.
4. Export the service as a default export.

### Step 3: Create the Main API Service

1. Create the new `api-service.js` file in the `config` directory.
2. Import each service module.
3. Export an object that combines all services.
4. Update any imports in your application components to use the new structure.

### Step 4: Refactor Usage in Components

When migrating, you have two options:

1. **Keep the original import paths**: The new main API service exports services with the same names, so components don't need to change their usage.
   ```javascript
   // Before and after refactoring, this will work:
   import apiService from '@/config/api-service';
   apiService.users.getAllUsers();
   ```

2. **Import specific services**: For improved code organization, you might want to update components to import only the services they need:
   ```javascript
   // More specific import after refactoring:
   import userService from '@/services/user-service';
   userService.getAllUsers();
   ```

## 3. Benefits of This Approach

1. **Improved Code Organization**: Each service has its own dedicated file, making the codebase more navigable.

2. **Better Maintainability**: Smaller files are easier to understand, modify, and test.

3. **Enhanced Collaboration**: Different team members can work on different services without merge conflicts.

4. **Code Reuse**: Services can be imported individually where needed, reducing bundle size.

5. **Easier Testing**: Each service can be tested independently.

## 4. Implementation Example for Background Service

```javascript
// src/services/background-service.js
import apiClient from '../config/api-client.js';
import departments, { getActiveDepartments } from '../constants/departments.js';
import { ROLE_TYPES } from '../constants/roleTypes.js';

const backgroundService = {
  getDepartments() {
    return getActiveDepartments();
  },
  
  getRoleTypes() {
    return ROLE_TYPES;
  },
  
  async checkDuplicateId(idNumber) {
    try {
      const response = await apiClient.get(`/background-checks/check-id/${idNumber}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  // More methods...
};

export default backgroundService;
```

## 5. Tips for a Smooth Transition

1. **Refactor Incrementally**: Start with one service at a time, test it, then move on to the next.

2. **Use a Feature Flag**: If possible, implement a feature flag to switch between old and new implementations during testing.

3. **Maintain API Compatibility**: Ensure the public API of your services remains consistent to minimize changes in components.

4. **Update Documentation**: Document the new structure and update any API documentation.

5. **Run Full Test Suite**: After refactoring, run your full test suite to ensure nothing was broken.

6. **Consider Dependency Injection**: For advanced scenarios, consider using a dependency injection pattern to handle service dependencies.

## 6. Common Pitfalls to Avoid

1. **Circular Dependencies**: Be careful not to create circular imports between services.

2. **Inconsistent Error Handling**: Maintain consistent error handling patterns across all services.

3. **Duplicated Code**: Look for common patterns that could be extracted into shared utilities.

4. **Incompatible Type Definitions**: If using TypeScript, ensure type definitions are consistent across services.

5. **Missing Re-exports**: If components expect certain utilities to be available from the main API service, make sure to re-export them.

By following this guide, you'll transform a monolithic API service into a modular, maintainable set of services that will scale better with your application's growth.













# API Service Refactoring Implementation Steps

Follow these step-by-step instructions to refactor your large `api-service.js` file into a modular structure.

## 1. Create Folder Structure

First, create the necessary folder structure:

```
mkdir -p src/config
mkdir -p src/services
mkdir -p src/utils
```

## 2. Create Base Files

### Step 1: Create API Client Configuration

Create the `src/config/api-client.js` file by copying the API client configuration from your original file, including:
- Base URL setup
- Axios instance creation
- Interceptors for auth token and response handling

### Step 2: Create Utility Files

Create the following utility files:

- `src/utils/queue-utils.js` for the request queue implementation
- `src/utils/cache-utils.js` for the request cache implementation

## 3. Create Service Modules

For each service area, create a dedicated service file in the `src/services` directory:

1. `auth-service.js`: Authentication related endpoints
2. `user-service.js`: User management related endpoints
3. `background-service.js`: Background checks related endpoints
4. `stakeholder-service.js`: Stakeholder requests related endpoints
5. `guard-service.js`: Guard shift reports related endpoints
6. `security-service.js`: Security components related endpoints
7. `queue-service.js`: Queue management related endpoints
8. `notification-service.js`: Notification related endpoints
9. `task-service.js`: Task management related endpoints
10. `activity-log-service.js`: Activity logging related endpoints

Copy the relevant methods from the original file to each service module.

## 4. Create Main API Service

Create the `src/config/api-service.js` file that imports and exports all services:

```javascript
// src/config/api-service.js
import apiClient from './api-client.js';
import { requestCache } from '../utils/cache-utils.js';

// Import all service modules
import authService from '../services/auth-service.js';
import userService from '../services/user-service.js';
import backgroundService from '../services/background-service.js';
// Import other services...

// Export all services as a single object
export default {
  auth: authService,
  users: userService,
  backgroundChecks: backgroundService,
  // Export other services...
  apiClient,
  
  // Add any utility methods
  utils: {
    clearCaches() {
      requestCache.clear();
      securityService.invalidateCache();
      console.log('All service caches cleared');
    }
  }
};
```

## 5. Test the Refactored Structure

1. Build your application with the refactored code structure.
2. Test each functionality to ensure it works as expected.
3. Check for any console errors related to imports or missing functionality.

## 6. Update Import Paths

If you want to allow direct imports of specific services, update your components to use the new import paths:

```javascript
// Before:
import apiService from '@/config/api-service';
const users = await apiService.users.getAllUsers();

// After - Option 1 (maintain compatibility):
import apiService from '@/config/api-service';
const users = await apiService.users.getAllUsers();

// After - Option 2 (direct import):
import userService from '@/services/user-service';
const users = await userService.getAllUsers();
```

## 7. Clean Up

After verifying that everything works correctly, you can safely delete the original `api-service.js` file.

## Example: Creating the security-service.js Module

```javascript
// src/services/security-service.js
import apiClient from '../config/api-client.js';

// Method to get current user ID from session storage
const getCurrentUserId = () => {
  const userStr = sessionStorage.getItem('user');
  if (userStr) {
    try {
      const userData = JSON.parse(userStr);
      return userData.id;
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  return null;
};

// Security services related endpoints
const securityService = {
  // Copy methods from the original file
  // Replace references to other parts with imports
  // ...
};

export default securityService;
```

By following these steps, you'll successfully refactor your monolithic API service into a modular, maintainable structure.












# Testing and Integration Guide

After implementing the modular API service structure, follow this guide to ensure everything works as expected.

## Testing Strategy

### 1. Incremental Testing

Start by testing one service at a time:

1. **Begin with core services**: Start with authentication and user services as they're often used by other services
2. **Test each service independently**: Before integrating, make sure each service works on its own
3. **Test the main API service**: Ensure the main `api-service.js` correctly exposes all the individual services

### 2. Test Components that Use the API

After setting up the new structure:

1. **Test existing components**: Without changing their imports, they should continue to work with the new structure
2. **Check the network tab**: Make sure API calls are being made correctly
3. **Verify data flow**: Ensure data is correctly passed to and from the API

## Debugging Common Issues

### Import Path Issues

If you encounter import errors:

```javascript
// Check that the paths are correct
import apiClient from '../config/api-client.js';  // Path may vary based on file location
```

### Missing Methods or Properties

If a component complains about missing methods:

1. Check that all methods from the original file were copied to the appropriate service
2. Verify that the main API service is re-exporting all services with the correct names

### Authentication Issues

If you encounter authentication failures:

1. Ensure `api-client.js` has the correct interceptors for adding auth tokens
2. Verify that the token is being stored correctly in session storage

## Using the New Services in Components

### Option 1: Continue Using the Main API Service

This approach requires no changes to existing components:

```javascript
import apiService from '@/config/api-service';

// Use as before
apiService.users.getAllUsers().then(users => {
  // Handle users
});
```

### Option 2: Use Specific Services Directly

For new components or when refactoring, you can import specific services:

```javascript
import userService from '@/services/user-service';
import securityService from '@/services/security-service';

// Use services directly
userService.getAllUsers().then(users => {
  // Handle users
});

securityService.getAvailableServices().then(services => {
  // Handle services
});
```

## Rollback Plan

If issues arise during the transition, have a rollback plan:

1. Keep the original `api-service.js` file backed up
2. Use feature flags if possible to switch between old and new implementations
3. Be prepared to revert to the original file if major issues are encountered

## Performance Considerations

The modular approach offers potential performance benefits:

1. **Code splitting**: When using direct imports, only the needed services are loaded
2. **Reduced bundle size**: Components only import what they need
3. **Better caching**: Smaller, more focused files can be cached more effectively

## Next Steps

After successfully implementing the modular structure:

1. **Update documentation**: Document the new service structure
2. **Refactor components**: Gradually update components to use direct service imports
3. **Consider TypeScript**: If you're using TypeScript, add proper type definitions for all services
4. **Implement automated tests**: Add unit tests for each service

By following this guide, you'll ensure a smooth transition to the modular API service structure while maintaining compatibility with existing code.