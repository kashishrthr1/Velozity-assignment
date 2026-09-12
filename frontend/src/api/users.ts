import { apiClient } from './client';
import type { User } from '../types';

export const usersApi = {
  getAll: () => apiClient.get<User[]>('/users').then((r) => r.data),
  getDevelopers: () => apiClient.get<User[]>('/users/developers').then((r) => r.data),
  getById: (id: string) => apiClient.get<User>(`/users/${id}`).then((r) => r.data),
  create: (data: { email: string; password: string; name: string; role: string }) =>
    apiClient.post<User>('/users', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; email: string; role: string }>) =>
    apiClient.put<User>(`/users/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/users/${id}`).then((r) => r.data),
};
