'use client';

import { useState } from 'react';
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
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { sshProfileService } from '../../../services/api';
import { SSHProfile } from '../../../types';
import { AuthenticatedLayout } from '../../../components/AuthenticatedLayout';
import Link from 'next/link';

export default function NewProfilePage() {
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
  const router = useRouter();
  const toast = useToast();

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
      const profileData: Omit<SSHProfile, 'id' | 'createdAt' | 'updatedAt'> = {
        nickname: formData.nickname,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        authType: formData.authType,
        encryptedPassword: formData.authType === 'PASSWORD' ? formData.encryptedPassword : undefined,
        encryptedPrivateKey: formData.authType === 'KEY' ? formData.encryptedPrivateKey : undefined,
        keyPassphraseEncrypted: formData.authType === 'KEY' ? formData.keyPassphraseEncrypted : undefined,
      };

      await sshProfileService.create(profileData);
      
      toast({
        title: 'Profile created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      router.push('/profiles');
    } catch (error) {
      console.error('Failed to create profile:', error);
      toast({
        title: 'Failed to create profile',
        description: 'Please check your input and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Container maxW="md" py={10}>
        <VStack spacing={8}>
          <Heading>Create New SSH Profile</Heading>
          
          <Box w="100%" as="form" onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nickname</FormLabel>
                <Input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="My Server"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Host</FormLabel>
                <Input
                  type="text"
                  value={formData.host}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  placeholder="192.168.1.100 or example.com"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Port</FormLabel>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 22)}
                  placeholder="22"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="root"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Authentication Type</FormLabel>
                <Select
                  value={formData.authType}
                  onChange={(e) => handleInputChange('authType', e.target.value)}
                >
                  <option value="PASSWORD">Password</option>
                  <option value="KEY">SSH Key</option>
                </Select>
              </FormControl>

              {formData.authType === 'PASSWORD' && (
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={formData.encryptedPassword}
                    onChange={(e) => handleInputChange('encryptedPassword', e.target.value)}
                    placeholder="Enter password"
                  />
                </FormControl>
              )}

              {formData.authType === 'KEY' && (
                <>
                  <FormControl isRequired>
                    <FormLabel>Private Key</FormLabel>
                    <Textarea
                      value={formData.encryptedPrivateKey}
                      onChange={(e) => handleInputChange('encryptedPrivateKey', e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                      rows={8}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Key Passphrase (if any)</FormLabel>
                    <Input
                      type="password"
                      value={formData.keyPassphraseEncrypted}
                      onChange={(e) => handleInputChange('keyPassphraseEncrypted', e.target.value)}
                      placeholder="Enter passphrase if key is encrypted"
                    />
                  </FormControl>
                </>
              )}

              <HStack spacing={4} w="100%">
                <Link href="/dashboard" passHref style={{ flex: 1 }}>
                  <Button variant="outline" w="100%">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={loading}
                  flex={1}
                >
                  Create Profile
                </Button>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </AuthenticatedLayout>
  );
} 