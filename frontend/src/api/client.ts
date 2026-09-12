import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '');

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // IMPORTANT: send cookies cross-domain
  headers: { 'Content-Type': 'application/json' },
});

// Store access token in module scope (memory only — never localStorage)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle 401 — try silent refresh, retry original request
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeToRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function notifyRefreshSubscribers(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && original.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToRefresh((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
        const newToken = res.data.accessToken;
        setAccessToken(newToken);
        notifyRefreshSubscribers(newToken);
        isRefreshing = false;
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        isRefreshing = false;
        setAccessToken(null);
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
