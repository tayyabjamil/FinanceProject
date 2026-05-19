import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack } from 'tamagui';

import { getSession } from '@/lib/session';

export default function SessionCheckScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const session = await getSession();
      if (cancelled) return;

      if (!session.isLoggedIn) {
        router.replace('/(auth)/login');
        return;
      }

      if (!session.hasOnboarded) {
        router.replace('/(onboarding)');
        return;
      }

      router.replace('/(tabs)/dashboard');
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
      <ActivityIndicator />
    </YStack>
  );
}

