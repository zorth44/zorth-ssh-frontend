'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useXTerm } from 'react-xtermjs';
import '@xterm/xterm/css/xterm.css';
import {
  Box,
  Button,
  Center,
  HStack,
  Heading,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, CloseIcon } from '@chakra-ui/icons';

interface SSHProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  nickname?: string;
}

interface TerminalSession {
  id: string;
  profileId: string;
  nickname: string;
  sessionId: string | null;
  connected?: boolean;
  sshConnected?: boolean;
}

// 移除自定义滚动条样式
const globalStyles = `
  .terminal-container {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
`;

// 单个终端会话组件
const TerminalSession: React.FC<{ 
  session: TerminalSession; 
  isActive: boolean; 
  onClientRef?: (sessionId: string, client: Client | null) => void;
}> = ({ session, isActive, onClientRef }) => {
  const [connected, setConnected] = useState(false);
  const [sshConnected, setSshConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const { instance: terminal } = useXTerm();
  const hasInitialized = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionId = session.sessionId;

  // 检查连接状态
  const checkConnection = useCallback(() => {
    const isConnected = clientRef.current?.connected || false;
    if (isConnected !== connected) {
      console.log('Connection state changed:', { isConnected, wasConnected: connected });
      setConnected(isConnected);
    }
    return isConnected;
  }, [connected]);

  // 动态测量字符尺寸
  const measureCharacterSize = useCallback(() => {
    if (!terminal || !terminalRef.current) return { charWidth: 8.4, lineHeight: 18.4 };
    
    try {
      const measureElement = document.createElement('div');
      measureElement.style.position = 'absolute';
      measureElement.style.visibility = 'hidden';
      measureElement.style.fontFamily = 'Monaco, Menlo, "Ubuntu Mono", "Courier New", monospace';
      measureElement.style.fontSize = '14px';
      measureElement.style.lineHeight = 'normal';
      measureElement.style.whiteSpace = 'pre';
      measureElement.textContent = 'M'.repeat(10);
      
      document.body.appendChild(measureElement);
      const rect = measureElement.getBoundingClientRect();
      const charWidth = rect.width / 10;
      const lineHeight = rect.height;
      
      document.body.removeChild(measureElement);
      
      return { charWidth, lineHeight };
    } catch (error) {
      console.error('Failed to measure character size:', error);
      return { charWidth: 8.4, lineHeight: 18.4 };
    }
  }, [terminal]);

  // 发送终端尺寸到服务器
  const sendTerminalSize = useCallback((cols: number, rows: number) => {
    if (connected && clientRef.current?.connected && sessionId) {
      try {
        clientRef.current.publish({
          destination: '/app/resize',
          body: JSON.stringify({
            cols,
            rows,
            sessionId
          }),
        });
      } catch (error) {
        console.error('Failed to send terminal size:', error);
      }
    }
  }, [connected, sessionId]);

  // 计算并设置终端大小
  const calculateAndSetTerminalSize = useCallback(() => {
    if (!terminal || !terminalRef.current) return;
    
    const container = terminalRef.current;
    const rect = container.getBoundingClientRect();
    
    const { charWidth, lineHeight } = measureCharacterSize();
    
    // 为底部留出一行的空间
    const paddingBottom = lineHeight;
    const cols = Math.max(Math.floor((rect.width - 20) / charWidth), 80);
    const rows = Math.max(Math.floor((rect.height - 20 - paddingBottom) / lineHeight), 24);
    
    terminal.resize(cols, rows);
    
    if (sshConnected && connected && sessionId) {
      sendTerminalSize(cols, rows);
    }
    
    return { cols, rows };
  }, [terminal, measureCharacterSize, sshConnected, connected, sessionId, sendTerminalSize]);

  // 处理用户输入
  const handleTerminalInput = useCallback((data: string) => {
    console.log('Terminal input received:', data);
    const isConnected = checkConnection();
    if (isConnected && sessionId) {
      try {
        const inputMessage = {
          input: data,
          sessionId
        };
        console.log('Sending input to server:', inputMessage);
        clientRef.current?.publish({
          destination: '/app/input',
          body: JSON.stringify(inputMessage),
        });
      } catch (error) {
        console.error('Error sending input:', error);
        if (terminal) {
          terminal.writeln(`\r\n❌ Error sending input: ${error}`);
        }
      }
    } else {
      console.log('Cannot send input - connection state:', {
        isConnected,
        hasClient: !!clientRef.current,
        clientConnected: clientRef.current?.connected,
        sessionId
      });
      if (terminal) {
        terminal.writeln('\r\n❌ Cannot send input - not connected');
      }
    }
  }, [checkConnection, sessionId, terminal]);

  // WebSocket连接
  const connectWebSocket = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    if (terminal) {
      terminal.writeln('🔄 Connecting to WebSocket...');
    }
    const WS_URL = 'http://localhost:12305';
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(`${WS_URL}/api/ws`),
      debug: (str) => console.log('STOMP Debug:', str),
      onConnect: (frame) => {
        console.log('WebSocket connected, frame:', frame);
        setConnected(true);
        if (terminal) {
          terminal.writeln('✅ WebSocket Connected!');
          terminal.writeln(`📋 Session ID: ${sessionId}`);
          terminal.focus();
        }
        stompClient.subscribe(`/topic/terminal-${sessionId}`, (message) => {
          try {
            const data = JSON.parse(message.body);
            console.log('Received message:', data);
            if (data.type === 'CONNECTED') {
              setSshConnected(true);
              if (terminal) {
                terminal.writeln('🎉 SSH Connection Established!');
                terminal.writeln(`SSH连接成功: ${data.message}`);
                terminal.writeln('');
                terminal.focus();
                
                // SSH连接成功后发送终端尺寸
                setTimeout(() => {
                  calculateAndSetTerminalSize();
                }, 300);
              }
            } else if (data.type === 'OUTPUT') {
              if (terminal) {
                terminal.write(data.data);
              }
            } else if (data.type === 'ERROR') {
              if (terminal) {
                terminal.writeln(`❌ SSH Error: ${data.message}`);
              }
            }
          } catch (error) {
            console.error('Error processing message:', error);
            if (terminal) {
              terminal.writeln(`📨 Raw message: ${message.body}`);
            }
          }
        });

        // 发送SSH连接请求
        setTimeout(() => {
          if (clientRef.current?.connected && session.profileId) {
            try {
              if (terminal) {
                terminal.writeln('📤 Sending SSH connect request...');
              }
              const connectMessage = {
                profileId: session.profileId,
                sessionId
              };
              console.log('Sending SSH connect request:', connectMessage);
              clientRef.current.publish({
                destination: '/app/connect',
                body: JSON.stringify(connectMessage),
              });
            } catch (error) {
              console.error('Error sending SSH connect:', error);
              if (terminal) {
                terminal.writeln(`❌ Error sending SSH connect: ${error}`);
              }
            }
          } else {
            console.log('Cannot send SSH connect - not ready:', {
              hasClient: !!clientRef.current,
              isConnected: clientRef.current?.connected,
              hasProfileId: !!session.profileId
            });
          }
        }, 500);
      },
      onStompError: (frame) => {
        console.error('STOMP Error:', frame);
        if (terminal) {
          terminal.writeln(`❌ STOMP Error: ${frame.headers.message || 'Unknown error'}`);
        }
        setConnected(false);
        handleReconnect();
      },
      onWebSocketError: (error) => {
        console.error('WebSocket Error:', error);
        if (terminal) {
          const errorMsg = error instanceof Error ? error.message : 
                          error && typeof error === 'object' ? JSON.stringify(error) : 
                          String(error);
          terminal.writeln(`❌ WebSocket Error: ${errorMsg}`);
        }
        setConnected(false);
        handleReconnect();
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        if (terminal) {
          terminal.writeln('🔌 WebSocket Disconnected');
        }
        setConnected(false);
        setSshConnected(false);
        handleReconnect();
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });
    clientRef.current = stompClient;
    stompClient.activate();
  }, [session.profileId, sessionId, terminal, calculateAndSetTerminalSize]);

  // 定期检查连接状态
  useEffect(() => {
    const interval = setInterval(() => {
      checkConnection();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [checkConnection]);

  // 处理重连
  const handleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (terminal) {
      terminal.writeln('🔄 Attempting to reconnect in 5 seconds...');
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      if (isActive) {
        connectWebSocket();
      }
    }, 5000);
  }, [isActive, connectWebSocket, terminal]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (clientRef.current) {
        try {
          clientRef.current.deactivate();
        } catch (error) {
          console.warn('Error deactivating WebSocket client:', error);
        }
      }
    };
  }, []);

  // 初始化终端
  useEffect(() => {
    if (terminalRef.current && terminal && !hasInitialized.current) {
      terminal.open(terminalRef.current);
      hasInitialized.current = true;
      terminal.options = {
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Courier New", monospace',
        theme: {
          background: '#1a1a1a',
          foreground: '#ffffff',
          cursor: '#ffffff',
        },
        scrollback: 1000,
        convertEol: true,
        disableStdin: false,
      };

      // 处理用户输入
      terminal.onData(handleTerminalInput);

      // 处理终端大小变化
      terminal.onResize((event: { cols: number; rows: number }) => {
        sendTerminalSize(event.cols, event.rows);
      });

      // 确保终端获得焦点
      terminal.focus();
    }
  }, [terminal, handleTerminalInput, sendTerminalSize]);

  // 添加窗口大小变化监听和ResizeObserver
  useEffect(() => {
    if (!terminal || !terminalRef.current) return;

    let resizeTimeout: NodeJS.Timeout;
    
    const handleWindowResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateAndSetTerminalSize();
      }, 200);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateAndSetTerminalSize();
      }, 200);
    });

    window.addEventListener('resize', handleWindowResize);
    resizeObserver.observe(terminalRef.current);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && terminal) {
        terminal.focus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [terminal, calculateAndSetTerminalSize]);

  // 仅在 isActive 时建立连接
  useEffect(() => {
    if (isActive && terminal && !connected && !clientRef.current && session.profileId) {
      connectWebSocket();
    }
  }, [isActive, terminal, session.profileId, connected, connectWebSocket]);

  // Notify parent about client ref for cleanup
  useEffect(() => {
    if (onClientRef && sessionId) {
      onClientRef(sessionId, clientRef.current);
    }
  }, [onClientRef, sessionId, clientRef.current]);

  return (
    <Box
      h="100%"
      minH="400px"
      bg="black"
      borderRadius="md"
      overflow="hidden"
      position="relative"
      border="2px solid #222"
      w="100%"
      display="flex"
      flexDirection="column"
      justifyContent="stretch"
    >
      <style>{globalStyles}</style>
      <div
        ref={terminalRef}
        className="terminal-container"
        style={{ 
          height: '100%', 
          width: '100%',
          padding: '10px',
          paddingBottom: '24px', // 增加底部内边距
          boxSizing: 'border-box'
        }}
        onClick={() => terminal?.focus()}
      />
    </Box>
  );
};

