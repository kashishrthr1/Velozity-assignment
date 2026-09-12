import { apiClient } from './client';
import type { ActivityFeedItem } from '../types';

export const activityApi = {
  getAll: () => apiClient.get<ActivityFeedItem[]>('/activity').then((r) => r.data),
  getCatchup: (since: string) =>
    apiClient.get<ActivityFeedItem[]>(`/activity/catchup?since=${encodeURIComponent(since)}`).then((r) => r.data),
};
