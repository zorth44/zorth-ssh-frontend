import axios from 'axios';
import type { User, AuthResponse, SSHProfile } from '../types';

// Base URL for the API - for now, hardcoded as per instructions
const API_BASE_URL = 'http://localhost:12305/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      // For now, using window.location.href as router might not be available here yet
      // Later, this could be improved by using router.push or an event/global state.
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth Service ---
interface LoginCredentials {
  username: string;
  password?: string; // Password might be optional for some auth flows in future if using SSO etc.
  mfa_code?: string; 
}

interface RegisterDetails {
  username: string;
  email: string;
  password?: string;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },
  register: async (details: RegisterDetails): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', details);
    return response.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
  // Placeholder for a potential logout API call if needed on the backend
  // logout: async (): Promise<void> => {
  //   await apiClient.post('/auth/logout');
  // }
};

// --- SSH Profile Service ---
export const sshProfileService = {
  getAll: async (): Promise<SSHProfile[]> => {
    const response = await apiClient.get<SSHProfile[]>('/ssh-profiles');
    return response.data;
  },
  delete: async (profileId: number): Promise<void> => {
    await apiClient.delete(`/ssh-profiles/${profileId}`);
  },
  getById: async (id: number): Promise<SSHProfile> => {
    const response = await apiClient.get<SSHProfile>(`/ssh-profiles/${id}`);
    return response.data;
  },
  create: async (profileData: Omit<SSHProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSHProfile> => {
    const response = await apiClient.post<SSHProfile>('/ssh-profiles', profileData);
    return response.data;
  },
  update: async (id: number, profileData: Partial<Omit<SSHProfile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SSHProfile> => {
    const response = await apiClient.put<SSHProfile>(`/ssh-profiles/${id}`, profileData);
    return response.data;
  },
};

export default apiClient;
