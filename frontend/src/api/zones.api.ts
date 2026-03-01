import { apiClient } from './client';
import type { Zone } from '@/types';

export const zonesApi = {
  list: () => apiClient.get<Zone[]>('/zones'),
  byId: (id: string) => apiClient.get<Zone>(`/zones/${id}`),
  create: (data: { name: string; currency: string }) => apiClient.post<Zone>('/zones', data),
  update: (id: string, data: Partial<{ name: string; currency: string; isActive: boolean }>) =>
    apiClient.patch<Zone>(`/zones/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/zones/${id}`),
};
