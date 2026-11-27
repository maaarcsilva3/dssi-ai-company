import { useQuery } from '@tanstack/react-query';
import {
  api,
  type AssigneeOption,
  type Client,
  type PayableStatus,
  type PaymentMethod,
  type PaymentTerm,
  type PaymentType,
  type Settings,
  type SourceAccount,
  type SourceAccountTransaction,
} from './api';

export const useStatuses = () => useLedgerStatuses('/statuses');

export function useLedgerStatuses(endpoint: string) {
  return useQuery({
    queryKey: [endpoint, true],
    queryFn: () => api.get<PayableStatus[]>(`${endpoint}?includeInactive=true`),
  });
}

export const useClients = (includeInactive = false) => useParties('/clients', includeInactive);

export function useParties(endpoint: string, includeInactive = false) {
  return useQuery({
    queryKey: [endpoint, includeInactive],
    queryFn: () => api.get<Client[]>(`${endpoint}${includeInactive ? '?includeInactive=true' : ''}`),
  });
}

export const usePaymentTypes = (includeInactive = false) =>
  useQuery({
    queryKey: ['payment-types', includeInactive],
    queryFn: () => api.get<PaymentType[]>(`/payment-types${includeInactive ? '?includeInactive=true' : ''}`),
  });

export const usePaymentMethods = (includeInactive = false) =>
  useQuery({
    queryKey: ['payment-methods', includeInactive],
    queryFn: () => api.get<PaymentMethod[]>(`/payment-methods${includeInactive ? '?includeInactive=true' : ''}`),
  });

export const usePaymentTerms = (includeInactive = false) =>
  useQuery({
    queryKey: ['payment-terms', includeInactive],
    queryFn: () => api.get<PaymentTerm[]>(`/payment-terms${includeInactive ? '?includeInactive=true' : ''}`),
  });

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/settings') });

export const useAssignees = () =>
  useQuery({
    queryKey: ['assignees'],
    queryFn: () => api.get<AssigneeOption[]>('/users/assignees'),
  });

export const useSourceAccounts = (includeInactive = false, enabled = true) =>
  useQuery({
    queryKey: ['source-accounts', includeInactive],
    queryFn: () =>
      api.get<SourceAccount[]>(`/source-accounts${includeInactive ? '?includeInactive=true' : ''}`),
    enabled,
  });

export const useSourceTransactions = (accountId?: number | '', enabled = true) =>
  useQuery({
    queryKey: ['source-transactions', accountId || 'all'],
    queryFn: () =>
      api.get<SourceAccountTransaction[]>(
        `/source-accounts/transactions${accountId ? `?accountId=${accountId}` : ''}`,
      ),
    enabled,
  });
