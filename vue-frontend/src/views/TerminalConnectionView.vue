<template>
  <div class="p-2 sm:p-4 flex flex-col h-[calc(100vh-4rem)]"> <!-- Adjust 4rem based on actual header height from DefaultLayout -->
    <!-- Header/Status Display -->
    <div class="mb-2 p-2 rounded-md bg-gray-800 text-white shadow">
      <h1 class="text-lg sm:text-xl font-semibold truncate">
        <span v-if="profileNickname">{{ profileNickname }} - </span>Terminal
      </h1>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm mt-1">
        <span>
          Terminal: 
          <span :class="terminalInitialized ? 'text-green-400' : 'text-yellow-400'">
            {{ terminalInitialized ? 'Ready' : 'Initializing...' }}
          </span>
        </span>
        <span>
          WebSocket: 
          <span :class="wsConnected ? 'text-green-400' : 'text-red-400'">
            {{ wsConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </span>
        <span>
          SSH: 
          <span :class="sshStatusColor">
            {{ sshStatusText }}
          </span>
        </span>
      </div>
      <div v-if="errorMessage" class="mt-1 p-2 text-xs sm:text-sm text-red-300 bg-red-700 bg-opacity-50 rounded">
        <strong>Error:</strong> {{ errorMessage }}
      </div>
    </div>

    <!-- Terminal Container -->
    <div 
      ref="terminalContainerRef" 
      class="flex-grow w-full h-full bg-black rounded-md shadow-inner overflow-hidden"
      id="terminal-container"
    >
      <!-- Xterm.js will attach here -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTerminal } from '../composables/useTerminal';
import { sshProfileService } from '../services/api'; // To fetch profile details
// SSHProfile type might not be strictly needed here if only nickname is used, but good for context
// import type { SSHProfile } from '../types'; 

const terminalContainerRef = ref<HTMLDivElement | null>(null);
const route = useRoute();
const profileId = route.params.id as string;

// Instantiate the terminal logic from the composable
const { 
  mountTerminal, 
  unmountTerminal, 
  sshConnected, 
  wsConnected, 
  terminalInitialized, 
  isLoading, // This isLoading is from useTerminal, reflects overall terminal setup/SSH connection attempt
  errorMessage 
} = useTerminal(profileId);

const profileNickname = ref<string>('');
const profileLoadError = ref<string | null>(null); // Separate error for profile fetching

// Fetch Profile Nickname
onMounted(async () => {
  if (profileId) {
    try {
      const profile = await sshProfileService.getById(Number(profileId));
      profileNickname.value = profile.nickname;
    } catch (error: any) {
      console.error('Failed to fetch profile details:', error);
      profileLoadError.value = 'Failed to load profile nickname.';
      // Optionally, set a more prominent error on the main errorMessage if this is critical
      if (!errorMessage.value) { // Prioritize terminal errors if they exist
        errorMessage.value = profileLoadError.value;
      }
    }
  } else {
     profileNickname.value = "Unknown Profile"; // Fallback if ID is missing (should not happen with router setup)
  }

  // Mount the terminal
  if (terminalContainerRef.value) {
    mountTerminal(terminalContainerRef.value);
  } else {
    console.error('Terminal container element not found on mount.');
    errorMessage.value = 'Terminal container not found. Cannot initialize terminal.';
  }
});

onUnmounted(() => {
  unmountTerminal();
});

// Computed properties for status display
const sshStatusText = computed(() => {
  if (isLoading.value && !sshConnected.value) return 'Connecting...';
  if (sshConnected.value) return 'Connected';
  return 'Disconnected';
});

const sshStatusColor = computed(() => {
  if (isLoading.value && !sshConnected.value) return 'text-yellow-400';
  if (sshConnected.value) return 'text-green-400';
  return 'text-red-400';
});

</script>

<style scoped>
/* Ensure the view itself takes up available space if DefaultLayout doesn't enforce min-height */
/* The h-[calc(100vh-4rem)] on the root div assumes a 4rem header. Adjust as needed. */
/* The #terminal-container will be styled by xterm.js itself primarily, 
   but bg-black provides a fallback. */
</style>
