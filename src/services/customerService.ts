import { apiRequest } from './apiClient';
import { Customer, DocumentItem } from '../types';

export const CustomerService = {
  getAll: async (): Promise<Customer[]> => {
    return apiRequest<Customer[]>('/customers');
  },

  getById: async (id: string): Promise<Customer> => {
    return apiRequest<Customer>(`/customers/${id}`);
  },

  create: async (payload: { name: string; requiredDocs?: string[]; docs?: DocumentItem[] }): Promise<Customer> => {
    return apiRequest<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    return apiRequest<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest<null>(`/customers/${id}`, {
      method: 'DELETE',
    });
  },
};
