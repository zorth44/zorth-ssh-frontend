<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuth } from './composables/useAuth';

const { checkAuth } = useAuth();

onMounted(async () => {
  // Check authentication status when the app loads
  // This will try to fetch user data if a token exists in localStorage
  await checkAuth();
});
</script>

<template>
  <div id="app-container" class="min-h-screen bg-gray-50">
    <!-- Global components like a Navbar could go here, outside router-view -->
    <router-view></router-view> <!-- This is where routed components will be displayed -->
  </div>
</template>

<style scoped>
/* Scoped styles for App.vue, if any beyond global styles */
#app-container {
  /* You can add global layout styles here if not covered by Tailwind base/components */
}
</style>
