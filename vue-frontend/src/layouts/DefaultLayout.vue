<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <nav class="container mx-auto px-6 py-3">
        <div class="flex items-center justify-between">
          <router-link 
            :to="isAuthenticated ? '/dashboard' : '/'" 
            class="text-xl font-semibold text-gray-700 hover:text-blue-600"
          >
            Zorth WebSSH
          </router-link>

          <div class="flex items-center space-x-4">
            <!-- Authenticated Links -->
            <template v-if="isAuthenticated">
              <router-link
                to="/dashboard"
                class="flex items-center px-3 py-2 text-gray-700 rounded hover:bg-gray-200 hover:text-blue-600"
                active-class="font-bold text-blue-600"
              >
                <HomeIcon class="h-5 w-5 mr-1" />
                Dashboard
              </router-link>
              <router-link
                to="/profiles"
                class="flex items-center px-3 py-2 text-gray-700 rounded hover:bg-gray-200 hover:text-blue-600"
                active-class="font-bold text-blue-600"
              >
                <UserGroupIcon class="h-5 w-5 mr-1" />
                Profiles
              </router-link>
              <button
                @click="handleLogout"
                class="flex items-center px-3 py-2 text-gray-700 bg-red-100 rounded hover:bg-red-200 hover:text-red-700"
              >
                <ArrowLeftOnRectangleIcon class="h-5 w-5 mr-1" />
                Logout
              </button>
              <span v-if="user" class="text-sm text-gray-600">
                Hi, {{ user.username }}
              </span>
            </template>
            <!-- Unauthenticated Links -->
            <template v-else>
              <router-link
                to="/login"
                class="flex items-center px-3 py-2 text-gray-700 rounded hover:bg-gray-200 hover:text-blue-600"
                active-class="font-bold text-blue-600"
              >
                <ArrowRightOnRectangleIcon class="h-5 w-5 mr-1" />
                Login
              </router-link>
              <!-- Optional: Register Link -->
              <!-- 
              <router-link 
                to="/register" 
                class="flex items-center px-3 py-2 text-gray-700 rounded hover:bg-gray-200 hover:text-blue-600"
                active-class="font-bold text-blue-600"
              >
                Register Icon Here
                Register
              </router-link>
              -->
            </template>
          </div>
        </div>
      </nav>
    </header>

    <!-- Main Content Area -->
    <main class="pt-16"> <!-- pt-16 or similar to offset for fixed header height -->
      <div class="container mx-auto p-6">
        <router-view /> <!-- Child route components will be rendered here -->
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { HomeIcon, UserGroupIcon, ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline';

const { isAuthenticated, user, logout } = useAuth();
const router = useRouter();

const handleLogout = async () => {
  await logout(); // Call the logout action from the composable
  // After logout, Pinia state changes.
  // The router guard should ideally redirect to /login if on a protected page.
  // Or, we can explicitly push if needed, though guards are cleaner.
  if (!isAuthenticated.value) { // Double check state after logout
      router.push('/login');
  }
};
</script>

<style scoped>
/* Add any additional scoped styles if Tailwind isn't enough */
/* Example: ensure the content area can scroll independently if needed */
main {
  /* Adjust padding-top based on actual header height if it's dynamic */
  /* For a fixed header height of, say, 4rem (64px), pt-16 is appropriate. */
}
</style>
