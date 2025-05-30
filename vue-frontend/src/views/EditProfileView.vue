<template>
  <div class="p-6 max-w-3xl mx-auto">
    <h1 class="text-2xl font-semibold mb-6 text-gray-800">Edit SSH Profile</h1>

    <div v-if="isLoadingProfile" class="text-center py-10">
      <p class="text-lg text-gray-500">Loading profile details...</p>
      <!-- Optional: Add a spinner animation here -->
    </div>
    
    <div v-if="errorMessage && !profile" class="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
      <span class="font-medium">Error:</span> {{ errorMessage }}
      <p><router-link to="/dashboard" class="text-blue-600 hover:underline">Go back to Dashboard</router-link></p>
    </div>
    
    <div v-if="successMessage" class="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
      {{ successMessage }}
    </div>

    <div v-if="profile && !isLoadingProfile" class="bg-white p-6 shadow rounded-lg border border-gray-200">
       <div v-if="errorMessage && profile" class="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
        <span class="font-medium">Error during update:</span> {{ errorMessage }}
      </div>
      <ProfileForm 
        @submit-form="handleUpdateProfile" 
        @cancel="handleCancel" 
        :profile-to-edit="profile"
        :is-edit-mode="true" 
        :is-loading-external="isLoading"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import ProfileForm from '../components/ProfileForm.vue';
import { sshProfileService } from '../services/api';
import type { SSHProfile } from '../types';

const router = useRouter();
const route = useRoute();

const profile = ref<SSHProfile | null>(null);
const isLoading = ref(false); // For form submission
const isLoadingProfile = ref(true); // For initial data load
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const profileId = Number(route.params.id);

const loadProfile = async () => {
  isLoadingProfile.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    if (isNaN(profileId)) {
        throw new Error("Invalid profile ID.");
    }
    profile.value = await sshProfileService.getById(profileId);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || 'Failed to load profile details.';
    profile.value = null; // Ensure profile is null on error
  } finally {
    isLoadingProfile.value = false;
  }
};

onMounted(() => {
  loadProfile();
});

// Type for profileData coming from the form for an update
// It's Partial because not all fields might be sent (e.g., password/key if not changed)
type ProfileUpdateData = Partial<Omit<SSHProfile, 'id' | 'createdAt' | 'updatedAt'>>;

const handleUpdateProfile = async (profileData: ProfileUpdateData) => {
  isLoading.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    await sshProfileService.update(profileId, profileData);
    successMessage.value = 'Profile updated successfully! Redirecting...';
    // Optionally reload profile data or merge changes if staying on page
    // await loadProfile(); 
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || 'Failed to update profile.';
    isLoading.value = false; // Stop loading on error
  }
  // isLoading is set to false only on error, because on success we redirect.
};

const handleCancel = () => {
  router.push('/dashboard');
};
</script>

<style scoped>
/* Scoped styles for EditProfileView if necessary */
</style>
