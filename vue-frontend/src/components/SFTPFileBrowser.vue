<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
      <!-- Modal Header -->
      <header class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800 truncate flex items-center">
          <FolderIcon class="h-6 w-6 mr-2 text-purple-600" />
          SFTP: {{ profile.nickname }}
          <span 
            :class="sftpConnected ? 'bg-green-500' : 'bg-red-500'" 
            class="ml-2 inline-block w-3 h-3 rounded-full"
            :title="sftpConnected ? 'Connected' : 'Disconnected'"
          ></span>
        </h2>
        <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
          <XMarkIcon class="h-6 w-6" />
        </button>
      </header>

      <!-- Modal Body -->
      <div class="flex-grow p-4 overflow-y-auto space-y-4">
        <!-- Navigation Bar -->
        <div class="flex items-center space-x-2 bg-gray-50 p-2 rounded-md border">
          <button
            @click="goUp"
            :disabled="isLoading || currentPath === '/'"
            class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 inline-flex items-center"
          >
            <ArrowUpIcon class="h-4 w-4 mr-1" /> Up
          </button>
          <input
            type="text"
            :value="currentPath"
            @keyup.enter="navigateToPath(($event.target as HTMLInputElement).value)"
            class="flex-grow px-2 py-1 text-sm border border-gray-300 rounded"
            placeholder="Current path"
          />
          <button
            @click="triggerFileInput"
            :disabled="isLoading || !sftpConnected"
            class="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50 inline-flex items-center"
          >
            <ArrowUpTrayIcon class="h-4 w-4 mr-1" /> Upload
          </button>
          <input type="file" ref="fileInputRef" @change="handleFileUpload" class="hidden" multiple />
          <button
            @click="refreshCurrentDirectory"
            :disabled="isLoading || !sftpConnected"
            class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 inline-flex items-center"
          >
            <ArrowPathIcon class="h-4 w-4 mr-1" /> Refresh
          </button>
        </div>
        
        <div v-if="errorMessage" class="p-3 text-sm text-red-700 bg-red-100 rounded-md" role="alert">
            <strong>Error:</strong> {{ errorMessage }}
            <button v-if="!sftpConnected && !isLoading" @click="connectToSFTP" class="ml-2 px-2 py-0.5 text-xs bg-red-200 hover:bg-red-300 rounded">Reconnect</button>
        </div>

        <div v-if="transfers.length > 0" class="space-y-2 p-3 bg-gray-50 rounded-md border">
          <h3 class="text-sm font-semibold text-gray-700">Active Transfers</h3>
          <div v-for="transfer in transfers" :key="transfer.transferId" class="text-xs p-2 bg-white rounded shadow">
            <div class="flex justify-between items-center mb-1">
                <div class="flex items-center truncate w-2/3">
                    <ArrowUpTrayIcon v-if="transfer.operation === 'UPLOAD'" class="h-4 w-4 mr-1 text-blue-500 shrink-0" />
                    <ArrowDownTrayIcon v-else-if="transfer.operation === 'DOWNLOAD'" class="h-4 w-4 mr-1 text-green-500 shrink-0" />
                    <span class="font-medium truncate" :title="transfer.fileName">{{ transfer.fileName }}</span>
                </div>
              <span class="text-gray-600">{{ transfer.status }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                class="h-2.5 rounded-full"
                :class="{
                    'bg-blue-600': transfer.status === 'IN_PROGRESS' || transfer.status === 'STARTING',
                    'bg-green-600': transfer.status === 'COMPLETED',
                    'bg-red-600': transfer.status === 'FAILED' || transfer.status === 'CANCELLED',
                    'bg-yellow-500': transfer.status === 'PENDING' || transfer.status === 'PAUSED',
                }"
                :style="{ width: transfer.percentage + '%' }"
              ></div>
            </div>
            <div class="flex justify-between items-center mt-1 text-gray-500">
              <span>{{ formatFileSize(transfer.transferredBytes) }} / {{ formatFileSize(transfer.totalBytes) }} ({{ transfer.percentage.toFixed(0) }}%)</span>
              <span v-if="transfer.speedFormatted">{{ transfer.speedFormatted }}</span>
              <button 
                v-if="['PENDING', 'STARTING', 'IN_PROGRESS'].includes(transfer.status)" 
                @click="cancelTransfer(transfer.transferId)" 
                class="text-red-500 hover:text-red-700 text-xs inline-flex items-center"
              >
                <XCircleIcon class="h-3 w-3 mr-0.5" /> Cancel
              </button>
            </div>
            <div v-if="transfer.errorMessage" class="mt-1 text-red-500">{{ transfer.errorMessage }}</div>
          </div>
        </div>

        <div class="overflow-auto border rounded-md bg-white">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-gray-500 tracking-wider w-1/2">Name</th>
                <th class="px-3 py-2 text-left font-medium text-gray-500 tracking-wider">Size</th>
                <th class="px-3 py-2 text-left font-medium text-gray-500 tracking-wider">Modified</th>
                <th class="px-3 py-2 text-left font-medium text-gray-500 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="isLoading">
                <td colspan="4" class="p-4 text-center text-gray-500">Loading directory...</td>
              </tr>
              <tr v-else-if="!sftpConnected && !errorMessage">
                <td colspan="4" class="p-4 text-center text-gray-500">
                    Not connected. 
                    <button @click="connectToSFTP" class="text-blue-500 hover:underline">Click here to connect.</button>
                </td>
              </tr>
              <tr v-else-if="files.length === 0 && !errorMessage">
                <td colspan="4" class="p-4 text-center text-gray-500">Directory is empty.</td>
              </tr>
              <tr v-for="file in files" :key="file.name" class="hover:bg-gray-50">
                <td class="px-3 py-2 whitespace-nowrap">
                  <button @click="file.isDirectory ? navigateToPath(file.path) : null" class="flex items-center text-left hover:text-blue-600">
                    <FolderIcon v-if="file.isDirectory" class="h-5 w-5 mr-2 text-yellow-500 shrink-0" />
                    <DocumentIcon v-else class="h-5 w-5 mr-2 text-gray-500 shrink-0" />
                    <span :class="{'cursor-pointer': file.isDirectory}" :title="file.name">{{ file.name }}</span>
                  </button>
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-gray-500">
                  {{ file.isDirectory ? '-' : formatFileSize(file.size) }}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-gray-500">
                  {{ formatDate(file.lastModified) }}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-gray-500">
                  <button 
                    v-if="!file.isDirectory" 
                    @click="handleFileDownload(file)"
                    class="text-blue-500 hover:text-blue-700 text-xs inline-flex items-center"
                    title="Download"
                  >
                    <ArrowDownTrayIcon class="h-4 w-4" />
                  </button>
                  <!-- Add other actions like delete, rename here later -->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, PropType, nextTick } from 'vue';
