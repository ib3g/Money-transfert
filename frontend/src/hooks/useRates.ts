import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratesApi } from '@/api/rates.api';
import { toast } from '@/stores/uiStore';

export function useRates() {
  return useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.list,
    staleTime: 60_000,
  });
}

export function useCorridorRate(srcId: string, dstId: string) {
  return useQuery({
    queryKey: ['rates', 'corridor', srcId, dstId],
    queryFn: () => ratesApi.corridor(srcId, dstId),
    enabled: !!srcId && !!dstId,
    staleTime: 30_000,
  });
}

export function useRateHistory(srcId: string, dstId: string) {
  return useQuery({
    queryKey: ['rates', 'history', srcId, dstId],
    queryFn: () => ratesApi.history(srcId, dstId),
    enabled: !!srcId && !!dstId,
    staleTime: 60_000,
  });
}

export function useSetManualRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ratesApi.setManual,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rates'] });
      toast.success('Taux enregistré', 'Le taux manuel a été appliqué avec succès.');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useDeleteManualRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ srcId, dstId }: { srcId: string; dstId: string }) =>
      ratesApi.deleteManual(srcId, dstId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rates'] });
      toast.success('Taux supprimé', 'Le taux automatique est maintenant utilisé.');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useForceRefreshRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ratesApi.forceRefresh,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rates'] });
      toast.success('Taux actualisés', 'Les taux du marché ont été mis à jour.');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

