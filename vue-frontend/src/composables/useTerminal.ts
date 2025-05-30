import { ref, onUnmounted, shallowRef, watch, nextTick } from 'vue';
import { Terminal, ITerminalOptions, ITheme } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { websocketService } from '../services/websocket';
import type { WebSocketMessage, WebSocketResponse } from '../types'; // TerminalResizeArgs not explicitly used here but good for context
import 'xterm/css/xterm.css';

// Define a basic theme for xterm.js (can be customized)
const xtermTheme: ITheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  selectionBackground: '#555555',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8ff9',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
};

export function useTerminal(profileId: string) {
  const terminalElRef = shallowRef<HTMLDivElement | null>(null); // To be set by the component
  const xterm = shallowRef<Terminal | null>(null);
  const fitAddon = shallowRef<FitAddon | null>(null);
  
  const wsConnected = ref(websocketService.connected);
  const sshConnected = ref(false); // Tracks SSH connection state via WebSocket messages
  const terminalInitialized = ref(false);
  const isLoading = ref(true); // Overall loading state for terminal setup
  const errorMessage = ref<string | null>(null);

  let unsubscribeWsMessages: (() => void) | null = null;
  let wsConnectionCheckInterval: number | undefined;


  const initTerminal = (containerElement: HTMLDivElement) => {
    if (!containerElement || xterm.value) return; // Already initialized or no container

    terminalElRef.value = containerElement;
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: xtermTheme,
        rows: 20, // Initial rows, FitAddon will adjust
        cols: 80, // Initial cols
        convertEol: true, // Convert \n to \r\n for proper display on some systems
      });

      const currentFitAddon = new FitAddon();
      const webLinks = new WebLinksAddon();

      fitAddon.value = currentFitAddon;
      xterm.value = term;

      term.loadAddon(currentFitAddon);
      term.loadAddon(webLinks);
      term.open(containerElement);
      
      // Fit the terminal shortly after opening
      setTimeout(() => {
        currentFitAddon.fit();
        // Send initial size after fit
        if (sshConnected.value && websocketService.connected && xterm.value) {
           websocketService.sendMessage({ type: 'RESIZE', cols: xterm.value.cols, rows: xterm.value.rows });
        }
      }, 100); 


      term.onData((data) => {
        if (sshConnected.value && websocketService.connected) {
          websocketService.sendMessage({ type: 'INPUT', data });
        } else {
          console.warn('SSH or WebSocket not connected, ignoring terminal input.');
        }
      });
      
      term.onResize(({ cols, rows }) => {
         if (sshConnected.value && websocketService.connected) {
            websocketService.sendMessage({ type: 'RESIZE', cols, rows });
         }
      });

      terminalInitialized.value = true;
    } catch (error: any) {
      console.error('Error initializing terminal:', error);
      errorMessage.value = `Failed to initialize terminal: ${error.message}`;
    } finally {
      isLoading.value = false; 
    }
  };

  const connectSocketAndSsh = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      errorMessage.value = 'Authentication token not found. Cannot connect.';
      isLoading.value = false;
      return;
    }

    // If websocketService is not connected, connect it.
    // This assumes websocketService.connect is idempotent or handles multiple calls.
    if (!websocketService.connected) {
      websocketService.connect(token);
    }
    
    // Check connection status periodically and attempt SSH connect once WS is up
    // This is a simplified way to handle async WebSocket connection.
    // A better way would be for websocketService to return a Promise or use events for connection status.
    let attempts = 0;
    const maxAttempts = 10; // Try for 5 seconds (10 * 500ms)
    
    wsConnectionCheckInterval = window.setInterval(() => {
        attempts++;
        wsConnected.value = websocketService.connected; // Update reactive var

        if (websocketService.connected) {
            clearInterval(wsConnectionCheckInterval);
            wsConnectionCheckInterval = undefined;
            console.log('WebSocket connected, attempting SSH connection...');
            if (xterm.value) xterm.value.writeln('\r\n\x1b[32mWebSocket connected. Attempting SSH...\x1b[0m');
            websocketService.sendMessage({ type: 'CONNECT', profileId: profileId });
        } else if (attempts >= maxAttempts) {
            clearInterval(wsConnectionCheckInterval);
            wsConnectionCheckInterval = undefined;
            errorMessage.value = 'Failed to connect to WebSocket after several attempts.';
            isLoading.value = false;
            if (xterm.value) xterm.value.writeln('\r\n\x1b[31mFailed to connect to WebSocket. Please try again later.\x1b[0m');
        }
    }, 500);

  };

  const handleResize = () => {
    if (fitAddon.value) {
      try {
        fitAddon.value.fit();
        // onResize event in xterm will handle sending new dimensions via websocket
      } catch (error) {
        console.warn("FitAddon fit error:", error)
      }
    }
  };

  // Setup WebSocket message listener
  if (!unsubscribeWsMessages) {
      unsubscribeWsMessages = websocketService.onMessage((response: WebSocketResponse) => {
      wsConnected.value = websocketService.connected; // Keep wsConnected reactive var updated
      if (!xterm.value) return;

      switch (response.type) {
        case 'CONNECTED':
          sshConnected.value = true;
          isLoading.value = false; // Overall loading done once SSH is connected
          xterm.value.writeln(`\r\n\x1b[32m${response.message || 'SSH session connected.'}\x1b[0m`);
          // Perform initial fit and send resize after connection
          nextTick(() => { // Ensure DOM is ready for fit
            handleResize();
          });
          break;
        case 'OUTPUT':
          if (response.data) {
            xterm.value.write(response.data);
          }
          break;
        case 'ERROR':
          sshConnected.value = false; // Assume error means SSH connection might be lost
          isLoading.value = false;
          errorMessage.value = response.message || 'An unknown error occurred.';
          xterm.value.writeln(`\r\n\x1b[31mError: ${response.message || 'Unknown error'}\x1b[0m`);
          break;
        case 'DISCONNECTED':
          sshConnected.value = false;
          isLoading.value = false;
          xterm.value.writeln(`\r\n\x1b[33m${response.message || 'SSH session disconnected.'}\x1b[0m`);
          break;
      }
    });
  }
  
  // Watch for external changes to websocketService.connected (e.g., if another part of app disconnects it)
  // This is a fallback, ideally websocketService would use an event emitter for connection status.
  const wsWatcherInterval = setInterval(() => {
    if (wsConnected.value !== websocketService.connected) {
      wsConnected.value = websocketService.connected;
      if (!websocketService.connected && sshConnected.value) {
        // If WS disconnects while SSH was thought to be active
        sshConnected.value = false;
        if(xterm.value) xterm.value.writeln('\r\n\x1b[31mWebSocket connection lost.\x1b[0m');
        errorMessage.value = "WebSocket connection lost.";
      }
    }
  }, 1000);


  // Lifecycle Management (to be called from the component using this composable)
  const mountTerminal = (containerDiv: HTMLDivElement) => {
    if (!containerDiv) {
        errorMessage.value = "Terminal container element not found.";
        isLoading.value = false;
        return;
    }
    initTerminal(containerDiv); // Initialize xterm.js instance
    connectSocketAndSsh(); // Start WebSocket and SSH connection process
    window.addEventListener('resize', handleResize);
  };

  const unmountTerminal = () => {
    if (sshConnected.value && websocketService.connected) {
      websocketService.sendMessage({ type: 'DISCONNECT' });
    }
    // Do not call websocketService.disconnect() here if it's shared across the app.
    // If this terminal instance is the SOLE user of the websocket, then it's okay.
    // Assuming for now it might be shared or managed globally.
    // websocketService.disconnect(); 

    if (xterm.value) {
      xterm.value.dispose();
      xterm.value = null;
    }
    if (unsubscribeWsMessages) {
      unsubscribeWsMessages();
      unsubscribeWsMessages = null;
    }
    if (wsConnectionCheckInterval) {
        clearInterval(wsConnectionCheckInterval);
        wsConnectionCheckInterval = undefined;
    }
    clearInterval(wsWatcherInterval);
    window.removeEventListener('resize', handleResize);
    terminalInitialized.value = false;
    sshConnected.value = false;
    wsConnected.value = false; // Reflect that this composable instance is no longer tracking
  };

  // Expose reactive state and methods
  return {
    terminalElRef, // Deprecated: component should manage its own ref and pass to mountTerminal
    xtermInstance: xterm, // For advanced direct manipulation if needed, use with caution
    sshConnected,
    wsConnected, // Reflects websocketService.connected state
    terminalInitialized,
    isLoading,
    errorMessage,
    mountTerminal,   // Component calls this in its onMounted with the div
    unmountTerminal, // Component calls this in its onUnmounted
    handleResize,    // Expose if manual resize trigger is needed
  };
}