import { sftpService } from '../services/sftpService';
import type { SSHProfile, SFTPFileInfo, TransferProgress, SFTPConnectResponse, SFTPListResponse } from '../types';
import { 
    FolderIcon, 
    DocumentIcon, 
    ArrowUpIcon, 
    ArrowUpTrayIcon, 
    ArrowDownTrayIcon, 
    ArrowPathIcon,
    XMarkIcon,
    XCircleIcon,
} from '@heroicons/vue/24/outline';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  profile: {
    type: Object as PropType<SSHProfile>,
    required: true,
  },
  initialData: { 
    type: Object as PropType<SFTPConnectResponse['data'] & {sessionId: string, currentPath: string}>,
    default: null,
  },
});

const emit = defineEmits(['close']);

const currentPath = ref('/');
const files = ref<SFTPFileInfo[]>([]);
const isLoading = ref(false); 
const transfers = ref<TransferProgress[]>([]);
const sftpConnected = ref(false); 
const errorMessage = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
let sftpSessionId: string | null = null; 

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
  } catch (e) {
    return dateString; 
  }
};

const connectToSFTP = async () => {
  if (!props.profile?.id) {
    errorMessage.value = "Profile ID is missing.";
    return;
  }
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const response = await sftpService.connectAndBrowse(props.profile.id, currentPath.value);
    if (response.success && response.data) {
      sftpSessionId = response.sessionId; 
      currentPath.value = response.currentPath;
      files.value = response.data;
      sftpConnected.value = true;
    } else {
      throw new Error(response.message || "Failed to connect to SFTP.");
    }
  } catch (error: any) {
    console.error("SFTP Connection error:", error);
    errorMessage.value = error.message || "Failed to connect to SFTP.";
    sftpConnected.value = false;
  } finally {
    isLoading.value = false;
  }
};

