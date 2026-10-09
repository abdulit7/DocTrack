import { apiRequest } from './apiClient';
import { AnalyticsSummary } from '../types';

export const AnalyticsService = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    return apiRequest<AnalyticsSummary>('/analytics');
  }
};
