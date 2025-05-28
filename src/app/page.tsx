'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Spinner, VStack } from '@chakra-ui/react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 检查是否已登录
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated) {
      router.push('/profiles');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <Box 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      minH="100vh"
    >
      <VStack spacing={4}>
        <Spinner size="lg" />
        <Text>正在跳转...</Text>
      </VStack>
    </Box>
  );
}
