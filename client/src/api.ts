import { ClientConfig, GenerationJob, User, VideoRecord } from './types.js';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('animagic_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('animagic_auth_token', token);
  } else {
    localStorage.removeItem('animagic_auth_token');
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Config
  getConfig: (): Promise<ClientConfig> => fetchWithAuth('/config'),

  // Auth
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(data.token);
    return data;
  },

  register: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    setAuthToken(data.token);
    return data;
  },

  demoLogin: async (): Promise<{ token: string; user: User }> => {
    const data = await fetchWithAuth('/auth/demo', { method: 'POST' });
    setAuthToken(data.token);
    return data;
  },

  getCurrentUser: async (): Promise<User | null> => {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const data = await fetchWithAuth('/auth/me');
      return data.user;
    } catch {
      setAuthToken(null);
      return null;
    }
  },

  logout: () => {
    setAuthToken(null);
  },

  // Jobs
  createJob: (payload: {
    prompt: string;
    negativePrompt?: string;
    model: string;
    duration: number;
    aspectRatio: string;
    stylePreset: string;
    cameraMovement?: string;
  }): Promise<{ job: GenerationJob; queuePosition: number }> => {
    return fetchWithAuth('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getJobs: (): Promise<{ jobs: GenerationJob[] }> => fetchWithAuth('/jobs'),

  getJob: (id: string): Promise<{ job: GenerationJob }> => fetchWithAuth(`/jobs/${id}`),

  cancelJob: (id: string): Promise<{ message: string; job: GenerationJob }> => {
    return fetchWithAuth(`/jobs/${id}/cancel`, { method: 'POST' });
  },

  retryJob: (id: string): Promise<{ message: string; job: GenerationJob }> => {
    return fetchWithAuth(`/jobs/${id}/retry`, { method: 'POST' });
  },

  // Videos
  getVideos: (): Promise<{ videos: VideoRecord[] }> => fetchWithAuth('/videos'),

  getVideo: (id: string): Promise<{ video: VideoRecord }> => fetchWithAuth(`/videos/${id}`),

  deleteVideo: (id: string): Promise<{ message: string }> => {
    return fetchWithAuth(`/videos/${id}`, { method: 'DELETE' });
  },

  getStreamUrl: (videoId: string): string => `${API_BASE}/videos/${videoId}/stream`,
  
  getDownloadUrl: (videoId: string): string => `${API_BASE}/videos/${videoId}/download`
};
