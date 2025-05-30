<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold">Terminal Connection (Profile ID: {{ $route.params.id }})</h1>
    <p class="mt-2">Terminal interface for the SSH connection will be rendered here.</p>
    <!-- TODO: Implement terminal connection logic using xterm.js and WebSockets -->
    <div class="mt-4">
      <router-link to="/dashboard" class="text-blue-600 hover:underline">&larr; Back to Dashboard</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
// Access profile ID with route.params.id
// onMounted(async () => {
//   const profileId = route.params.id;
//   // initiate terminal connection for profileId
// });
</script>

<style scoped>
/* Scoped styles for TerminalConnectionView */
</style>
