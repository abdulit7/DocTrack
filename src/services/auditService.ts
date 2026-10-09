import { apiRequest } from './apiClient';
import { AuditLogItem } from '../types';

export const AuditService = {
  getAll: async (): Promise<AuditLogItem[]> => {
    return apiRequest<AuditLogItem[]>('/audit-logs');
  }
};
