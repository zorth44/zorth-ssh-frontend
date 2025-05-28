import { ReactNode } from 'react';
import { Box, Flex, Button, Heading, useColorModeValue } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

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
          <Link href="/" passHref>
            <Heading size="md" cursor="pointer">
              WebSSH
            </Heading>
          </Link>

          <Flex alignItems="center" gap={4}>
            {user ? (
              <>
                <Link href="/dashboard" passHref>
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Button onClick={logout} colorScheme="red" variant="ghost">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" passHref>
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register" passHref>
                  <Button colorScheme="blue">Register</Button>
                </Link>
              </>
            )}
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