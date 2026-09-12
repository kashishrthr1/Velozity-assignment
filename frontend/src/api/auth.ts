import { apiClient, setAccessToken } from './client';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function login(email: string, password: string) {
  const res = await apiClient.post('/auth/login', { email, password });
  setAccessToken(res.data.accessToken);
  return res.data as { accessToken: string; user: import('../types').AuthUser };
}

export async function logout() {
  await apiClient.post('/auth/logout');
  setAccessToken(null);
}

export async function refreshToken() {
  const res = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
  setAccessToken(res.data.accessToken);
  return res.data as { accessToken: string; user: import('../types').AuthUser };
}
