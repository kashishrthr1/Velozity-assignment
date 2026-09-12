import { apiClient } from './client';
import type { Notification } from '../types';

export const notificationsApi = {
  getAll: () => apiClient.get<Notification[]>('/notifications').then((r) => r.data),
  getUnreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),
  markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllAsRead: () => apiClient.patch('/notifications/mark-all-read').then((r) => r.data),
};
