import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { WebSocketMessage, WebSocketResponse } from '../types';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import 'xterm/css/xterm.css';

export function useTerminal(profileId: string) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  const initTerminal = useCallback(() => {
    if (!terminalRef.current || xtermRef.current) {
      return;
    }

    console.log('Initializing terminal...');
    
    const container = terminalRef.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.log('Container not ready, retrying...');
      setTimeout(() => initTerminal(), 100);
      return;
    }

    try {
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1a1a1a',
          foreground: '#ffffff',
        },
        cols: 80,
        rows: 24,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.open(container);
      
      setTimeout(() => {
        try {
          fitAddon.fit();
          console.log('Terminal fitted successfully');
        } catch (error) {
          console.error('Error fitting terminal:', error);
        }
      }, 100);

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;
      setInitialized(true);

      // Handle terminal input
      terminal.onData((data) => {
        if (connected && wsConnected && clientRef.current?.connected) {
          clientRef.current.publish({
            destination: '/app/input',
            body: data,
          });
        }
      });

      // Handle terminal resize
      const handleResize = () => {
        if (fitAddonRef.current && xtermRef.current) {
          try {
            fitAddonRef.current.fit();
            const { cols, rows } = xtermRef.current;
            if (connected && wsConnected && clientRef.current?.connected) {
              clientRef.current.publish({
                destination: '/app/resize',
                body: JSON.stringify({ cols, rows }),
              });
            }
          } catch (error) {
            console.error('Error resizing terminal:', error);
          }
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        console.log('Cleaning up terminal...');
        window.removeEventListener('resize', handleResize);
        if (xtermRef.current) {
          xtermRef.current.dispose();
          xtermRef.current = null;
        }
        fitAddonRef.current = null;
        setInitialized(false);
      };
    } catch (error) {
      console.error('Error initializing terminal:', error);
      setInitialized(false);
    }
  }, [connected, wsConnected]);

  const connectSSH = useCallback(() => {
    if (!clientRef.current?.connected) {
      console.log('STOMP client not connected, cannot send SSH connect');
      return;
    }

    if (connected) {
      console.log('SSH already connected');
      return;
    }

    console.log('Sending SSH connect message for profile:', profileId);
    try {
      clientRef.current.publish({
        destination: '/app/connect',
        body: profileId,
      });
    } catch (error) {
      console.error('Error sending SSH connect message:', error);
    }
  }, [profileId, connected]);

  const connectWebSocket = useCallback(() => {
    if (connectionAttempted || clientRef.current) {
      console.log('WebSocket connection already attempted or exists');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }

    setConnectionAttempted(true);
    console.log('Connecting to WebSocket...');
    const WS_URL = 'http://localhost:8080';
    
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(`${WS_URL}/api/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      onConnect: (frame) => {
        console.log('WebSocket Connected:', frame);
        setWsConnected(true);
        
        // Subscribe to terminal messages
        stompClient.subscribe('/user/queue/terminal', (message) => {
          try {
            const response: WebSocketResponse = JSON.parse(message.body);
            console.log('Received terminal message:', response);
            
            if (!xtermRef.current) return;

            switch (response.type) {
              case 'CONNECTED':
                setConnected(true);
                if (response.message) {
                  xtermRef.current.write(`\r\n\x1b[32m${response.message}\x1b[0m\r\n`);
                }
                break;
              case 'OUTPUT':
                if (response.data) {
                  xtermRef.current.write(response.data);
                }
                break;
              case 'ERROR':
                if (response.message) {
                  xtermRef.current.write(`\r\n\x1b[31mError: ${response.message}\x1b[0m\r\n`);
                }
                break;
              case 'DISCONNECTED':
                setConnected(false);
                if (response.message) {
                  xtermRef.current.write(`\r\n\x1b[33m${response.message}\x1b[0m\r\n`);
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        // Connect to SSH after WebSocket is stable
        setTimeout(() => {
          connectSSH();
        }, 1000);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setWsConnected(false);
        setConnectionAttempted(false);
      },
      onWebSocketError: (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
        setConnectionAttempted(false);
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        setConnected(false);
        setConnectionAttempted(false);
      },
      // Add connection stability settings
      reconnectDelay: 0, // Disable auto-reconnect to avoid loops
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
    });

    clientRef.current = stompClient;
    
    try {
      stompClient.activate();
    } catch (error) {
      console.error('Error activating STOMP client:', error);
      setConnectionAttempted(false);
    }
  }, [connectionAttempted, connectSSH]);

  useEffect(() => {
    console.log('useTerminal effect triggered, profileId:', profileId);
    
    // Initialize terminal first
    const initTimer = setTimeout(() => {
      initTerminal();
    }, 100);

    return () => {
      clearTimeout(initTimer);
    };
  }, [initTerminal]);

  useEffect(() => {
    if (!initialized) {
      console.log('Terminal not initialized yet');
      return;
    }

    console.log('Terminal initialized, connecting WebSocket...');
    
    // Connect WebSocket after terminal is ready
    const connectTimer = setTimeout(() => {
      connectWebSocket();
    }, 500);

    return () => {
      clearTimeout(connectTimer);
      
      // Cleanup
      if (connected && clientRef.current?.connected) {
        try {
          clientRef.current.publish({
            destination: '/app/disconnect',
            body: '',
          });
        } catch (error) {
          console.error('Error sending disconnect message:', error);
        }
      }
      
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      
      setConnected(false);
      setWsConnected(false);
      setConnectionAttempted(false);
    };
  }, [initialized, connectWebSocket, connected]);

  return {
    terminalRef,
    connected,
    wsConnected,
    initialized,
  };
} 