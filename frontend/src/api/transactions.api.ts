import { apiClient } from './client';
import { toQuery } from '@/utils/query';
import type { Transaction, CreateTransactionDto, TransactionFilters, PaginatedResponse } from '@/types';

export const transactionsApi = {
  list: (filters?: TransactionFilters) =>
    apiClient.get<PaginatedResponse<Transaction>>(`/transactions${toQuery(filters as any)}`),

  byId: (id: string) =>
    apiClient.get<Transaction>(`/transactions/${id}`),

  byCode: (code: string) =>
    apiClient.get<Transaction>(`/transactions/code/${code}`),

  create: (data: CreateTransactionDto) =>
    apiClient.post<Transaction>('/transactions', data),

  confirm: (id: string) =>
    apiClient.patch<Transaction>(`/transactions/${id}/confirm`, {}),

  cancel: (id: string, cancelReason?: string) =>
    apiClient.patch<Transaction>(`/transactions/${id}/cancel`, { cancelReason }),
};
