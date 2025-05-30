<template>
  <div class="p-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
      <h1 class="text-3xl font-semibold text-gray-800">SSH Profile Management</h1>
      <div class="flex items-center gap-4 w-full sm:w-auto">
        <input
          type="text"
          v-model="searchTerm"
          placeholder="Search profiles..."
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-full sm:w-auto"
        />
        <router-link
          to="/profiles/new"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
        >
          New Profile
        </router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-10">
      <p class="text-lg text-gray-500">Loading profiles...</p>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
      <span class="font-medium">Error:</span> {{ errorMessage }}
    </div>
     <div v-if="sftpErrorMessage" class="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
      <span class="font-medium">SFTP Error:</span> {{ sftpErrorMessage }}
    </div>
    <div v-if="successMessage" class="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
      {{ successMessage }}
    </div>


    <!-- Profiles Display -->
    <div v-if="!isLoading && !errorMessage && filteredProfiles.length === 0" class="text-center py-10">
      <p class="text-lg text-gray-500">
        {{ searchTerm ? 'No profiles match your search.' : 'No SSH profiles found.' }}
      </p>
      <p v-if="!searchTerm" class="mt-2 text-sm text-gray-400">
        Get started by 
        <router-link to="/profiles/new" class="text-blue-600 hover:underline">creating your first profile</router-link>.
      </p>
    </div>

    <div v-if="!isLoading && filteredProfiles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div
        v-for="profile in filteredProfiles"
        :key="profile.id"
        class="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-xl"
      >
        <div class="p-5 flex-grow">
          <div class="flex items-center mb-3">
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold mr-3', getAvatarBgClass(profile.nickname)]">
              {{ profile.nickname.charAt(0).toUpperCase() }}
            </div>
            <h3 class="text-xl font-semibold text-gray-800 truncate" :title="profile.nickname">{{ profile.nickname }}</h3>
          </div>
          <p class="text-sm text-gray-600 mb-1 truncate" :title="profile.host + ':' + profile.port">
            <span class="font-medium">Host:</span> {{ profile.host }}:{{ profile.port }}
          </p>
          <p class="text-sm text-gray-600 mb-1 truncate" :title="profile.username">
            <span class="font-medium">User:</span> {{ profile.username }}
          </p>
          <p class="text-sm text-gray-600 mb-2">
            <span class="font-medium">Auth:</span> 
            <span 
              :class="{
                'bg-blue-100 text-blue-800': profile.authType === 'PASSWORD', 
                'bg-green-100 text-green-800': profile.authType === 'KEY'
              }" 
              class="px-2 py-0.5 rounded-full text-xs font-semibold"
            >
              {{ profile.authType }}
            </span>
          </p>
           <p class="text-xs text-gray-400">
            Created: {{ new Date(profile.createdAt).toLocaleDateString() }}
          </p>
        </div>
        <div class="p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-2">
          <button
            @click="handleConnectSSH(profile)"
            class="w-full px-3 py-2 text-xs font-medium text-center text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
          >
            SSH Connect
          </button>
          <button
            @click="handleOpenSFTP(profile)"
            class="w-full px-3 py-2 text-xs font-medium text-center text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500"
          >
            SFTP
          </button>
          <router-link
            :to="'/profiles/edit/' + profile.id"
            class="w-full block text-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
          >
            Edit
          </router-link>
          <button
            @click="confirmDelete(profile.id)"
            class="w-full px-3 py-2 text-xs font-medium text-center text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Placeholder for SFTP Browser -->
    <div v-if="selectedProfileForSFTP" class="mt-8 p-4 border border-dashed border-gray-400 rounded-md bg-gray-50">
      <h4 class="text-lg font-semibold">SFTP Browser (Placeholder)</h4>
      <p>SFTP connection for profile: <span class="font-medium">{{ selectedProfileForSFTP.nickname }}</span> would be displayed here.</p>
      <p class="text-sm text-gray-600 mt-2">Full SFTP browser functionality will be implemented in a later step.</p>
      <button @click="selectedProfileForSFTP = null" class="mt-2 px-3 py-1 text-sm text-white bg-gray-500 rounded hover:bg-gray-600">Close SFTP Placeholder</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { sshProfileService } from '../services/api';
import { sftpService } from '../services/sftpService'; // Ensure this path is correct
import type { SSHProfile } from '../types';

const router = useRouter();

const profiles = ref<SSHProfile[]>([]);
const isLoading = ref(true);
const searchTerm = ref('');
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null); // For temporary success messages e.g. after delete

const sftpErrorMessage = ref<string | null>(null);
// const showSFTPBrowser = ref(false); // Not fully used yet, SFTP view is just a placeholder div for now
const selectedProfileForSFTP = ref<SSHProfile | null>(null);


const filteredProfiles = computed(() => {
  if (!searchTerm.value.trim()) {
    return profiles.value;
  }
  const lowerSearchTerm = searchTerm.value.toLowerCase();
  return profiles.value.filter(profile =>
    profile.nickname.toLowerCase().includes(lowerSearchTerm) ||
    profile.host.toLowerCase().includes(lowerSearchTerm) ||
    profile.username.toLowerCase().includes(lowerSearchTerm)
  );
});

const loadProfiles = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  successMessage.value = null; 
  try {
    profiles.value = await sshProfileService.getAll();
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || 'Failed to load profiles.';
    profiles.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadProfiles);

const confirmDelete = (profileId: number) => {
  if (window.confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
    handleDelete(profileId);
  }
};

const handleDelete = async (profileId: number) => {
  errorMessage.value = null;
  successMessage.value = null;
  try {
    await sshProfileService.delete(profileId);
    // Reload profiles or filter locally
    // profiles.value = profiles.value.filter((profile) => profile.id !== profileId);
    await loadProfiles(); // Reload to ensure consistency
    successMessage.value = 'Profile deleted successfully.';
    setTimeout(() => successMessage.value = null, 3000);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || 'Failed to delete profile.';
  }
};

const handleConnectSSH = (profile: SSHProfile) => {
  router.push({ name: 'TerminalConnection', params: { id: profile.id }});
};

const handleOpenSFTP = async (profile: SSHProfile) => {
  selectedProfileForSFTP.value = profile;
  sftpErrorMessage.value = null;
  successMessage.value = null; // Clear other messages
  console.log("SFTP for selected profile: ", profile.nickname);
  
  // For now, this just sets the selected profile and logs.
  // The actual SFTP browser UI and connection logic will be in Step 7.
  // Example of how it might be called (but not fully implemented here):
  try {
    // showSFTPBrowser.value = true; // This would toggle a modal or dedicated view
    const sftpData = await sftpService.connectAndBrowse(profile.id);
    console.log('SFTP Data (mock):', sftpData);
    successMessage.value = `SFTP "connected" for ${profile.nickname}. (Mock data logged)`;
    // In a real app, you'd pass sftpData to an SFTP browser component
  } catch (error: any) {
    sftpErrorMessage.value = error.message || 'Failed to initiate SFTP connection.';
    selectedProfileForSFTP.value = null; // Clear selection on error
    // showSFTPBrowser.value = false;
  }
   setTimeout(() => { // Clear messages after some time
        successMessage.value = null;
        // sftpErrorMessage.value = null; // Keep SFTP error until next attempt?
    }, 5000);
};

const avatarColors = [
  'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500'
];

const getAvatarBgClass = (nickname: string) => {
  if (!nickname) return 'bg-gray-500';
  const charCodeSum = nickname.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarColors[charCodeSum % avatarColors.length];
};

</script>

<style scoped>
/* Additional specific styles can go here if Tailwind classes are not sufficient */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
