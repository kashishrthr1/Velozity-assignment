import { apiClient } from './client';
import type { Task, TaskFilters } from '../types';

function buildTaskQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.dueDateFrom) params.set('dueDateFrom', filters.dueDateFrom);
  if (filters.dueDateTo) params.set('dueDateTo', filters.dueDateTo);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export const tasksApi = {
  getByProject: (projectId: string, filters: TaskFilters = {}) =>
    apiClient.get<Task[]>(`/tasks/${projectId}${buildTaskQuery(filters)}`).then((r) => r.data),
  getById: (id: string) => apiClient.get<Task>(`/tasks/single/${id}`).then((r) => r.data),
  create: (data: {
    title: string;
    description?: string;
    projectId: string;
    assignedToId?: string;
    status?: string;
    priority?: string;
    dueDate: string;
  }) => apiClient.post<Task>('/tasks', data).then((r) => r.data),
  update: (id: string, data: Partial<{ title: string; description: string; assignedToId: string | null; status: string; priority: string; dueDate: string }>) =>
    apiClient.put<Task>(`/tasks/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/tasks/${id}`).then((r) => r.data),
};
