import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WebSocketMessage, WebSocketResponse } from '../types';

class WebSocketService {
  private client: Client | null = null;
  private messageHandlers: ((message: WebSocketResponse) => void)[] = [];
  private sessionId: string | null = null;
  private isConnecting: boolean = false;

  connect(token: string) {
    if (this.client && this.client.connected) {
      console.log('WebSocket already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    this.isConnecting = true;
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';
    
    console.log('Creating STOMP client with URL:', `${WS_URL}/api/ws`);
    
    this.client = new Client({
      webSocketFactory: () => {
        console.log('Creating SockJS connection...');
        return new SockJS(`${WS_URL}/api/ws`);
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      onConnect: (frame) => {
        console.log('Connected to WebSocket:', frame);
        this.sessionId = frame.headers['session'];
        this.isConnecting = false;
        
        // Subscribe to terminal messages
        this.client?.subscribe('/user/topic/terminal', (message) => {
          try {
            const response: WebSocketResponse = JSON.parse(message.body);
            console.log('Received terminal message:', response);
            this.messageHandlers.forEach(handler => handler(response));
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        this.isConnecting = false;
      },
      onWebSocketError: (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      },
      onDisconnect: () => {
        console.log('Disconnected from WebSocket');
        this.isConnecting = false;
      },
      // Add reconnection settings
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    try {
      this.client.activate();
      console.log('STOMP client activated');
    } catch (error) {
      console.error('Error activating STOMP client:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.client) {
      console.log('Disconnecting WebSocket...');
      this.client.deactivate();
      this.client = null;
      this.sessionId = null;
      this.isConnecting = false;
    }
  }

  sendMessage(message: WebSocketMessage) {
    if (!this.client || !this.client.connected) {
      console.error('WebSocket not connected, cannot send message:', message);
      return;
    }

    console.log('Sending WebSocket message:', message);

    try {
      switch (message.type) {
        case 'CONNECT':
          this.client.publish({
            destination: '/app/connect',
            body: message.profileId,
          });
          break;
        case 'INPUT':
          this.client.publish({
            destination: '/app/input',
            body: message.data,
          });
          break;
        case 'RESIZE':
          this.client.publish({
            destination: '/app/resize',
            body: JSON.stringify({
              cols: message.cols,
              rows: message.rows,
            }),
          });
          break;
        case 'DISCONNECT':
          this.client.publish({
            destination: '/app/disconnect',
            body: '',
          });
          break;
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  onMessage(handler: (message: WebSocketResponse) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  get connected() {
    return this.client?.connected || false;
  }
}

export const websocketService = new WebSocketService(); 