TerminalSession.displayName = 'TerminalSession';

const TerminalPage: React.FC = () => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profiles, setProfiles] = useState<SSHProfile[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const terminalRefs = useRef<{ [key: string]: { close: () => void } }>({});

  const profileId = searchParams.get('profileId');
  const nickname = searchParams.get('nickname');

  // 初始化第一个会话（加类型和存在性校验）
  useEffect(() => {
    if (
      typeof profileId === 'string' && profileId.length > 0 &&
      typeof nickname === 'string' && nickname.length > 0 &&
      sessions.length === 0
    ) {
      setSessions([{
        id: Date.now().toString(),
        profileId: profileId,
        nickname: nickname,
        sessionId: 'ws-' + Math.random().toString(36).substring(2, 15),
        connected: false,
        sshConnected: false
      }]);
    }
  }, [profileId, nickname, sessions.length]);

  // 获取SSH配置列表
  const fetchProfiles = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:12305/api/profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    }
  }, []);

  // 打开配置选择模态框
  const handleAddTerminal = () => {
    fetchProfiles();
    setIsProfileModalOpen(true);
  };

  // 创建新会话
  const handleCreateSession = (profile: SSHProfile) => {
    const newSession: TerminalSession = {
      id: Date.now().toString(),
      profileId: profile.id,
      nickname: profile.nickname || profile.name,
      sessionId: 'ws-' + Math.random().toString(36).substring(2, 15),
      connected: false,
      sshConnected: false
    };
    setSessions(prev => [...prev, newSession]);
    setActiveTabIndex(sessions.length);
    setIsProfileModalOpen(false);
  };

  // 关闭会话
  const handleCloseSession = (index: number) => {
    setSessions(prev => prev.filter((_, i) => i !== index));
    if (activeTabIndex >= index) {
      setActiveTabIndex(Math.max(0, activeTabIndex - 1));
    }
  };

  // 关闭所有会话
  const handleCloseAll = () => {
    // Close all WebSocket connections
    sessions.forEach(session => {
      const terminalRef = terminalRefs.current[session.id];
      if (terminalRef) {
        terminalRef.close();
      }
    });
    
    // Clear sessions and navigate to profiles page
    setSessions([]);
    setActiveTabIndex(0);
    router.push('/profiles');
  };

  return (
    <Box h="100vh" display="flex" flexDirection="column" bg="gray.900">
      <style>{globalStyles}</style>
      {/* 页头工具栏 */}
      <Box w="100%" px={8} py={4} bg="gray.800" borderBottom="1px solid #222" display="flex" alignItems="center" justifyContent="space-between">
        <HStack spacing={4} align="center">
          <Heading size="lg" color="white">Zorth WebSSH</Heading>
        </HStack>
        <HStack spacing={2}>
          <Button colorScheme="red" variant="outline" onClick={handleCloseAll} size="sm">关闭所有Tab</Button>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={handleAddTerminal} size="sm">New Terminal</Button>
        </HStack>
      </Box>
      <Box flex="1" minH={0} display="flex" flexDirection="column" p={3}>
        <VStack h="100%" flex={1} spacing={4} align="stretch">
          {sessions.length === 0 ? (
            <Center h="100%" flex={1}>
              <VStack spacing={4}>
                <Text color="gray.400">No active terminal sessions</Text>
                <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={handleAddTerminal}>Create New Terminal</Button>
              </VStack>
            </Center>
          ) : (
            <Box flex={1} w="100%" position="relative" h="100%" minH={0}>
              <Tabs
                index={activeTabIndex}
                onChange={setActiveTabIndex}
                variant="soft-rounded"
                colorScheme="blue"
                size="md"
                w="100%"
                isFitted
                h="100%"
                display="flex"
                flexDirection="column"
              >
                <TabList bg="gray.900" borderRadius="md" px={2} mb={4}>
                  {sessions.map((session, index) => (
                    <Tab
                      key={session.id}
                      _selected={{
                        bg: 'blue.600',
                        color: 'white',
                        fontWeight: 'bold',
                        border: 'none',
                      }}
                      _hover={{
                        bg: 'blue.800',
                        color: 'white',
                      }}
                      color="gray.200"
                      mr={2}
                      px={4}
                      py={2}
                      borderRadius="md"
                    >
                      <HStack spacing={2}>
                        <Text>{session.nickname}</Text>
                        <IconButton
                          aria-label="Close terminal"
                          icon={<CloseIcon />}
                          size="xs"
                          variant="ghost"
                          colorScheme="gray"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseSession(index);
                          }}
                        />
                      </HStack>
                    </Tab>
                  ))}
                </TabList>
                <TabPanels h="100%" flex={1}>
                  {sessions.map((session, index) => (
                    <TabPanel key={session.id} h="100%" p={0}>
                      <Box
                        h="100%"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        p={2}
                      >
                        <Box
                          w="100%"
                          h="100%"
                          maxW="90vw"
                          maxH="80vh"
                          position="relative"
                        >
                          <TerminalSession
                            session={session}
                            isActive={index === activeTabIndex}
                            onClientRef={(sessionId, client) => {
                              if (client) {
                                terminalRefs.current[sessionId] = { 
                                  close: () => {
                                    try {
                                      client.deactivate();
                                    } catch (error) {
                                      console.warn('Error deactivating WebSocket client:', error);
                                    }
                                  }
                                };
                              } else {
                                delete terminalRefs.current[sessionId];
                              }
                            }}
                          />
                        </Box>
                      </Box>
                    </TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </Box>
          )}
        </VStack>
      </Box>
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        size="md"
      >
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader color="white">选择SSH配置</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {profiles.map(profile => (
                <Button
                  key={profile.id}
                  variant="outline"
                  colorScheme="blue"
                  onClick={() => handleCreateSession(profile)}
                  justifyContent="flex-start"
                  h="auto"
                  p={4}
                >
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">{profile.nickname || profile.name}</Text>
                    <Text fontSize="sm" color="gray.400">
                      {profile.username}@{profile.host}:{profile.port}
                    </Text>
                  </VStack>
                </Button>
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TerminalPage; 