import { apiClient } from './client';
import type { Project, AdminStats, PMStats, DevStats } from '../types';

export const projectsApi = {
  getAll: () => apiClient.get<Project[]>('/projects').then((r) => r.data),
  getById: (id: string) => apiClient.get<Project>(`/projects/${id}`).then((r) => r.data),
  getStats: () => apiClient.get<AdminStats | PMStats | DevStats>('/projects/stats').then((r) => r.data),
  create: (data: { name: string; description?: string; clientId: string; status?: string }) =>
    apiClient.post<Project>('/projects', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; description: string; status: string; clientId: string }>) =>
    apiClient.put<Project>(`/projects/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/projects/${id}`).then((r) => r.data),
};
