import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { SSHProfile } from '../types';
import { sshProfileService } from '../services/api';
import { useRouter } from 'next/navigation';

interface ProfileFormProps {
  profile?: SSHProfile;
  mode: 'create' | 'edit';
}

export function ProfileForm({ profile, mode }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    nickname: '',
    host: '',
    port: '22',
    username: '',
    authType: 'PASSWORD' as 'PASSWORD' | 'KEY',
    password: '',
    privateKey: '',
    keyPassphrase: '',
  });

  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        nickname: profile.nickname,
        host: profile.host,
        port: profile.port.toString(),
        username: profile.username,
        authType: profile.authType,
        password: '',
        privateKey: '',
        keyPassphrase: '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        nickname: formData.nickname,
        host: formData.host,
        port: parseInt(formData.port),
        username: formData.username,
        authType: formData.authType,
        ...(formData.authType === 'PASSWORD'
          ? { password: formData.password }
          : {
              privateKey: formData.privateKey,
              keyPassphrase: formData.keyPassphrase,
            }),
      };

      if (mode === 'create') {
        await sshProfileService.create(data);
        toast({
          title: 'Profile created',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        await sshProfileService.update(profile!.id, data);
        toast({
          title: 'Profile updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      router.push('/dashboard');
    } catch (error) {
      toast({
        title: `Error ${mode === 'create' ? 'creating' : 'updating'} profile`,
        description: 'Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={4}>
        <FormControl isRequired>
          <FormLabel>Nickname</FormLabel>
          <Input
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Host</FormLabel>
          <Input
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Port</FormLabel>
          <Input
            type="number"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: e.target.value })}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Username</FormLabel>
          <Input
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Authentication Type</FormLabel>
          <Select
            value={formData.authType}
            onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'PASSWORD' | 'KEY' })}
          >
            <option value="PASSWORD">Password</option>
            <option value="KEY">SSH Key</option>
          </Select>
        </FormControl>

        {formData.authType === 'PASSWORD' ? (
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </FormControl>
        ) : (
          <>
            <FormControl isRequired>
              <FormLabel>Private Key</FormLabel>
              <Input
                as="textarea"
                rows={4}
                value={formData.privateKey}
                onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Key Passphrase (Optional)</FormLabel>
              <Input
                type="password"
                value={formData.keyPassphrase}
                onChange={(e) => setFormData({ ...formData, keyPassphrase: e.target.value })}
              />
            </FormControl>
          </>
        )}

        <Button
          type="submit"
          colorScheme="blue"
          width="100%"
          isLoading={loading}
        >
          {mode === 'create' ? 'Create Profile' : 'Update Profile'}
        </Button>
      </VStack>
    </Box>
  );
} 