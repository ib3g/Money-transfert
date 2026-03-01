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
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      qc.invalidateQueries({ queryKey: ['rates'] });
      const init = data._init as { updated: number; errors: number; total: number } | undefined;
      if (!init || init.total === 0) {
        // First zone or no other zones — no rates to initialize yet
        toast.success('Zone créée', data.name);
      } else if (init.errors === 0) {
        toast.success('Zone créée', `${data.name} · ${init.updated} taux de change initialisés`);
      } else if (init.updated > 0) {
        toast.warning('Zone créée — config. partielle', `${init.updated}/${init.total} taux initialisés · ${init.errors} échec(s)`);
      } else {
        toast.warning('Zone créée — taux non initialisés', "Les taux n'ont pas pu être récupérés. Actualisez manuellement depuis la page Taux.");
      }
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
