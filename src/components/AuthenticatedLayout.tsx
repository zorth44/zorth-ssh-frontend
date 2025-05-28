import { ReactNode } from 'react';
import { Box, Flex, Button, Heading, useColorModeValue } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    router.push('/login');
  };

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Box
        as="nav"
        position="fixed"
        w="100%"
        bg={bgColor}
        borderBottom="1px"
        borderColor={borderColor}
        zIndex={1}
      >
        <Flex
          h={16}
          alignItems="center"
          justifyContent="space-between"
          maxW="7xl"
          mx="auto"
          px={4}
        >
          <Heading size="md" cursor="pointer" onClick={() => router.push('/profiles')}>
            Zorth WebSSH
          </Heading>

          <Flex alignItems="center" gap={4}>
            <Button
              variant="ghost"
              onClick={() => router.push('/profiles')}
            >
              配置管理
            </Button>
            <Button
              onClick={handleLogout}
              colorScheme="red"
              variant="ghost"
            >
              退出登录
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Box pt={16}>
        <Box maxW="7xl" mx="auto" px={4} py={8}>
          {children}
        </Box>
      </Box>
    </Box>
  );
} 