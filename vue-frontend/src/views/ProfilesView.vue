<template>
  <div class="p-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
      <h1 class="text-3xl font-semibold text-gray-800">SSH Profile Management</h1>
      <div class="flex items-center gap-4 w-full sm:w-auto">
        <div class="relative w-full sm:w-auto">
          <input
            type="text"
            v-model="searchTerm"
            placeholder="Search profiles..."
            class="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-full"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <router-link
          to="/profiles/new"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
        >
          <PlusIcon class="h-5 w-5 mr-2" />
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
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold mr-3 shrink-0', getAvatarBgClass(profile.nickname)]">
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
            class="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-center text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
          >
            <PlayIcon class="h-4 w-4 mr-1" />
            SSH Connect
          </button>
          <button
            @click="handleOpenSFTPModal(profile)"
            class="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-center text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500"
          >
            <FolderOpenIcon class="h-4 w-4 mr-1" />
            SFTP
          </button>
          <router-link
            :to="'/profiles/edit/' + profile.id"
            class="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
          >
            <PencilSquareIcon class="h-4 w-4 mr-1" />
            Edit
          </router-link>
          <button
            @click="confirmDelete(profile.id)"
            class="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-center text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
          >
            <TrashIcon class="h-4 w-4 mr-1" />
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- SFTP File Browser Modal -->
    <SFTPFileBrowser
      v-if="profileForSFTPModal"
      :is-open="isSFTPModalOpen"
      :profile="profileForSFTPModal"
      @close="handleCloseSFTPModal"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { sshProfileService } from '../services/api';
import type { SSHProfile } from '../types';
import SFTPFileBrowser from '../components/SFTPFileBrowser.vue';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PlayIcon, 
  FolderOpenIcon, 
  PencilSquareIcon, 
  TrashIcon 
} from '@heroicons/vue/24/outline';

const router = useRouter();

const profiles = ref<SSHProfile[]>([]);
const isLoading = ref(true);
const searchTerm = ref('');
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const profileForSFTPModal = ref<SSHProfile | null>(null);
const isSFTPModalOpen = ref(false);

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
    await loadProfiles(); 
    successMessage.value = 'Profile deleted successfully.';
    setTimeout(() => successMessage.value = null, 3000);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || 'Failed to delete profile.';
  }
};

const handleConnectSSH = (profile: SSHProfile) => {
  router.push({ name: 'TerminalConnection', params: { id: profile.id }});
};

const handleOpenSFTPModal = (profile: SSHProfile) => {
  profileForSFTPModal.value = profile;
  isSFTPModalOpen.value = true;
};

const handleCloseSFTPModal = () => {
  isSFTPModalOpen.value = false;
  profileForSFTPModal.value = null; 
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
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
