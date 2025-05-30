<template>
  <div class="p-6 max-w-3xl mx-auto">
    <h1 class="text-2xl font-semibold mb-6 text-gray-800">Create New SSH Profile</h1>
    
    <div v-if="errorMessage" class="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
      <span class="font-medium">Error:</span> {{ errorMessage }}
    </div>
     <div v-if="successMessage" class="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
      {{ successMessage }}
    </div>

    <div class="bg-white p-6 shadow rounded-lg border border-gray-200">
      <ProfileForm 
        @submit-form="handleCreateProfile" 
        @cancel="handleCancel" 
        :is-edit-mode="false" 
        :is-loading-external="isLoading" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ProfileForm from '../components/ProfileForm.vue';
import { sshProfileService } from '../services/api';
import type { SSHProfile } from '../types'; // Omit is for internal use in service

const router = useRouter();
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Type for profileData coming from the form (all fields are potentially there)
type ProfileFormData = Omit<SSHProfile, 'id' | 'createdAt' | 'updatedAt'>;

const handleCreateProfile = async (profileData: ProfileFormData) => {
  isLoading.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    await sshProfileService.create(profileData);
    successMessage.value = 'Profile created successfully! Redirecting...';
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500); // Delay for user to see success message
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || 'Failed to create profile.';
    isLoading.value = false; // Stop loading on error
  }
  // isLoading is set to false only on error, because on success we redirect.
  // If no redirect, then: finally { isLoading.value = false; }
};

const handleCancel = () => {
  router.push('/dashboard');
};
</script>

<style scoped>
/* Scoped styles for CreateProfileView if necessary */
</style>
