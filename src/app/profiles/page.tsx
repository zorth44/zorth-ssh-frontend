'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  useToast,
  Badge,
  Flex,
  Spacer,
} from '@chakra-ui/react';

interface SSHProfile {
  id: number;
  nickname: string;
  host: string;
  port: number;
  username: string;
  authType: 'PASSWORD' | 'KEY';
  createdAt: string;
  updatedAt: string;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<SSHProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    // 检查是否已登录
    const authenticated = localStorage.getItem('authenticated');
    if (!authenticated) {
      router.push('/login');
      return;
    }

    fetchProfiles();
  }, [router]);

  const fetchProfiles = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      } else {
        toast({
          title: '获取配置失败',
          description: '无法获取SSH配置列表',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: '网络错误',
        description: '无法连接到服务器',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (profileId: number, nickname: string) => {
    // 跳转到终端页面，并传递profile ID
    router.push(`/terminal?profileId=${profileId}&nickname=${encodeURIComponent(nickname)}`);
  };

  const handleEdit = (profileId: number) => {
    router.push(`/profiles/${profileId}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个SSH配置吗？')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/profiles/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: '删除成功',
          description: 'SSH配置已删除',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchProfiles(); // 重新获取列表
      } else {
        toast({
          title: '删除失败',
          description: '无法删除SSH配置',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: '网络错误',
        description: '无法连接到服务器',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    router.push('/login');
  };

  if (loading) {
    return (
      <Box p={8} maxW="1200px" mx="auto">
        <Text>加载中...</Text>
      </Box>
    );
  }

  return (
    <Box p={8} maxW="1200px" mx="auto">
      <Flex mb={6} align="center">
        <Heading>Zorth WebSSH</Heading>
        <Spacer />
        <HStack spacing={4}>
          <Button
            colorScheme="blue"
            onClick={() => router.push('/profiles/new')}
          >
            新建配置
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            退出登录
          </Button>
        </HStack>
      </Flex>

      {profiles.length === 0 ? (
        <Card>
          <CardBody>
            <VStack spacing={4} py={8}>
              <Text color="gray.500" fontSize="lg">
                还没有SSH配置
              </Text>
              <Button
                colorScheme="blue"
                onClick={() => router.push('/profiles/new')}
              >
                创建第一个配置
              </Button>
            </VStack>
          </CardBody>
        </Card>
      ) : (
        <VStack spacing={4} align="stretch">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardBody>
                <Flex align="center">
                  <VStack align="start" spacing={2} flex={1}>
                    <HStack>
                      <Heading size="md">{profile.nickname}</Heading>
                      <Badge colorScheme={profile.authType === 'PASSWORD' ? 'blue' : 'green'}>
                        {profile.authType === 'PASSWORD' ? '密码认证' : '密钥认证'}
                      </Badge>
                    </HStack>
                    <Text color="gray.600">
                      {profile.username}@{profile.host}:{profile.port}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      创建时间: {new Date(profile.createdAt).toLocaleString()}
                    </Text>
                  </VStack>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => handleConnect(profile.id, profile.nickname)}
                    >
                      连接
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => handleEdit(profile.id)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => handleDelete(profile.id)}
                    >
                      删除
                    </Button>
                  </HStack>
                </Flex>
              </CardBody>
            </Card>
          ))}
        </VStack>
      )}
    </Box>
  );
} 