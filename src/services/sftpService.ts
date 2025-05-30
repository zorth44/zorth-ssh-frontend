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
  private baseUrl = 'http://localhost:12305/api';
  private stompClient: Client | null = null;
  private subscriptions = new Map<string, any>();

  // Initialize WebSocket connection
  async connectWebSocket(): Promise<void> {
    if (this.stompClient?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket...');
    return new Promise((resolve, reject) => {
      const socket = new SockJS(`${this.baseUrl}/ws`);
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (str) => console.log('STOMP Debug:', str),
        onConnect: () => {
          console.log('SFTP WebSocket connected successfully');
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
    const response = await fetch(`${this.baseUrl}/sftp/${profileId}/connect-and-browse?initialPath=${encodeURIComponent(initialPath)}`, {
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
      `${this.baseUrl}/sftp/${profileId}/list?path=${encodeURIComponent(path)}`
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
      // Generate transferId on frontend
      const transferId = this.generateTransferId();

      // Ensure WebSocket is connected before proceeding
      if (onProgress) {
        await this.connectWebSocket();
        
        // Subscribe to progress BEFORE starting the upload
        this.subscribeToProgress(transferId, (progress) => {
          onProgress(progress);
          // Unsubscribe when transfer is completed or failed
          if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
            this.unsubscribeFromProgress(transferId);
          }
        });
      }

      // Upload file directly with transferId (no prepare-upload needed)
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(
        `${this.baseUrl}/sftp/${profileId}/upload?path=${encodeURIComponent(remotePath)}&transferId=${transferId}&fileName=${encodeURIComponent(file.name)}&totalBytes=${file.size}`,
        { method: 'POST', body: formData }
      );
      const uploadResult: SFTPResponse<any> = await uploadRes.json();
      if (!uploadResult.success) throw new Error(uploadResult.message);

      return transferId;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Download file
  async downloadFile(
    profileId: number, 
    filePath: string, 
    fileName: string,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<void> {
    try {
      // For downloads, we'll let the browser handle it directly to show native progress
      const downloadUrl = `${this.baseUrl}/sftp/${profileId}/download?path=${encodeURIComponent(filePath)}`;
      
      // Create a temporary link and click it to trigger browser download with progress
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  // Create directory
  async createDirectory(profileId: number, path: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/sftp/${profileId}/mkdir?path=${encodeURIComponent(path)}`,
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
      `${this.baseUrl}/sftp/${profileId}/delete?path=${encodeURIComponent(path)}&isDirectory=${isDirectory}`,
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
    const response = await fetch(`${this.baseUrl}/sftp/${profileId}/rename`, {
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
  private subscribeToProgress(transferId: string, callback: (progress: TransferProgress) => void): void {
    console.log('Attempting to subscribe to progress for transfer:', transferId);
    
    if (!this.stompClient?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    const destination = `/topic/transfer-progress/${transferId}`;
    console.log('Subscribing to destination:', destination);

    try {
      const subscription = this.stompClient.subscribe(destination, (message) => {
        const progress: TransferProgress = JSON.parse(message.body);
        console.log('Received progress update:', progress);
        callback(progress);

        // Only unsubscribe if the transfer is completed or failed
        if (progress.status === 'COMPLETED' || progress.status === 'FAILED' || progress.status === 'CANCELLED') {
          console.log(`Transfer ${transferId} ${progress.status.toLowerCase()}, unsubscribing...`);
          this.unsubscribeFromProgress(transferId);
        }
      });

      this.subscriptions.set(transferId, subscription);
      console.log('Successfully subscribed to progress updates for transfer:', transferId);
    } catch (error) {
      console.error('Error subscribing to progress updates:', error);
    }
  }

  // Unsubscribe from transfer progress updates
  unsubscribeFromProgress(transferId: string): void {
    const subscription = this.subscriptions.get(transferId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(transferId);
      console.log('Unsubscribed from progress updates for transfer:', transferId);
    }
  }

  // Get current progress for a transfer
  async getProgress(transferId: string): Promise<TransferProgress | null> {
    try {
      const response = await fetch(`${this.baseUrl}/sftp/progress/${transferId}`);
      
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
      const response = await fetch(`${this.baseUrl}/sftp/progress/${transferId}/cancel`, {
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

  // Generate unique transfer ID
  private generateTransferId(): string {
    return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const sftpService = new SFTPService(); 