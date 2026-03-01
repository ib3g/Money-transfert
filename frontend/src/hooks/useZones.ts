import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zonesApi } from '@/api/zones.api';
import { toast } from '@/stores/uiStore';

export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.list,
    staleTime: 5 * 60_000,
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: zonesApi.create,
    onSuccess: (zone) => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Zone créée', zone.name);
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => zonesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Zone mise à jour');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}
