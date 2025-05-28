import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types';
import { authService } from '../services/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [router]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      const response = await authService.register(username, email, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  }, [router]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found in localStorage');
      setLoading(false);
      return;
    }

    try {
      console.log('Checking authentication with token...');
      const user = await authService.getCurrentUser();
      console.log('Authentication successful, user:', user);
      setUser(user);
    } catch (error: any) {
      console.error('Auth check failed:', error);
      // Check if it's a 401 error (token expired/invalid)
      if (error.response?.status === 401) {
        console.log('Token expired or invalid, removing from localStorage');
        localStorage.removeItem('token');
        setUser(null);
      } else {
        console.error('Other auth error:', error);
        // For other errors, don't clear the token immediately
        // The user might be offline or there might be a temporary server issue
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };
} 