import { computed } from 'vue';
import { useAuthStore } from '../store/auth';
import type { User } from '../types'; // Assuming User type is needed

export function useAuth() {
  const store = useAuthStore();

  const user = computed<User | null>(() => store.currentUser);
  const isAuthenticated = computed<boolean>(() => store.isAuthenticated);
  const isLoading = computed<boolean>(() => store.isLoading);
  const authError = computed<string | null>(() => store.authError);

  const login = async (credentials: { username: string; password?: string, mfa_code?: string }) => {
    return store.login(credentials);
  };

  const register = async (details: { username: string; email: string; password?: string }) => {
    return store.register(details);
  };

  const logout = () => {
    store.logout();
  };

  const checkAuth = async () => {
    await store.checkAuth();
  };

  const clearError = () => {
    store.clearError();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  };
}
