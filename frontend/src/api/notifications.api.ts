import { apiClient } from './client';
import type { Notification, PaginatedResponse } from '@/types';

export const notificationsApi = {
  list: (page = 1) =>
    apiClient.get<PaginatedResponse<Notification>>(`/notifications?page=${page}`),
  unreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) =>
    apiClient.patch<void>(`/notifications/${id}/read`, {}),
  markAllRead: () =>
    apiClient.patch<void>('/notifications/read-all', {}),
};
