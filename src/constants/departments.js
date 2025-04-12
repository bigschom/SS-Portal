// Static list of departments
const departments = [

    { id: 1, name: 'MTNR CEOs Office', status: 'active' },
    { id: 2, name: 'MTNR Consumer', status: 'active' },
    { id: 3, name: 'MTNR Customer Operation & Customer Experience', status: 'active' },
    { id: 4, name: 'MTNR Corporate Services', status: 'active' },
    { id: 5, name: 'MTNR EBU', status: 'active' },
    { id: 6, name: 'MTNR Finance', status: 'active' },
    { id: 7, name: 'MTNR Human Resources', status: 'active' },
    { id: 8, name: 'MTNR Internal Audit & Forencics', status: 'active' },
    { id: 9, name: 'MTNR IT', status: 'active' },
    { id: 10, name: 'MTNR Network', status: 'active' },
    { id: 11, name: 'MTNR Risk & Compliance', status: 'active' },
    { id: 12, name: 'MTNR Sales and Distribution', status: 'active' },
  
  
    { id: 20, name: 'MMRL Business Analytics & Reporting', status: 'active' },
    { id: 21, name: 'MMRL CEOs Office', status: 'active' },
    { id: 22, name: 'MMRL Commercial', status: 'active' },
    { id: 23, name: 'MMRL Finance', status: 'active' },
    { id: 24, name: 'MMRL Internal Audit', status: 'active' },
    { id: 25, name: 'MMRL Legal', status: 'active' },
    { id: 26, name: 'MMRL Operation & Service Delivery', status: 'active' },
    { id: 27, name: 'MMRL Product & Services', status: 'active' },
    { id: 28, name: 'MMRL Risk & Compliance', status: 'active' }

];

// Helper function to get all departments
export const getAllDepartments = () => {
    return departments;
};

// Helper function to get only active departments
export const getActiveDepartments = () => {
    return departments.filter(dept => dept.status === 'active');
};

export default departments;
