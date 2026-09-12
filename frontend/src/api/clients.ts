import { apiClient } from './client';
import type { Client } from '../types';

export const clientsApi = {
  getAll: () => apiClient.get<Client[]>('/clients').then((r) => r.data),
  getById: (id: string) => apiClient.get<Client>(`/clients/${id}`).then((r) => r.data),
  create: (data: { name: string; email: string; phone?: string; company: string }) =>
    apiClient.post<Client>('/clients', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; email: string; phone: string; company: string }>) =>
    apiClient.put<Client>(`/clients/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/clients/${id}`).then((r) => r.data),
};
