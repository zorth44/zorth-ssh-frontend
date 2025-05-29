export interface SFTPFileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified?: string;
  permissions: string;
  owner: string;
  group: string;
}

export interface TransferProgress {
  sessionId: string;
  fileName: string;
  operation: 'UPLOAD' | 'DOWNLOAD';
  totalBytes: number;
  transferredBytes: number;
  percentage: number;
  speedBytesPerSecond: number;
  speedFormatted: string;
  startTime: string;
  lastUpdate: string;
  estimatedRemainingSeconds: number;
  status: TransferStatus;
  errorMessage?: string;
}

export type TransferStatus = 'STARTING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface SFTPResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SFTPConnectionData {
  sessionId: string;
  currentPath: string;
  files: SFTPFileInfo[];
  connected: boolean;
}

export interface UploadResponse {
  transferId: string;
  remotePath: string;
  fileName: string;
} 