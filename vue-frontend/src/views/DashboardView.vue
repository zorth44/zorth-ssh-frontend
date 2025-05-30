<template>
  <div class="p-6">
    <!-- Header Section -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-semibold text-gray-800">SSH Profiles</h1>
      <router-link
        to="/profiles/new"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        New Profile
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-10">
      <p class="text-lg text-gray-500">Loading profiles...</p>
      <!-- Optional: Add a spinner animation here -->
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
      <span class="font-medium">Error:</span> {{ errorMessage }}
    </div>
    
    <!-- Success Message (e.g. after delete) -->
    <div v-if="successMessage" class="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
      {{ successMessage }}
    </div>


    <!-- Profiles Display -->
    <div v-if="!isLoading && !errorMessage && profiles.length === 0" class="text-center py-10">
      <p class="text-lg text-gray-500">No SSH profiles found.</p>
      <p class="mt-2 text-sm text-gray-400">
        Get started by 
        <router-link to="/profiles/new" class="text-blue-600 hover:underline">creating your first profile</router-link>.
      </p>
    </div>

    <div v-if="!isLoading && profiles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="profile in profiles"
        :key="profile.id"
        class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col"
      >
        <div class="p-5 flex-grow">
          <h3 class="text-xl font-semibold text-gray-800 mb-2">{{ profile.nickname }}</h3>
          <p class="text-sm text-gray-600 mb-1">
            <span class="font-medium">Host:</span> {{ profile.host }}:{{ profile.port }}
          </p>
          <p class="text-sm text-gray-600 mb-1">
            <span class="font-medium">User:</span> {{ profile.username }}
          </p>
          <p class="text-sm text-gray-600">
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
        </div>
        <div class="p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
          <router-link
            :to="'/terminal/' + profile.id"
            class="px-3 py-1.5 text-xs font-medium text-center text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Connect
          </router-link>
          <router-link
            :to="'/profiles/edit/' + profile.id"
            class="px-3 py-1.5 text-xs font-medium text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            Edit
          </router-link>
          <button
            @click="confirmDelete(profile.id)"
            class="px-3 py-1.5 text-xs font-medium text-center text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { sshProfileService } from '../services/api';
import type { SSHProfile } from '../types';
// useRouter might be needed if we redirect after delete, but for now, just updating list.
// import { useRouter } from 'vue-router';

const profiles = ref<SSHProfile[]>([]);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null); // For temporary success messages

// const router = useRouter();

const loadProfiles = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  successMessage.value = null; // Clear success message on reload
  try {
    profiles.value = await sshProfileService.getAll();
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || 'Failed to load profiles.';
    profiles.value = []; // Clear profiles on error
  } finally {
    isLoading.value = false;
  }
};

const confirmDelete = (profileId: number) => {
  // In a real app, you'd use a modal confirmation.
  // For now, window.confirm is a simple way.
  if (window.confirm('Are you sure you want to delete this profile?')) {
    handleDelete(profileId);
  }
};

const handleDelete = async (profileId: number) => {
  errorMessage.value = null;
  successMessage.value = null;
  try {
    await sshProfileService.delete(profileId);
    profiles.value = profiles.value.filter((profile) => profile.id !== profileId);
    successMessage.value = 'Profile deleted successfully.';
    setTimeout(() => successMessage.value = null, 3000); // Clear message after 3s
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || 'Failed to delete profile.';
  }
  // No explicit isLoading for delete, but could be added if it's a long operation.
};

onMounted(() => {
  loadProfiles();
});
</script>

<style scoped>
/* Additional specific styles can go here if Tailwind classes are not sufficient */
</style>
