import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { getDefaultProfile, initDatabase } from '../src/db/database';
import { useAppStore } from '../src/store/useAppStore';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const initializeAppData = useAppStore((state) => state.initializeAppData);

  useEffect(() => {
    async function prepareApp() {
      try {
        await initDatabase();

        const profile = await getDefaultProfile();
        const inSetup = segments[0] === 'setup';

        if (!profile && !inSetup) {
          router.replace('/setup');
        }

        if (profile && inSetup) {
          router.replace('/(tabs)');
        }

        await initializeAppData();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsReady(true);
      }
    }

    prepareApp();
  }, [segments, initializeAppData]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="setup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}