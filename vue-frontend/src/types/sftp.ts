export interface SFTPFileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified?: string; // Should be ISO string if present
  permissions?: string; // e.g. 'drwxr-xr-x'
  owner?: string; // or UID
  group?: string; // or GID
}

export interface TransferProgress {
  transferId: string; // Changed from sessionId to transferId for clarity
  fileName: string;
  operation: 'UPLOAD' | 'DOWNLOAD';
  totalBytes: number;
  transferredBytes: number;
  percentage: number;
  speedBytesPerSecond?: number; // Optional, might not always be available
  speedFormatted?: string;    // Optional
  startTime: string; // ISO string
  lastUpdate: string; // ISO string
  estimatedRemainingSeconds?: number; // Optional
  status: TransferStatus;
  errorMessage?: string;
}

export type TransferStatus = 'PENDING' | 'STARTING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';

// Generic SFTP API Response structure (if your backend uses one)
export interface SFTPBaseResponse<T = null> {
  success: boolean;
  message?: string; // Optional message, especially for errors
  data?: T; // Generic data payload
}

// Specific response for listing files
export interface SFTPListResponse extends SFTPBaseResponse<SFTPFileInfo[]> {
  path: string; // Current path of the listing
}

// Specific response for connectAndBrowse
export interface SFTPConnectResponse extends SFTPBaseResponse<SFTPFileInfo[]> {
  sessionId: string; // Session ID for this SFTP connection instance on the backend
  currentPath: string;
  // files are in data
}


// Response for upload (might include transferId or final file info)
export interface SFTPUploadResponse extends SFTPBaseResponse<{
  transferId: string;
  remotePath: string;
  fileName: string;
}> {}

// Response for operations like mkdir, delete, rename
export interface SFTPOperationResponse extends SFTPBaseResponse<{
  path?: string; // Path affected
  newPath?: string; // For rename
}> {}

// For download, the response is typically the file stream itself,
// but an initial request might return a SFTPBaseResponse if it's an indirect download.

// This type was SFTPConnectionData, renamed to SFTPBrowseData for clarity as it's result of browsing
export interface SFTPBrowseData {
  sessionId: string;
  currentPath: string;
  files: SFTPFileInfo[];
  connected: boolean; // Is the backend SFTP session still alive?
}
