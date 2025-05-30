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
  Icon,
  SimpleGrid,
  Input,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
  Avatar,
  Tooltip,
  IconButton,
  CardHeader,
} from '@chakra-ui/react';
import { FiTerminal, FiFolder, FiSearch, FiEdit, FiTrash2, FiServer } from 'react-icons/fi';
import { SFTPFileBrowser } from '@/components/SFTPFileBrowser';
import { sftpService } from '@/services/sftpService';
import { SFTPConnectionData } from '@/types/sftp';

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
  const [selectedProfile, setSelectedProfile] = useState<SSHProfile | null>(null);
  const [showSFTPBrowser, setShowSFTPBrowser] = useState(false);
  const [sftpInitialData, setSftpInitialData] = useState<SFTPConnectionData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const toast = useToast();

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardHoverBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    // 检查是否已登录
    const authenticated = localStorage.getItem('authenticated');
    if (!authenticated) {
      router.push('/login');
      return;
    }

    fetchProfiles();
  }, [router]);

  // Filter profiles based on search term
  const filteredProfiles = profiles.filter(profile =>
    profile.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchProfiles = async () => {
    try {
      const response = await fetch('http://localhost:12305/api/profiles');
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

  const handleSFTPConnect = async (profile: SSHProfile) => {
    try {
      // Show loading toast
      const loadingToast = toast({
        title: '正在连接SFTP...',
        description: `连接到 ${profile.nickname}`,
        status: 'loading',
        duration: null,
        isClosable: false,
      });

      // Connect to SFTP and get initial data
      const data = await sftpService.connectAndBrowse(profile.id);
      
      // Close loading toast
      toast.close(loadingToast);
      
      // Set profile and initial data
      setSelectedProfile(profile);
      setSftpInitialData(data);
      setShowSFTPBrowser(true);
      
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
    }
  };

  const handleEdit = (profileId: number) => {
    router.push(`/profiles/${profileId}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个SSH配置吗？')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:12305/api/profiles/${id}`, {
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

  // Generate avatar color based on profile name
  const getAvatarBg = (nickname: string) => {
    const colors = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink'];
    const index = nickname.length % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <Box p={8} maxW="1400px" mx="auto">
        <Text>加载中...</Text>
      </Box>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <Flex mb={8} align="center">
        <Heading color="blue.600">Zorth WebSSH</Heading>
        <Spacer />
        <HStack spacing={4}>
          <Button
            colorScheme="blue"
            size="lg"
            onClick={() => router.push('/profiles/new')}
          >
            新建配置
          </Button>
          <Button variant="outline" size="lg" onClick={handleLogout}>
            退出登录
          </Button>
        </HStack>
      </Flex>

      {profiles.length === 0 ? (
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={6} py={12}>
              <Icon as={FiServer} boxSize={16} color="gray.400" />
              <Text color="gray.500" fontSize="xl" fontWeight="medium">
                还没有SSH配置
              </Text>
              <Text color="gray.400" textAlign="center">
                创建您的第一个SSH配置，开始远程服务器管理之旅
              </Text>
              <Button
                colorScheme="blue"
                size="lg"
                onClick={() => router.push('/profiles/new')}
              >
                创建第一个配置
              </Button>
            </VStack>
          </CardBody>
        </Card>
      ) : (
        <VStack spacing={6} align="stretch">
          {/* Search Bar */}
          <InputGroup size="lg" maxW="400px">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="搜索配置..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg={cardBg}
              borderColor={borderColor}
            />
          </InputGroup>

          {/* Profile Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filteredProfiles.map((profile) => (
              <Card
                key={profile.id}
                bg={cardBg}
                borderColor={borderColor}
                borderWidth="1px"
                transition="all 0.2s"
                cursor="pointer"
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'lg',
                  bg: cardHoverBg,
                }}
              >
                <CardHeader pb={2}>
                  <Flex align="center" justify="space-between">
                    <HStack spacing={3}>
                      <Avatar
                        size="sm"
                        name={profile.nickname}
                        bg={`${getAvatarBg(profile.nickname)}.500`}
                        color="white"
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="lg" noOfLines={1}>
                          {profile.nickname}
                        </Text>
                        <Badge
                          colorScheme={profile.authType === 'PASSWORD' ? 'blue' : 'green'}
                          size="sm"
                        >
                          {profile.authType === 'PASSWORD' ? '密码' : '密钥'}
                        </Badge>
                      </VStack>
                    </HStack>
                    <HStack spacing={1}>
                      <Tooltip label="编辑配置">
                        <IconButton
                          icon={<FiEdit />}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(profile.id)}
                          aria-label="编辑配置"
                        />
                      </Tooltip>
                      <Tooltip label="删除配置">
                        <IconButton
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(profile.id)}
                          aria-label="删除配置"
                        />
                      </Tooltip>
                    </HStack>
                  </Flex>
                </CardHeader>
                <CardBody pt={2}>
                  <VStack align="start" spacing={3}>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        连接地址
                      </Text>
                      <Text fontWeight="medium" noOfLines={1}>
                        {profile.username}@{profile.host}:{profile.port}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        创建时间
                      </Text>
                      <Text fontSize="sm">
                        {new Date(profile.createdAt).toLocaleDateString()}
                      </Text>
                    </Box>

                    <HStack spacing={2} width="100%">
                      <Button
                        size="sm"
                        colorScheme="green"
                        leftIcon={<Icon as={FiTerminal} />}
                        onClick={() => handleConnect(profile.id, profile.nickname)}
                        flex={1}
                      >
                        SSH
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<Icon as={FiFolder} />}
                        onClick={() => handleSFTPConnect(profile)}
                        flex={1}
                      >
                        SFTP
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {filteredProfiles.length === 0 && searchTerm && (
            <Card bg={cardBg} borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4} py={8}>
                  <Icon as={FiSearch} boxSize={12} color="gray.400" />
                  <Text color="gray.500" fontSize="lg">
                    没有找到匹配的配置
                  </Text>
                  <Text color="gray.400" textAlign="center">
                    尝试使用不同的关键词搜索
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      )}

      {/* SFTP File Browser Modal */}
      {selectedProfile && (
        <SFTPFileBrowser
          isOpen={showSFTPBrowser}
          onClose={() => {
            setShowSFTPBrowser(false);
            setSelectedProfile(null);
            setSftpInitialData(undefined);
          }}
          profile={selectedProfile}
          initialData={sftpInitialData}
        />
      )}
    </Box>
  );
} 