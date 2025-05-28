import axios from 'axios';
import { AuthResponse, SSHProfile, User } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      // Only redirect if we're not already on the login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { username, password });
    return response.data;
  },

  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', { username, email, password });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

export const sshProfileService = {
  getAll: async (): Promise<SSHProfile[]> => {
    const response = await api.get<SSHProfile[]>('/profiles');
    return response.data;
  },

  getById: async (id: number): Promise<SSHProfile> => {
    const response = await api.get<SSHProfile>(`/profiles/${id}`);
    return response.data;
  },

  create: async (profile: Omit<SSHProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSHProfile> => {
    const response = await api.post<SSHProfile>('/profiles', profile);
    return response.data;
  },

  update: async (id: number, profile: Partial<SSHProfile>): Promise<SSHProfile> => {
    const response = await api.put<SSHProfile>(`/profiles/${id}`, profile);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/profiles/${id}`);
  },
}; 