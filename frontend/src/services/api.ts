import type {
  User,
  AnalysisResult,
  SampleUrl,
  HistoryListResponse,
  AdminSummaryResponse,
  AdminAnalysesResponse,
  MessageAnalysisResult,
  SampleMessage
} from '../types';

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

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
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // include session cookie
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  auth: {
    me: async (): Promise<{ authenticated: boolean; user: User | null }> => {
      return request('/auth/me');
    },
    login: async (email: string, password: string): Promise<{ message: string; user: User }> => {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },
    register: async (name: string, email: string, password: string, confirm_password: string): Promise<{ message: string; user: User }> => {
      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, confirm_password })
      });
    },
    logout: async (): Promise<{ message: string }> => {
      return request('/auth/logout', {
        method: 'POST'
      });
    }
  },

  analysis: {
    analyze: async (url: string): Promise<AnalysisResult> => {
      return request('/analyze', {
        method: 'POST',
        body: JSON.stringify({ url })
      });
    },
    getSamples: async (): Promise<{ samples: SampleUrl[] }> => {
      return request('/analyze/samples');
    },
    analyzeMessage: async (text: string, sender?: string): Promise<MessageAnalysisResult> => {
      return request('/analyze/message', {
        method: 'POST',
        body: JSON.stringify({ text, sender })
      });
    },
    getMessageSamples: async (): Promise<{ samples: SampleMessage[] }> => {
      return request('/analyze/message/samples');
    }
  },

  history: {
    list: async (params?: { search?: string; filter?: string; sort?: string; page?: number; per_page?: number }): Promise<HistoryListResponse> => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.filter && params.filter !== 'all') searchParams.set('filter', params.filter);
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.per_page) searchParams.set('per_page', params.per_page.toString());
      
      const queryStr = searchParams.toString();
      return request(`/history${queryStr ? `?${queryStr}` : ''}`);
    },
    get: async (id: number): Promise<AnalysisResult> => {
      return request(`/history/${id}`);
    },
    delete: async (id: number): Promise<{ message: string }> => {
      return request(`/history/${id}`, {
        method: 'DELETE'
      });
    }
  },

  admin: {
    getSummary: async (): Promise<AdminSummaryResponse> => {
      return request('/admin/summary');
    },
    getAnalyses: async (params?: { search?: string; filter?: string; page?: number; per_page?: number }): Promise<AdminAnalysesResponse> => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.filter && params.filter !== 'all') searchParams.set('filter', params.filter);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.per_page) searchParams.set('per_page', params.per_page.toString());

      const queryStr = searchParams.toString();
      return request(`/admin/analyses${queryStr ? `?${queryStr}` : ''}`);
    }
  },

  health: {
    check: async (): Promise<{ status: string; service: string; version: string; ml_engine_ready: boolean }> => {
      return request('/health');
    }
  }
};
