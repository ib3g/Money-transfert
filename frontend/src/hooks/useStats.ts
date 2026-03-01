import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/api/stats.api';
import type { StatsPeriod } from '@/types';

export function useStatsSummary(period?: StatsPeriod) {
  return useQuery({
    queryKey: ['stats', 'summary', period],
    queryFn: () => statsApi.summary(period),
    staleTime: 60_000,
  });
}

export function useStatsByCorridor(period?: StatsPeriod) {
  return useQuery({
    queryKey: ['stats', 'corridors', period],
    queryFn: () => statsApi.byCorridor(period),
    staleTime: 60_000,
  });
}
