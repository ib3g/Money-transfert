import { apiClient } from './client';
import type { User, Permission, CreateUserDto } from '@/types';

export const usersApi = {
  list: () => apiClient.get<User[]>('/users'),
  byId: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (data: CreateUserDto) => apiClient.post<User>('/users', data),
  update: (id: string, data: Partial<CreateUserDto>) => apiClient.patch<User>(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/users/${id}`),
  updatePermissions: (id: string, permissions: Permission[]) =>
    apiClient.patch<User>(`/users/${id}/permissions`, { permissions }),
  assignZones: (id: string, zoneIds: string[]) =>
    apiClient.post<void>(`/users/${id}/zones`, { zoneIds }),
  removeZone: (id: string, zoneId: string) =>
    apiClient.delete<void>(`/users/${id}/zones/${zoneId}`),
  changePassword: (id: string, currentPassword: string, newPassword: string) =>
    apiClient.patch<void>(`/users/${id}/password`, { currentPassword, newPassword }),
};
