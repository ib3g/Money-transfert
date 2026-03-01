import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/api/transactions.api';
import { toast } from '@/stores/uiStore';
import type { TransactionFilters, CreateTransactionDto } from '@/types';

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.list(filters),
    staleTime: 15_000, // Sockets handle real-time updates via invalidateQueries
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => transactionsApi.byId(id),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useTransactionByCode(code: string) {
  return useQuery({
    queryKey: ['transactions', 'code', code],
    queryFn: () => transactionsApi.byCode(code),
    enabled: !!code && code.length >= 11, // TR-XXXXXXXX
    retry: 1,
    staleTime: 0, // Critical: confirm page must always show the real current status
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionDto) => transactionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useConfirmTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Transaction confirmée', 'Le transfert a été validé avec succès.');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}

export function useCancelTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      transactionsApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Transaction annulée');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });
}
