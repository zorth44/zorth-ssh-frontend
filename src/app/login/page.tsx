'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  VStack,
  useToast,
  Text,
  Container,
  InputGroup,
  InputRightElement,
  IconButton,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: '登录成功',
          description: data.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        localStorage.setItem('authenticated', 'true');
        router.push('/profiles');
      } else {
        toast({
          title: '登录失败',
          description: data.message || '口令错误',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: '登录失败',
        description: '网络错误，请重试',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      w="full"
      align="center"
      justify="center"
      bg={useColorModeValue('gray.50', 'gray.900')}
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(66, 153, 225, 0.1) 0%, rgba(49, 130, 206, 0.1) 100%)',
        zIndex: 0,
      }}
    >
      <Container maxW="container.sm" position="relative" zIndex={1}>
        <Box
          w="full"
          maxW="420px"
          mx="auto"
          p={8}
          borderWidth={1}
          borderRadius="2xl"
          boxShadow="2xl"
          bg={bgColor}
          borderColor={borderColor}
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            right: '-2px',
            bottom: '-2px',
            background: 'linear-gradient(135deg, #4299E1, #2B6CB0)',
            borderRadius: '2xl',
            zIndex: -1,
            opacity: 0.1,
          }}
        >
          <VStack spacing={8}>
            <VStack spacing={4} textAlign="center">
              <Heading
                size="xl"
                bgGradient="linear(to-r, blue.400, blue.600)"
                bgClip="text"
                fontWeight="extrabold"
                letterSpacing="tight"
              >
                Zorth WebSSH
              </Heading>
              <Text
                color="gray.500"
                fontSize="lg"
                fontWeight="medium"
              >
                请输入访问口令
              </Text>
            </VStack>
            
            <form onSubmit={handleLogin} style={{ width: '100%' }}>
              <VStack spacing={6}>
                <FormControl isRequired>
                  <FormLabel
                    fontWeight="medium"
                    fontSize="sm"
                    color="gray.600"
                    mb={2}
                  >
                    访问口令
                  </FormLabel>
                  <InputGroup size="lg">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入口令"
                      size="lg"
                      borderRadius="lg"
                      borderWidth={2}
                      _focus={{
                        borderColor: 'blue.500',
                        boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                      }}
                      _hover={{
                        borderColor: 'blue.400',
                      }}
                      transition="all 0.2s"
                    />
                    <InputRightElement width="4.5rem" h="full">
                      <IconButton
                        h="1.75rem"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        variant="ghost"
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        _hover={{
                          bg: 'transparent',
                          color: 'blue.500',
                        }}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                
                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  width="full"
                  height="3.5rem"
                  fontSize="lg"
                  fontWeight="semibold"
                  isLoading={loading}
                  loadingText="登录中..."
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg',
                  }}
                  _active={{
                    transform: 'translateY(0)',
                  }}
                  transition="all 0.2s"
                >
                  登录
                </Button>
              </VStack>
            </form>
          </VStack>
        </Box>
      </Container>
    </Flex>
  );
} 