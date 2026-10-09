import { APIResponse } from '../types';

/**
 * Standard HTTP Fetch Client for Backend MERN API Communication
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const customToken = localStorage.getItem('SHIPSGO_API_TOKEN');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (customToken) {
    headers['X-Shipsgo-User-Token'] = customToken;
  }

  const response = await fetch(`/api${endpoint}`, {
    headers,
    ...options,
  });

  const resData: APIResponse<T> = await response.json();

  if (!response.ok || !resData.success) {
    throw new Error(resData.error || resData.message || `API Error: ${response.statusText}`);
  }

  return resData.data!;
}
