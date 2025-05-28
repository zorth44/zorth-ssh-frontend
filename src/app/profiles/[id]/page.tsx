'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Select,
  Textarea,
  useToast,
  Container,
  HStack,
  Text,
} from '@chakra-ui/react';
import { useRouter, useParams } from 'next/navigation';
import { sshProfileService } from '../../../services/api';
import { SSHProfile } from '../../../types';
import { AuthenticatedLayout } from '../../../components/AuthenticatedLayout';

export default function EditProfilePage() {
  const [formData, setFormData] = useState({
    nickname: '',
    host: '',
    port: 22,
    username: '',
    authType: 'PASSWORD' as 'PASSWORD' | 'KEY',
    encryptedPassword: '',
    encryptedPrivateKey: '',
    keyPassphraseEncrypted: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const profileId = params.id as string;

  useEffect(() => {
    // 检查是否已登录
    const authenticated = localStorage.getItem('authenticated');
    if (!authenticated) {
      router.push('/login');
      return;
    }

    if (profileId) {
      loadProfile();
    }
  }, [profileId, router]);

  const loadProfile = async () => {
    try {
      const profile = await sshProfileService.getById(parseInt(profileId));
      setFormData({
        nickname: profile.nickname,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        authType: profile.authType,
        encryptedPassword: profile.encryptedPassword || '',
        encryptedPrivateKey: profile.encryptedPrivateKey || '',
        keyPassphraseEncrypted: profile.keyPassphraseEncrypted || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast({
        title: '加载失败',
        description: '无法加载SSH配置信息',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.push('/profiles');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const profileData: Partial<SSHProfile> = {
        nickname: formData.nickname,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        authType: formData.authType,
        encryptedPassword: formData.authType === 'PASSWORD' ? formData.encryptedPassword : undefined,
        encryptedPrivateKey: formData.authType === 'KEY' ? formData.encryptedPrivateKey : undefined,
        keyPassphraseEncrypted: formData.authType === 'KEY' ? formData.keyPassphraseEncrypted : undefined,
      };

      await sshProfileService.update(parseInt(profileId), profileData);
      
      toast({
        title: '更新成功',
        description: 'SSH配置已更新',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      router.push('/profiles');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: '更新失败',
        description: '请检查输入信息后重试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <AuthenticatedLayout>
        <Container maxW="md" py={10}>
          <Text>加载中...</Text>
        </Container>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Container maxW="md" py={10}>
        <VStack spacing={8}>
          <Heading>编辑 SSH 配置</Heading>
          
          <Box w="100%" as="form" onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>配置名称</FormLabel>
                <Input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="我的服务器"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>主机地址</FormLabel>
                <Input
                  type="text"
                  value={formData.host}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  placeholder="192.168.1.100 或 example.com"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>端口</FormLabel>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 22)}
                  placeholder="22"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>用户名</FormLabel>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="root"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>认证方式</FormLabel>
                <Select
                  value={formData.authType}
                  onChange={(e) => handleInputChange('authType', e.target.value)}
                >
                  <option value="PASSWORD">密码认证</option>
                  <option value="KEY">密钥认证</option>
                </Select>
              </FormControl>

              {formData.authType === 'PASSWORD' && (
                <FormControl>
                  <FormLabel>密码</FormLabel>
                  <Input
                    type="password"
                    value={formData.encryptedPassword}
                    onChange={(e) => handleInputChange('encryptedPassword', e.target.value)}
                    placeholder="输入新密码（留空则保持原密码）"
                  />
                </FormControl>
              )}

              {formData.authType === 'KEY' && (
                <>
                  <FormControl isRequired>
                    <FormLabel>私钥</FormLabel>
                    <Textarea
                      value={formData.encryptedPrivateKey}
                      onChange={(e) => handleInputChange('encryptedPrivateKey', e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                      rows={8}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>密钥密码（如果有）</FormLabel>
                    <Input
                      type="password"
                      value={formData.keyPassphraseEncrypted}
                      onChange={(e) => handleInputChange('keyPassphraseEncrypted', e.target.value)}
                      placeholder="如果密钥有密码保护，请输入密码"
                    />
                  </FormControl>
                </>
              )}

              <HStack spacing={4} w="100%">
                <Button
                  variant="outline"
                  w="100%"
                  onClick={() => router.push('/profiles')}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={loading}
                  w="100%"
                >
                  保存更改
                </Button>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </AuthenticatedLayout>
  );
} 