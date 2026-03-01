import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { toast } from '@/stores/uiStore';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    staleTime: 30_000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.byId(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé', `${user.firstName} ${user.lastName} a été ajouté`);
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', user.id] });
      toast.success('Utilisateur mis à jour');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useUpdatePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      usersApi.updatePermissions(id, permissions as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Permissions mises à jour');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useAssignZones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, zoneIds }: { id: string; zoneIds: string[] }) =>
      usersApi.assignZones(id, zoneIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Zones assignées');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}
