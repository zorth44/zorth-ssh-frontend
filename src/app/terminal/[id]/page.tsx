'use client';

import { useEffect, useState } from 'react';
import { Box, Heading, useToast, Text, Button } from '@chakra-ui/react';
import { useTerminal } from '../../../hooks/useTerminal';
import { sshProfileService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import 'xterm/css/xterm.css';

export default function TerminalPage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { terminalRef, connected, wsConnected, initialized } = useTerminal(params.id);

  useEffect(() => {
    // Don't redirect immediately if auth is still loading
    if (authLoading) {
      console.log('Auth still loading...');
      return;
    }
    
    if (!user) {
      console.log('No user found, setting auth error');
      setAuthError(true);
      setLoading(false);
      return;
    }

    console.log('User authenticated, loading profile...');
    loadProfile();
  }, [user, authLoading, router, params.id]);

  const loadProfile = async () => {
    try {
      const data = await sshProfileService.getById(parseInt(params.id));
      setProfile(data);
    } catch (error) {
      toast({
        title: 'Error loading profile',
        description: 'Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryAuth = () => {
    router.push('/login');
  };

  if (authLoading || loading) {
    return (
      <Box p={8}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (authError) {
    return (
      <Box p={8} textAlign="center">
        <Heading size="md" mb={4}>Authentication Required</Heading>
        <Text mb={4}>You need to log in to access the terminal.</Text>
        <Button colorScheme="blue" onClick={handleRetryAuth}>
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="lg">
          {profile?.nickname} - Terminal
        </Heading>
        <Box display="flex" gap={2} alignItems="center">
          <Text fontSize="sm" color={initialized ? 'green.500' : 'orange.500'}>
            Terminal: {initialized ? 'Ready' : 'Initializing...'}
          </Text>
          <Text fontSize="sm" color={wsConnected ? 'green.500' : 'red.500'}>
            WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
          </Text>
          <Text fontSize="sm" color={connected ? 'green.500' : 'orange.500'}>
            SSH: {connected ? 'Connected' : 'Connecting...'}
          </Text>
        </Box>
      </Box>
      <Box
        ref={terminalRef}
        h="calc(100vh - 200px)"
        bg="black"
        borderRadius="md"
        overflow="hidden"
        border="1px solid"
        borderColor="gray.300"
      />
    </Box>
  );
} 