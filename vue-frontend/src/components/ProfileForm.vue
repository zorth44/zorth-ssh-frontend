<template>
  <form @submit.prevent="handleFormSubmit" class="space-y-6">
    <div>
      <label for="nickname" class="block text-sm font-medium text-gray-700">Nickname</label>
      <input
        type="text"
        id="nickname"
        v-model="formData.nickname"
        required
        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="host" class="block text-sm font-medium text-gray-700">Host</label>
        <input
          type="text"
          id="host"
          v-model="formData.host"
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label for="port" class="block text-sm font-medium text-gray-700">Port</label>
        <input
          type="number"
          id="port"
          v-model.number="formData.port"
          required
          min="1"
          max="65535"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
    </div>

    <div>
      <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
      <input
        type="text"
        id="username"
        v-model="formData.username"
        required
        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    </div>

    <div>
      <label for="authType" class="block text-sm font-medium text-gray-700">Authentication Type</label>
      <select
        id="authType"
        v-model="formData.authType"
        class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="PASSWORD">Password</option>
        <option value="KEY">SSH Key</option>
      </select>
    </div>

    <!-- Conditional fields for Password Auth -->
    <div v-if="formData.authType === 'PASSWORD'">
      <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
      <input
        type="password"
        id="password"
        v-model="formData.encryptedPassword"
        :placeholder="isEditMode ? 'Leave blank to keep current password' : ''"
        :required="!isEditMode && formData.authType === 'PASSWORD'"
        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    </div>

    <!-- Conditional fields for Key Auth -->
    <div v-if="formData.authType === 'KEY'" class="space-y-6">
      <div>
        <label for="privateKey" class="block text-sm font-medium text-gray-700">Private Key</label>
        <textarea
          id="privateKey"
          v-model="formData.encryptedPrivateKey"
          rows="6"
          :placeholder="isEditMode ? 'Leave blank to keep current key' : 'Paste your private key here (e.g., -----BEGIN RSA PRIVATE KEY-----...)'"
          :required="!isEditMode && formData.authType === 'KEY'"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
        ></textarea>
      </div>
      <div>
        <label for="keyPassphrase" class="block text-sm font-medium text-gray-700">Key Passphrase (optional)</label>
        <input
          type="password"
          id="keyPassphrase"
          v-model="formData.keyPassphraseEncrypted"
          :placeholder="isEditMode ? 'Leave blank if no change or no passphrase' : ''"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
    </div>

    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
      <button
        type="button"
        @click="handleCancel"
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        :disabled="isLoadingExternal"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        :disabled="isLoadingExternal"
      >
        <span v-if="isLoadingExternal">Saving...</span>
        <span v-else>{{ isEditMode ? 'Save Changes' : 'Create Profile' }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, PropType } from 'vue';
import type { SSHProfile } from '../types';

const props = defineProps({
  profileToEdit: {
    type: Object as PropType<SSHProfile | null>,
    default: null,
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
  isLoadingExternal: {
    type: Boolean,
    default: false,
  }
});

const emit = defineEmits(['submit-form', 'cancel']);

type FormData = Omit<SSHProfile, 'id' | 'createdAt' | 'updatedAt'>;

const initialFormData: FormData = {
  nickname: '',
  host: '',
  port: 22,
  username: '',
  authType: 'PASSWORD',
  encryptedPassword: '',
  encryptedPrivateKey: '',
  keyPassphraseEncrypted: '',
};

const formData = ref<FormData>({ ...initialFormData });

const resetForm = () => {
  if (props.profileToEdit && props.isEditMode) {
    formData.value = {
      nickname: props.profileToEdit.nickname,
      host: props.profileToEdit.host,
      port: props.profileToEdit.port,
      username: props.profileToEdit.username,
      authType: props.profileToEdit.authType,
      // For edit mode, passwords/keys are typically left blank unless changing
      encryptedPassword: '', 
      encryptedPrivateKey: '',
      keyPassphraseEncrypted: '',
    };
  } else {
    formData.value = { ...initialFormData };
  }
};

watch(() => props.profileToEdit, 
  (newProfile) => {
    if (newProfile && props.isEditMode) {
      resetForm(); // Re-initialize form when profileToEdit changes
    } else if (!props.isEditMode) {
      resetForm(); // Reset for create mode if profileToEdit is cleared
    }
  }, 
  { immediate: true, deep: true }
);


onMounted(() => {
  resetForm();
});

const handleFormSubmit = () => {
  const profileDataToSubmit: Partial<FormData> = { ...formData.value };

  // Clean up fields based on authType
  if (profileDataToSubmit.authType === 'PASSWORD') {
    profileDataToSubmit.encryptedPrivateKey = undefined;
    profileDataToSubmit.keyPassphraseEncrypted = undefined;
    if (props.isEditMode && !profileDataToSubmit.encryptedPassword) {
      profileDataToSubmit.encryptedPassword = undefined; // Don't send empty string if not changing
    }
  } else if (profileDataToSubmit.authType === 'KEY') {
    profileDataToSubmit.encryptedPassword = undefined;
    if (props.isEditMode && !profileDataToSubmit.encryptedPrivateKey) {
      profileDataToSubmit.encryptedPrivateKey = undefined; // Don't send empty string if not changing
    }
    if (props.isEditMode && !profileDataToSubmit.keyPassphraseEncrypted) {
      profileDataToSubmit.keyPassphraseEncrypted = undefined; // Don't send empty string if not changing
    } else if (!profileDataToSubmit.keyPassphraseEncrypted) { // For create mode, if empty, don't send
      profileDataToSubmit.keyPassphraseEncrypted = undefined;
    }
  }
  
  // Remove undefined fields explicitly if backend expects them to be absent
  Object.keys(profileDataToSubmit).forEach(key => {
    if (profileDataToSubmit[key as keyof Partial<FormData>] === undefined) {
      delete profileDataToSubmit[key as keyof Partial<FormData>];
    }
  });


  emit('submit-form', profileDataToSubmit, props.isEditMode);
};

const handleCancel = () => {
  resetForm(); // Optionally reset form on cancel
  emit('cancel');
};
</script>

<style scoped>
/* Add any specific styles if Tailwind isn't fully covering a need */
</style>
