import React from 'react';
import { TaskProvider } from './context/TaskContext';
import TasksContent from './components/TasksContent';

const TasksPage = () => {
  return (
    <TaskProvider>
      <TasksContent />
    </TaskProvider>
  );
};

export default TasksPage;
