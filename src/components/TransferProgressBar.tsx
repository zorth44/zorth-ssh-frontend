'use client';

import React from 'react';
import {
  Box,
  Text,
  Progress,
  HStack,
  VStack,
  Badge,
  Button,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { TransferProgress } from '@/types/sftp';
import { sftpService } from '@/services/sftpService';

interface TransferProgressBarProps {
  transfer: TransferProgress;
}

export const TransferProgressBar: React.FC<TransferProgressBarProps> = ({ transfer }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return 'green';
      case 'FAILED':
        return 'red';
      case 'CANCELLED':
        return 'orange';
      case 'IN_PROGRESS':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'STARTING':
        return '准备中';
      case 'IN_PROGRESS':
        return '传输中';
      case 'COMPLETED':
        return '完成';
      case 'FAILED':
        return '失败';
      case 'CANCELLED':
        return '已取消';
      default:
        return status;
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}小时${minutes}分钟`;
    }
  };

  const handleCancel = async () => {
    try {
      await sftpService.cancelTransfer(transfer.sessionId);
    } catch (error) {
      console.error('Failed to cancel transfer:', error);
    }
  };

  return (
    <Box
      p={3}
      bg="white"
      borderRadius="md"
      border="1px"
      borderColor="gray.200"
      shadow="sm"
    >
      <VStack spacing={2} align="stretch">
        {/* File info and status */}
        <Flex align="center">
          <VStack align="start" spacing={0} flex={1}>
            <Text fontWeight="semibold" fontSize="sm">
              {transfer.fileName}
            </Text>
            <HStack spacing={2}>
              <Badge colorScheme={getStatusColor(transfer.status)} size="sm">
                {transfer.operation === 'UPLOAD' ? '上传' : '下载'}
              </Badge>
              <Badge colorScheme={getStatusColor(transfer.status)} variant="outline" size="sm">
                {getStatusText(transfer.status)}
              </Badge>
            </HStack>
          </VStack>
          
          {transfer.status === 'IN_PROGRESS' && (
            <Button size="xs" colorScheme="red" variant="ghost" onClick={handleCancel}>
              取消
            </Button>
          )}
        </Flex>

        {/* Progress bar */}
        <Progress
          value={transfer.percentage}
          colorScheme={getStatusColor(transfer.status)}
          size="md"
          borderRadius="md"
        />

        {/* Transfer stats */}
        <Flex fontSize="xs" color="gray.600">
          <Text>{transfer.percentage.toFixed(1)}%</Text>
          <Spacer />
          
          {transfer.speedFormatted && (
            <Text>{transfer.speedFormatted}</Text>
          )}
          
          {transfer.estimatedRemainingSeconds > 0 && transfer.status === 'IN_PROGRESS' && (
            <>
              <Text mx={2}>•</Text>
              <Text>剩余: {formatTime(transfer.estimatedRemainingSeconds)}</Text>
            </>
          )}
          
          {transfer.errorMessage && (
            <>
              <Text mx={2}>•</Text>
              <Text color="red.500">{transfer.errorMessage}</Text>
            </>
          )}
        </Flex>

        {/* Additional info for larger files */}
        {transfer.totalBytes > 0 && (
          <Flex fontSize="xs" color="gray.500">
            <Text>
              {(transfer.transferredBytes / (1024 * 1024)).toFixed(1)} MB / {(transfer.totalBytes / (1024 * 1024)).toFixed(1)} MB
            </Text>
          </Flex>
        )}
      </VStack>
    </Box>
  );
}; 