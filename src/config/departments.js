// Static list of departments
const departments = [
    { id: 1, name: 'CEO Office', status: 'active' },
    { id: 2, name: 'Consumer', status: 'active' },
    { id: 3, name: 'IT', status: 'active' },
    { id: 4, name: 'Network', status: 'active' },
    { id: 5, name: 'Sales', status: 'active' },
    { id: 6, name: 'Finance', status: 'active' },
    { id: 7, name: 'Human Resources', status: 'active' },
    { id: 8, name: 'Legal', status: 'active' },
    { id: 9, name: 'Marketing', status: 'active' },
    { id: 10, name: 'Operations', status: 'active' },
    { id: 11, name: 'Research & Development', status: 'active' },
    { id: 12, name: 'Customer Support', status: 'active' }
  ];
  
  // Helper functions
  export const getAllDepartments = () => departments;
  
  export const getActiveDepartments = () => 
    departments.filter(dept => dept.status === 'active');
  
  export const getDepartmentById = (id) => 
    departments.find(dept => dept.id === id);
  
  export const getDepartmentByName = (name) => 
    departments.find(dept => dept.name.toLowerCase() === name.toLowerCase());
  
  export default departments;
  