import { defineStore } from 'pinia';
import { authService } from '../services/api';
import type { User, AuthResponse } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null; // For storing error messages
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: localStorage.getItem('authToken') || null, // Initialize token from localStorage
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.token,
    currentUser: (state): User | null => state.user,
    isLoading: (state): boolean => state.loading,
    authError: (state): string | null => state.error,
  },

  actions: {
    async login(credentials: { username: string; password?: string, mfa_code?: string }) {
      this.loading = true;
      this.error = null;
      try {
        const response: AuthResponse = await authService.login(credentials);
        this.token = response.token;
        this.user = response.user;
        localStorage.setItem('authToken', response.token);
        // router.push('/dashboard'); // Will handle navigation in component/router guard
        return true; // Indicate success
      } catch (err: any) {
        this.error = err.response?.data?.message || err.message || 'Login failed';
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        return false; // Indicate failure
      } finally {
        this.loading = false;
      }
    },

    async register(details: { username: string; email: string; password?: string }) {
      this.loading = true;
      this.error = null;
      try {
        const response: AuthResponse = await authService.register(details);
        this.token = response.token;
        this.user = response.user;
        localStorage.setItem('authToken', response.token);
        // router.push('/dashboard'); // Will handle navigation in component/router guard
        return true; // Indicate success
      } catch (err: any) {
        this.error = err.response?.data?.message || err.message || 'Registration failed';
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        return false; // Indicate failure
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.loading = true; // Optional: set loading during logout
      this.token = null;
      this.user = null;
      localStorage.removeItem('authToken');
      this.loading = false; // Optional
      // router.push('/login'); // Will handle navigation in component/router guard
    },

    async checkAuth() {
      this.loading = true;
      this.error = null;
      const localToken = localStorage.getItem('authToken');
      if (localToken && !this.token) { // If there's a token in localStorage but not in store
        this.token = localToken; // Tentatively set token
      }

      if (this.token) {
        try {
          const userData = await authService.getCurrentUser();
          this.user = userData;
        } catch (err: any) {
          this.error = err.response?.data?.message || err.message || 'Session expired or invalid.';
          this.token = null;
          this.user = null;
          localStorage.removeItem('authToken');
        } finally {
          this.loading = false;
        }
      } else {
        // No token, ensure user is null and not loading
        this.user = null;
        this.loading = false;
      }
    },

    // Action to clear any existing auth errors
    clearError() {
      this.error = null;
    }
  },
});
