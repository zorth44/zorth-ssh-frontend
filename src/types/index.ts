export interface User {
  id: number;
  username: string;
  email: string;
}

export interface SSHProfile {
  id: number;
  nickname: string;
  host: string;
  port: number;
  username: string;
  authType: 'PASSWORD' | 'KEY';
  encryptedPassword?: string;
  encryptedPrivateKey?: string;
  keyPassphraseEncrypted?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WebSocketMessage {
  type: 'CONNECT' | 'INPUT' | 'RESIZE' | 'DISCONNECT';
  profileId?: string;
  data?: string;
  cols?: number;
  rows?: number;
}

export interface WebSocketResponse {
  type: 'OUTPUT' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED';
  data?: string;
  message?: string;
} 