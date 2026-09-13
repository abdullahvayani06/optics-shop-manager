const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
let calculatedBase = envApiUrl ? envApiUrl.replace(/\/$/, '') : '/api';
if (envApiUrl && !calculatedBase.endsWith('/api')) {
  calculatedBase += '/api';
}
const API_BASE_URL = calculatedBase;

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('optics_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('optics_token');
      localStorage.removeItem('optics_user');
      window.location.href = '/login';
    }
  }

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = responseData.error || responseData.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
