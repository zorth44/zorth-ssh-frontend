import apiClient from './api'; // Using the global apiClient
import { Client, type IFrame, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type {
  SFTPFileInfo,
  TransferProgress,
  SFTPConnectResponse,
  SFTPListResponse,
  SFTPUploadResponse,
  SFTPOperationResponse,
  // SFTPBaseResponse, // If needed for generic error handling
} from '../types'; // Assuming types are exported from index.ts which re-exports from sftp.ts

class SFTPService {
  private stompClient: Client | null = null;
  private progressSubscriptions: Map<string, StompSubscription> = new Map();
  private WS_BASE_URL = 'http://localhost:12305'; // Hardcoded, replace with env var if needed

  private connectWebSocket(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.stompClient && this.stompClient.connected) {
        resolve();
        return;
      }

      const currentToken = token || localStorage.getItem('authToken');
      if (!currentToken) {
        reject(new Error('No auth token found for WebSocket connection.'));
        return;
      }
      
      const wsUrl = `${this.WS_BASE_URL}/api/ws`; // Progress updates might use a different path or same STOMP endpoint
      
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        connectHeaders: { Authorization: `Bearer ${currentToken}` },
        debug: (str) => { if (import.meta.env.DEV) console.log('SFTP STOMP Debug:', str); },
        onConnect: () => {
          console.log('SFTP Progress WebSocket connected.');
          resolve();
        },
        onStompError: (frame: IFrame) => {
          console.error('SFTP Progress STOMP error:', frame);
          reject(new Error(`STOMP error: ${frame.headers?.message || 'Unknown error'}`));
        },
        onWebSocketError: (error) => {
          console.error('SFTP Progress WebSocket error:', error);
          reject(error);
        },
        reconnectDelay: 5000,
      });
      this.stompClient.activate();
    });
  }

  private disconnectWebSocket() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.progressSubscriptions.clear(); // Clear all subscriptions on disconnect
      console.log('SFTP Progress WebSocket disconnected.');
    }
  }

  async connectAndBrowse(profileId: number, initialPath: string = '/'): Promise<SFTPConnectResponse> {
    const response = await apiClient.post<SFTPConnectResponse>(`/sftp/${profileId}/connect-and-browse`, { path: initialPath });
    return response.data;
  }

  async listFiles(profileId: number, path: string): Promise<SFTPListResponse> {
    const response = await apiClient.get<SFTPListResponse>(`/sftp/${profileId}/list`, { params: { path } });
    return response.data;
  }

  async uploadFile(
    profileId: number,
    remotePath: string,
    file: File,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<SFTPUploadResponse> {
    const transferId = `${file.name}-${Date.now()}`; // Simple unique ID
    const formData = new FormData();
    formData.append('file', file);
    // Add other necessary fields to formData if backend expects them (e.g., remotePath, transferId)
    // Or pass them as query params. Let's assume query params for now.

    const params = new URLSearchParams({
        remotePath: remotePath,
        fileName: file.name,
        totalBytes: file.size.toString(),
        transferId: transferId,
    });

    if (onProgress) {
      try {
        await this.connectWebSocket(); // Ensure WebSocket is connected for progress
        this.subscribeToProgress(transferId, onProgress);
      } catch(wsError) {
         console.error("WebSocket connection for progress failed:", wsError);
         // Proceed with upload but indicate progress won't be available
         if(onProgress) onProgress({ // Send a PENDING/STARTING state with error note
            transferId, fileName: file.name, operation: 'UPLOAD', totalBytes: file.size, 
            transferredBytes: 0, percentage: 0, startTime: new Date().toISOString(), 
            lastUpdate: new Date().toISOString(), status: 'PENDING', 
            errorMessage: "Progress updates unavailable: WebSocket connection failed."
         });
      }
    }
    
    try {
        const response = await apiClient.post<SFTPUploadResponse>(
            `/sftp/${profileId}/upload?${params.toString()}`, 
            formData, 
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    } finally {
        // Unsubscribe after upload attempt, whether success or failure, if onProgress was used.
        // Backend should also ensure progress topic is cleaned up.
        if (onProgress) {
            // Delay slightly to allow final progress messages to arrive
            setTimeout(() => this.unsubscribeFromProgress(transferId), 2000);
        }
    }
  }

  async downloadFile(profileId: number, filePath: string, fileName: string): Promise<void> {
    const url = `${apiClient.defaults.baseURL}/sftp/${profileId}/download?path=${encodeURIComponent(filePath)}`;
    const token = localStorage.getItem('authToken');

    // Use fetch for more control over headers and to handle blob response
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName || filePath.split('/').pop() || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  async createDirectory(profileId: number, path: string): Promise<SFTPOperationResponse> {
    const response = await apiClient.post<SFTPOperationResponse>(`/sftp/${profileId}/mkdir`, { path });
    return response.data;
  }

  async deleteFile(profileId: number, path: string, isDirectory: boolean = false): Promise<SFTPOperationResponse> {
    const response = await apiClient.delete<SFTPOperationResponse>(`/sftp/${profileId}/delete`, { params: { path, isDirectory } });
    return response.data;
  }

  async renameFile(profileId: number, oldPath: string, newPath: string): Promise<SFTPOperationResponse> {
    const response = await apiClient.put<SFTPOperationResponse>(`/sftp/${profileId}/rename`, { oldPath, newPath });
    return response.data;
  }

  subscribeToProgress(transferId: string, callback: (progress: TransferProgress) => void) {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('STOMP client not connected. Cannot subscribe to progress.');
      // Attempt to connect, then subscribe? Or throw error? For now, log and potentially fail silently or with initial error.
      // callback({ transferId, fileName: 'N/A', operation: 'UPLOAD', totalBytes:0, transferredBytes:0, percentage:0, status:'FAILED', errorMessage: 'WebSocket not connected for progress.' });
      return;
    }
    const topic = `/topic/transfer-progress/${transferId}`;
    const subscription = this.stompClient.subscribe(topic, (message: IFrame) => {
      try {
        const progressData: TransferProgress = JSON.parse(message.body);
        callback(progressData);
      } catch (e) {
        console.error('Error parsing progress message:', e);
      }
    });
    this.progressSubscriptions.set(transferId, subscription);
    console.log(`Subscribed to progress for transfer ID: ${transferId}`);
  }

  unsubscribeFromProgress(transferId: string) {
    const subscription = this.progressSubscriptions.get(transferId);
    if (subscription) {
      subscription.unsubscribe();
      this.progressSubscriptions.delete(transferId);
      console.log(`Unsubscribed from progress for transfer ID: ${transferId}`);
    }
    // Optionally disconnect WebSocket if no more subscriptions are active
    // if (this.progressSubscriptions.size === 0) {
    //   this.disconnectWebSocket();
    // }
  }
  
  async getProgress(transferId: string): Promise<TransferProgress> {
    const response = await apiClient.get<{data: TransferProgress}>(`/sftp/progress/${transferId}`); // Assuming backend wraps in 'data'
    return response.data.data;
  }

  async cancelTransfer(transferId: string): Promise<SFTPOperationResponse> {
    const response = await apiClient.post<SFTPOperationResponse>(`/sftp/progress/${transferId}/cancel`);
    return response.data;
  }

  // Call this method if SFTP operations for a profile are done, or on page unload.
  // This is for backend SFTP session cleanup, not WebSocket.
  async disconnectSftpSession(profileId: number): Promise<void> {
    try {
      await apiClient.post(`/sftp/${profileId}/disconnect`);
      console.log(`SFTP session disconnect requested for profile ID: ${profileId}`);
    } catch (error) {
      console.error(`Failed to request SFTP session disconnect for profile ID: ${profileId}`, error);
    }
  }
}

export const sftpService = new SFTPService();
