import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { WebSocketMessage, WebSocketResponse } from '../types/index'; // Adjusted import path

class WebSocketService {
  private client: Client | null = null;
  private messageHandlers: ((message: WebSocketResponse) => void)[] = [];
  private sessionId: string | null = null; // Currently not explicitly used but good to keep track of
  private isConnecting: boolean = false;

  // Hardcoded WebSocket URL for now, can be replaced with Vite env variable later
  private WS_BASE_URL = 'http://localhost:12305'; 

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
    const wsUrl = `${this.WS_BASE_URL}/api/ws`; // Construct the full WebSocket endpoint
    
    console.log('Creating STOMP client with URL:', wsUrl);
    
    this.client = new Client({
      webSocketFactory: () => {
        console.log('Creating SockJS connection to:', wsUrl);
        return new SockJS(wsUrl); // Use the constructed URL
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        // Conditionally log STOMP debug messages, e.g., only in development
        if (import.meta.env.DEV) {
          console.log('STOMP Debug:', str);
        }
      },
      onConnect: (frame) => {
        console.log('Connected to WebSocket:', frame);
        this.sessionId = frame.headers['session']; // Store session ID from headers
        this.isConnecting = false;
        
        // Subscribe to user-specific terminal messages
        // The backend routes messages to the correct user based on their STOMP session/principal
        this.client?.subscribe('/user/topic/terminal', (message) => {
          try {
            const response: WebSocketResponse = JSON.parse(message.body);
            // console.log('Received terminal message:', response); // Can be verbose
            this.messageHandlers.forEach(handler => handler(response));
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        // Potentially subscribe to other topics if needed, e.g., SFTP notifications
        // this.client?.subscribe('/user/topic/sftp', (message) => { ... });

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
        this.sessionId = null;
      },
      reconnectDelay: 5000, // Attempt to reconnect every 5 seconds
      heartbeatIncoming: 4000, // Expect a heartbeat from the server every 4 seconds
      heartbeatOutgoing: 4000, // Send a heartbeat to the server every 4 seconds
    });

    try {
      this.client.activate();
      console.log('STOMP client activation requested');
    } catch (error) {
      console.error('Error activating STOMP client:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.client) {
      console.log('Disconnecting WebSocket...');
      this.client.deactivate(); // This will trigger onDisconnect callback
      this.client = null; // Clear the client instance
      // Note: isConnecting and sessionId will be reset in onDisconnect
    }
  }

  sendMessage(message: WebSocketMessage) {
    if (!this.client || !this.client.connected) {
      console.error('WebSocket not connected, cannot send message:', message);
      // Optionally queue message or throw error
      return;
    }

    // console.log('Sending WebSocket message:', message); // Can be verbose

    try {
      // Using a common destination prefix for simplicity, backend can route based on message type or content
      const destinationPrefix = '/app'; 
      let bodyContent: string;

      switch (message.type) {
        case 'CONNECT':
          bodyContent = JSON.stringify({ profileId: message.profileId });
          this.client.publish({ destination: `${destinationPrefix}/connect`, body: bodyContent });
          break;
        case 'INPUT':
          bodyContent = JSON.stringify({ data: message.data });
          this.client.publish({ destination: `${destinationPrefix}/input`, body: bodyContent });
          break;
        case 'RESIZE':
          bodyContent = JSON.stringify({ cols: message.cols, rows: message.rows });
          this.client.publish({ destination: `${destinationPrefix}/resize`, body: bodyContent });
          break;
        case 'DISCONNECT':
          // Disconnect might not need a body, or could include profileId if server manages multiple connections per session
          this.client.publish({ destination: `${destinationPrefix}/disconnect`, body: '' });
          break;
        default:
          console.warn('Unknown WebSocket message type:', message.type);
          return; // Do not send unknown message types
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  onMessage(handler: (message: WebSocketResponse) => void): () => void {
    this.messageHandlers.push(handler);
    // Return an unsubscribe function
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  get connected(): boolean {
    return this.client?.connected || false;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }
}

// Export a singleton instance of the service
export const websocketService = new WebSocketService();