const navigateToPath = async (newPath: string) => {
  if (!sftpConnected.value || !props.profile?.id) {
    errorMessage.value = "Not connected to SFTP or profile ID missing.";
    return;
  }
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const response = await sftpService.listFiles(props.profile.id, newPath);
    if (response.success && response.data) {
      currentPath.value = response.path; 
      files.value = response.data;
    } else {
      throw new Error(response.message || `Failed to list directory: ${newPath}`);
    }
  } catch (error: any) {
    console.error("SFTP Navigation error:", error);
    errorMessage.value = error.message || `Failed to navigate to path: ${newPath}.`;
  } finally {
    isLoading.value = false;
  }
};

const refreshCurrentDirectory = () => {
  if (currentPath.value) {
    navigateToPath(currentPath.value);
  }
};

const goUp = () => {
  if (currentPath.value === '/' || isLoading.value) return;
  const parentPath = currentPath.value.substring(0, currentPath.value.lastIndexOf('/')) || '/';
  navigateToPath(parentPath);
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const generateTransferId = (fileName: string): string => {
    return `${fileName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const filesToUpload = Array.from(target.files);
  target.value = ''; 

  for (const file of filesToUpload) {
    const transferId = generateTransferId(file.name);
    const initialProgress: TransferProgress = {
      transferId,
      fileName: file.name,
      operation: 'UPLOAD',
      totalBytes: file.size,
      transferredBytes: 0,
      percentage: 0,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      status: 'PENDING',
    };
    transfers.value.unshift(initialProgress);

    const onUploadProgressCallback = (progress: TransferProgress) => {
      const index = transfers.value.findIndex(t => t.transferId === progress.transferId);
      if (index !== -1) {
        transfers.value.splice(index, 1, progress);
      }
      if (progress.status === 'COMPLETED' || progress.status === 'FAILED' || progress.status === 'CANCELLED') {
        if (progress.status === 'COMPLETED') refreshCurrentDirectory();
      }
    };
    
    try {
      await sftpService.uploadFile(props.profile.id, currentPath.value, file, onUploadProgressCallback);
    } catch (uploadError: any) {
        const index = transfers.value.findIndex(t => t.transferId === transferId);
        if (index !== -1) {
            transfers.value[index].status = 'FAILED';
            transfers.value[index].errorMessage = uploadError.message || "Upload failed";
            transfers.value[index].percentage = 0;
        }
        console.error("Upload error:", uploadError);
    }
  }
};


const handleFileDownload = async (file: SFTPFileInfo) => {
  if (!props.profile?.id) return;
  errorMessage.value = null; 
  try {
    await sftpService.downloadFile(props.profile.id, file.path, file.name);
  } catch (error: any) {
    console.error("Download error:", error);
    errorMessage.value = error.message || `Failed to download ${file.name}.`;
  }
};

const cancelTransfer = async (transferId: string) => {
    try {
        await sftpService.cancelTransfer(transferId);
        const index = transfers.value.findIndex(t => t.transferId === transferId);
        if (index !== -1) {
            transfers.value[index].status = 'CANCELLED';
        }
    } catch (error: any) {
        console.error(`Error cancelling transfer ${transferId}:`, error);
        const index = transfers.value.findIndex(t => t.transferId === transferId);
        if (index !== -1) {
            transfers.value[index].errorMessage = `Failed to cancel: ${error.message}`;
        }
    }
};


const closeModal = () => {
  emit('close');
};

watch(() => props.isOpen, (newVal, oldVal) => {
  if (newVal && !oldVal) { 
    errorMessage.value = null;
    transfers.value = []; 
    if (props.initialData && props.initialData.sessionId) { 
      sftpSessionId = props.initialData.sessionId;
      currentPath.value = props.initialData.currentPath;
      files.value = props.initialData.files || [];
      sftpConnected.value = true;
      isLoading.value = false;
    } else if (props.profile?.id) {
      connectToSFTP(); 
    }
  } else if (!newVal && oldVal) { 
    if (sftpConnected.value && props.profile?.id) {
      sftpService.disconnectSftpSession(props.profile.id); 
    }
    sftpConnected.value = false; 
    files.value = [];
    currentPath.value = '/';
    sftpSessionId = null;
  }
});

onMounted(() => {
});

onUnmounted(() => {
  if (sftpConnected.value && props.profile?.id) {
    sftpService.disconnectSftpSession(props.profile.id); 
  }
});

</script>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e1; 
  border-radius: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background-color: #f1f5f9;
}
</style>
