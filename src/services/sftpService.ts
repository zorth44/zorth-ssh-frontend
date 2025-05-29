import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { 
  SFTPFileInfo, 
  TransferProgress, 
  SFTPResponse, 
  SFTPConnectionData, 
  UploadResponse 
} from '@/types/sftp';

class SFTPService {
  private baseUrl = 'http://localhost:8080';
  private stompClient: Client | null = null;
  private subscriptions = new Map<string, any>();

  // Initialize WebSocket connection
  async connectWebSocket(): Promise<void> {
    if (this.stompClient?.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const socket = new SockJS(`${this.baseUrl}/ws`);
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (str) => console.log('STOMP Debug:', str),
        onConnect: () => {
          console.log('SFTP WebSocket connected');
          resolve();
        },
        onStompError: (frame) => {
          console.error('STOMP error:', frame);
          reject(new Error('WebSocket connection failed'));
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });
      this.stompClient.activate();
    });
  }

  // Disconnect WebSocket
  disconnectWebSocket(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.subscriptions.clear();
    }
  }

  // Connect to SFTP and get initial file listing
  async connectAndBrowse(profileId: number, initialPath: string = '/'): Promise<SFTPConnectionData> {
    const response = await fetch(`${this.baseUrl}/api/sftp/${profileId}/connect-and-browse?initialPath=${encodeURIComponent(initialPath)}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SFTPResponse<SFTPConnectionData> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }

    return result.data;
  }

  // List files in a directory
  async listFiles(profileId: number, path: string): Promise<SFTPFileInfo[]> {
    const response = await fetch(
      `${this.baseUrl}/api/sftp/${profileId}/list?path=${encodeURIComponent(path)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SFTPResponse<SFTPFileInfo[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }

    return result.data;
  }

  // Upload file with progress tracking
  async uploadFile(
    profileId: number, 
    remotePath: string, 
    file: File,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<string> {
    try {
      // Ensure WebSocket is connected
      await this.connectWebSocket();

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${this.baseUrl}/api/sftp/${profileId}/upload?path=${encodeURIComponent(remotePath)}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result: SFTPResponse<UploadResponse> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }

      const transferId = result.data.transferId;

      // Subscribe to progress updates if callback provided
      if (onProgress) {
        this.subscribeToProgress(transferId, onProgress);
      }

      return transferId;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Download file
  downloadFile(profileId: number, filePath: string, fileName: string): void {
    const downloadUrl = `${this.baseUrl}/api/sftp/${profileId}/download?path=${encodeURIComponent(filePath)}`;
    
    // Create hidden download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Create directory
  async createDirectory(profileId: number, path: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/sftp/${profileId}/mkdir?path=${encodeURIComponent(path)}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error(`Failed to create directory: ${response.statusText}`);
    }

    const result: SFTPResponse<string> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  // Delete file or directory
  async deleteFile(profileId: number, path: string, isDirectory: boolean): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/sftp/${profileId}/delete?path=${encodeURIComponent(path)}&isDirectory=${isDirectory}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete: ${response.statusText}`);
    }

    const result: SFTPResponse<string> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  // Rename/move file
  async renameFile(profileId: number, oldPath: string, newPath: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/sftp/${profileId}/rename`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oldPath, newPath }),
    });

    if (!response.ok) {
      throw new Error(`Failed to rename: ${response.statusText}`);
    }

    const result: SFTPResponse<string> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  // Subscribe to transfer progress updates
  subscribeToProgress(transferId: string, callback: (progress: TransferProgress) => void): void {
    if (!this.stompClient?.connected) {
      console.warn('WebSocket not connected, cannot subscribe to progress');
      return;
    }

    const destination = `/topic/transfer-progress/${transferId}`;
    
    const subscription = this.stompClient.subscribe(destination, (message) => {
      try {
        const progress: TransferProgress = JSON.parse(message.body);
        callback(progress);

        // Auto-unsubscribe when transfer is complete
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(progress.status)) {
          setTimeout(() => {
            this.unsubscribeFromProgress(transferId);
          }, 5000);
        }
      } catch (error) {
        console.error('Error parsing progress message:', error);
      }
    });

    this.subscriptions.set(transferId, subscription);
    console.log(`Subscribed to progress updates for transfer: ${transferId}`);
  }

  // Unsubscribe from progress updates
  unsubscribeFromProgress(transferId: string): void {
    const subscription = this.subscriptions.get(transferId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(transferId);
      console.log(`Unsubscribed from progress updates for transfer: ${transferId}`);
    }
  }

  // Get current progress for a transfer
  async getProgress(transferId: string): Promise<TransferProgress | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sftp/progress/${transferId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get progress: ${response.statusText}`);
      }

      const result: SFTPResponse<TransferProgress> = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error getting progress:', error);
      return null;
    }
  }

  // Cancel a transfer
  async cancelTransfer(transferId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sftp/progress/${transferId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel transfer: ${response.statusText}`);
      }

      const result: SFTPResponse<string> = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sftpService = new SFTPService(); 