'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Button,
  Text,
  Box,
  Flex,
  Spacer,
  useToast,
  Spinner,
  Input,
  Icon,
  Tooltip,
  Badge,
} from '@chakra-ui/react';
import { FiFolder, FiFile, FiUpload, FiDownload, FiArrowUp, FiRefreshCw } from 'react-icons/fi';
import { sftpService } from '@/services/sftpService';
import { SFTPFileInfo, TransferProgress, SFTPConnectionData } from '@/types/sftp';

interface SSHProfile {
  id: number;
  nickname: string;
  host: string;
  port: number;
  username: string;
  authType: 'PASSWORD' | 'KEY';
}

interface SFTPFileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SSHProfile;
  initialData?: SFTPConnectionData;
}

export const SFTPFileBrowser: React.FC<SFTPFileBrowserProps> = ({
  isOpen,
  onClose,
  profile,
  initialData,
}) => {
  const [currentPath, setCurrentPath] = useState(initialData?.currentPath || '/');
  const [files, setFiles] = useState<SFTPFileInfo[]>(initialData?.files || []);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<TransferProgress[]>([]);
  const [connected, setConnected] = useState(initialData?.connected || false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && !connected) {
      connectToSFTP();
    }

    // Cleanup WebSocket on unmount
    return () => {
      sftpService.disconnectWebSocket();
    };
  }, [isOpen, connected]);

  const connectToSFTP = async () => {
    setLoading(true);
    try {
      const data = await sftpService.connectAndBrowse(profile.id);
      setCurrentPath(data.currentPath);
      setFiles(data.files);
      setConnected(true);
      toast({
        title: 'SFTP连接成功',
        description: `已连接到 ${profile.nickname}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('SFTP connection error:', error);
      toast({
        title: 'SFTP连接失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToPath = async (newPath: string) => {
    setLoading(true);
    try {
      const newFiles = await sftpService.listFiles(profile.id, newPath);
      setFiles(newFiles);
      setCurrentPath(newPath);
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: '导航失败',
        description: error instanceof Error ? error.message : '无法访问目录',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('Starting file upload:', file.name);
    try {
      // Show initial transfer state
      const initialTransfer: TransferProgress = {
        sessionId: 'pending',
        fileName: file.name,
        operation: 'UPLOAD',
        status: 'STARTING',
        percentage: 0,
        transferredBytes: 0,
        totalBytes: file.size,
        speedBytesPerSecond: 0,
        speedFormatted: '0 B/s',
        estimatedRemainingSeconds: 0,
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };
      setTransfers(prev => [...prev, initialTransfer]);

      const transferId = await sftpService.uploadFile(
        profile.id,
        currentPath,
        file,
        (progress) => {
          console.log('Received upload progress:', progress);
          setTransfers(prev => {
            const index = prev.findIndex(t => 
              t.sessionId === progress.sessionId || 
              (t.sessionId === 'pending' && t.fileName === progress.fileName)
            );
            
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = {
                ...progress,
                sessionId: progress.sessionId,
                percentage: Math.round((progress.transferredBytes / progress.totalBytes) * 100)
              };
              return updated;
            }
            return [...prev, progress];
          });

          // Handle transfer completion
          if (progress.status === 'COMPLETED') {
            toast({
              title: '上传完成',
              description: `文件 ${file.name} 上传成功`,
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
            
            // Refresh the directory
            refreshCurrentDirectory();
            
            // Remove the transfer progress after a delay
            setTimeout(() => {
              setTransfers(prev => prev.filter(t => t.sessionId !== progress.sessionId));
            }, 2000);
          } else if (progress.status === 'FAILED') {
            toast({
              title: '上传失败',
              description: progress.errorMessage || '文件上传失败',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            
            // Remove failed transfer after a delay
            setTimeout(() => {
              setTransfers(prev => prev.filter(t => t.sessionId !== progress.sessionId));
            }, 3000);
          }
        }
      );

      console.log('Upload started with ID:', transferId);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // Remove failed transfer from the list
      setTransfers(prev => prev.filter(t => t.fileName !== file.name));
    }
  };

  const handleFileDownload = async (file: SFTPFileInfo) => {
    if (file.isDirectory) return;
    
    try {
      toast({
        title: '下载开始',
        description: `正在下载 ${file.name}`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });

      await sftpService.downloadFile(
        profile.id, 
        file.path, 
        file.name,
        (progress) => {
          setTransfers(prev => {
            const index = prev.findIndex(t => t.sessionId === progress.sessionId);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = progress;
              return updated;
            } else {
              return [...prev, progress];
            }
          });

          // Remove completed transfers after delay
          if (progress.status === 'COMPLETED') {
            setTimeout(() => {
              setTransfers(prev => prev.filter(t => t.sessionId !== progress.sessionId));
            }, 3000);
          } else if (progress.status === 'FAILED') {
            setTimeout(() => {
              setTransfers(prev => prev.filter(t => t.sessionId !== progress.sessionId));
            }, 5000);
          }
        }
      );
      
      toast({
        title: '下载完成',
        description: `文件 ${file.name} 下载成功`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: '下载失败',
        description: error instanceof Error ? error.message : '文件下载失败',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const refreshCurrentDirectory = () => {
    navigateToPath(currentPath);
  };

  const goUp = () => {
    const parentPath = currentPath.split('/').filter(Boolean).slice(0, -1).join('/');
    const newPath = parentPath ? `/${parentPath}` : '/';
    navigateToPath(newPath);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <Flex align="center">
            <Icon as={FiFolder} mr={2} />
            <Text>SFTP文件浏览器 - {profile.nickname}</Text>
            <Spacer />
            {connected && (
              <Badge colorScheme="green" mr={2}>
                已连接
              </Badge>
            )}
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch" height="70vh">
            {/* Navigation Bar */}
            <HStack spacing={2} p={3} bg="gray.50" borderRadius="md">
              <Button
                size="sm"
                leftIcon={<FiArrowUp />}
                onClick={goUp}
                disabled={currentPath === '/' || loading}
              >
                上级目录
              </Button>
              
              <Text
                flex={1}
                fontFamily="mono"
                bg="white"
                p={2}
                borderRadius="md"
                border="1px"
                borderColor="gray.200"
              >
                {currentPath}
              </Text>
              
              <Tooltip label="上传文件">
                <Button
                  size="sm"
                  leftIcon={<FiUpload />}
                  colorScheme="blue"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!connected}
                >
                  上传
                </Button>
              </Tooltip>
              
              <Tooltip label="刷新">
                <Button
                  size="sm"
                  leftIcon={<FiRefreshCw />}
                  onClick={refreshCurrentDirectory}
                  disabled={loading}
                >
                  刷新
                </Button>
              </Tooltip>
            </HStack>

            {/* Hidden file input */}
            <Input
              ref={fileInputRef}
              type="file"
              display="none"
              onChange={handleFileUpload}
            />

            {/* Transfer Progress Panel */}
            {transfers.length > 0 && (
              <Box p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                <Text fontWeight="bold" mb={2}>文件传输</Text>
                <VStack spacing={2}>
                  {transfers.map(transfer => (
                    <Box key={transfer.sessionId} p={2} bg="white" borderRadius="md">
                      <Flex align="center" justify="space-between">
                        <Text fontSize="sm">
                          {transfer.fileName} - {transfer.operation === 'UPLOAD' ? '上传' : '下载'}
                        </Text>
                        <Text fontSize="sm" color={transfer.status === 'FAILED' ? 'red.500' : 'gray.600'}>
                          {transfer.percentage.toFixed(1)}% ({transfer.speedFormatted})
                        </Text>
                      </Flex>
                      {transfer.status === 'IN_PROGRESS' && (
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => sftpService.cancelTransfer(transfer.sessionId)}
                          mt={1}
                        >
                          取消
                        </Button>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {/* File List */}
            <Box flex={1} overflowY="auto" border="1px" borderColor="gray.200" borderRadius="md">
              {loading ? (
                <Flex justify="center" align="center" h="200px">
                  <VStack>
                    <Spinner size="lg" />
                    <Text>加载中...</Text>
                  </VStack>
                </Flex>
              ) : !connected ? (
                <Flex justify="center" align="center" h="200px">
                  <VStack>
                    <Text color="gray.500">未连接到SFTP服务器</Text>
                    <Button colorScheme="blue" onClick={connectToSFTP}>
                      重新连接
                    </Button>
                  </VStack>
                </Flex>
              ) : files.length === 0 ? (
                <Flex justify="center" align="center" h="200px">
                  <Text color="gray.500">目录为空</Text>
                </Flex>
              ) : (
                <VStack spacing={0} align="stretch">
                  {files.map((file) => (
                    <Flex
                      key={file.path}
                      p={3}
                      borderBottom="1px"
                      borderColor="gray.100"
                      _hover={{ bg: 'gray.50' }}
                      cursor={file.isDirectory ? 'pointer' : 'default'}
                      onClick={() => file.isDirectory && navigateToPath(file.path)}
                    >
                      <HStack spacing={3} flex={1}>
                        <Icon
                          as={file.isDirectory ? FiFolder : FiFile}
                          color={file.isDirectory ? 'blue.500' : 'gray.600'}
                          fontSize="lg"
                        />
                        <Text fontWeight={file.isDirectory ? 'semibold' : 'normal'}>
                          {file.name}
                        </Text>
                      </HStack>
                      
                      <HStack spacing={6} minW="300px">
                        <Text fontSize="sm" color="gray.600" minW="80px">
                          {!file.isDirectory && formatFileSize(file.size)}
                        </Text>
                        <Text fontSize="sm" color="gray.600" minW="80px">
                          {formatDate(file.lastModified)}
                        </Text>
                        <Text fontSize="sm" color="gray.600" minW="80px" fontFamily="mono">
                          {file.permissions}
                        </Text>
                      </HStack>
                      
                      {!file.isDirectory && (
                        <Button
                          size="sm"
                          leftIcon={<FiDownload />}
                          colorScheme="green"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileDownload(file);
                          }}
                        >
                          下载
                        </Button>
                      )}
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}; 