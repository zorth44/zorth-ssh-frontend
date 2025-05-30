<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg sm:w-full md:w-1/2 lg:w-1/3">
      <h3 class="text-2xl font-bold text-center">Login to your account</h3>
      <form @submit.prevent="handleLogin">
        <div class="mt-4">
          <div>
            <label class="block" for="username">Username</label>
            <input
              type="text"
              placeholder="Username"
              id="username"
              v-model="username"
              class="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>
          <div class="mt-4">
            <label class="block" for="password">Password</label>
            <div class="relative">
              <input
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password"
                id="password"
                v-model="password"
                class="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              />
              <button
                type="button"
                @click="toggleShowPassword"
                class="absolute inset-y-0 right-0 px-3 py-2 text-sm text-gray-600"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>
          <div v-if="authError" class="mt-2 text-sm text-red-600">
            {{ authError }}
          </div>
          <div class="flex items-baseline justify-between">
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900 disabled:bg-gray-400"
            >
              <span v-if="isLoading">Logging in...</span>
              <span v-else>Login</span>
            </button>
          </div>
          <div class="mt-6 text-grey-dark">
            Need an account?
            <router-link class="text-blue-600 hover:underline" to="/register">
              Register here
            </router-link>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline';

const username = ref('');
const password = ref('');
const showPassword = ref(false);

const router = useRouter();
const { login, isLoading, authError, clearError } = useAuth();

const toggleShowPassword = () => {
  showPassword.value = !showPassword.value;
};

const handleLogin = async () => {
  clearError(); // Clear previous errors
  const success = await login({
    username: username.value,
    password: password.value,
  });
  if (success) {
    // On successful login, Pinia store updates token/user.
    // Navigation guard will handle redirect if already on login page,
    // or we can explicitly navigate.
    router.push('/dashboard'); // Or to a default authenticated route
  }
  // If login fails, authError will be updated by the useAuth composable and displayed in the template.
};
</script>

<style scoped>
/* Scoped styles for LoginView if needed, Tailwind is used primarily */
</style>
