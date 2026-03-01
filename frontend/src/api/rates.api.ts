import { apiClient } from './client';
import type { ExchangeRate, CorridorRate } from '@/types';

export const ratesApi = {
  list: () => apiClient.get<ExchangeRate[]>('/rates'),
  corridor: (srcId: string, dstId: string) =>
    apiClient.get<CorridorRate>(`/rates/corridor/${srcId}/${dstId}`),
  setManual: (data: { sourceZoneId: string; destZoneId: string; rate: number }) =>
    apiClient.post<ExchangeRate>('/rates/manual', data),
  deleteManual: (srcId: string, dstId: string) =>
    apiClient.delete<void>(`/rates/manual/${srcId}/${dstId}`),
  history: (srcId: string, dstId: string) =>
    apiClient.get<ExchangeRate[]>(`/rates/history/${srcId}/${dstId}`),
  forceRefresh: () => apiClient.post<void>('/rates/refresh', {}),
};
