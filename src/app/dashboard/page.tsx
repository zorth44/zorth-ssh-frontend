'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Heading,
  Text,
  useDisclosure,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { SSHProfile } from '../../types';
import { sshProfileService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Layout } from '../../components/Layout';
import Link from 'next/link';

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<SSHProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    // Don't redirect if still loading auth state
    if (authLoading) {
      return;
    }
    
    if (!user) {
      router.push('/login');
      return;
    }

    loadProfiles();
  }, [user, authLoading, router]);

  const loadProfiles = async () => {
    try {
      const data = await sshProfileService.getAll();
      setProfiles(data);
    } catch (error) {
      toast({
        title: 'Error loading profiles',
        description: 'Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await sshProfileService.delete(id);
      setProfiles(profiles.filter(profile => profile.id !== id));
      toast({
        title: 'Profile deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error deleting profile',
        description: 'Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <Text>Loading...</Text>
      </Layout>
    );
  }

  return (
    <Layout>
      <VStack spacing={8} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">SSH Profiles</Heading>
          <Link href="/profiles/new" passHref>
            <Button colorScheme="blue">New Profile</Button>
          </Link>
        </Box>

        {profiles.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text fontSize="lg" color="gray.500">
              No SSH profiles found. Create your first profile to get started.
            </Text>
          </Box>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
            {profiles.map((profile) => (
              <Box
                key={profile.id}
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                bg="white"
                shadow="sm"
              >
                <VStack align="stretch" spacing={4}>
                  <Heading size="md">{profile.nickname}</Heading>
                  <Text>
                    <strong>Host:</strong> {profile.host}
                  </Text>
                  <Text>
                    <strong>Port:</strong> {profile.port}
                  </Text>
                  <Text>
                    <strong>Username:</strong> {profile.username}
                  </Text>
                  <Text>
                    <strong>Auth Type:</strong> {profile.authType}
                  </Text>
                  <Box display="flex" gap={2}>
                    <Link href={`/terminal/${profile.id}`} passHref>
                      <Button colorScheme="green" flex={1}>
                        Connect
                      </Button>
                    </Link>
                    <Link href={`/profiles/${profile.id}`} passHref>
                      <Button variant="outline" flex={1}>
                        Edit
                      </Button>
                    </Link>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      onClick={() => handleDelete(profile.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </VStack>
              </Box>
            ))}
          </Grid>
        )}
      </VStack>
    </Layout>
  );
} 