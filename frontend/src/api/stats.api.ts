import { apiClient } from './client';
import { toQuery } from '@/utils/query';
import type { StatsPeriod, StatsSummary } from '@/types';

export const statsApi = {
  summary: (params?: StatsPeriod) =>
    apiClient.get<StatsSummary>(`/stats/summary${toQuery(params as any)}`),
  byCorridor: (params?: StatsPeriod) =>
    apiClient.get<unknown[]>(`/stats/by-corridor${toQuery(params as any)}`),
};
