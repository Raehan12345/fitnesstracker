import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';
import { getDefaultProfile, initDatabase } from '../src/db/database';
import { useAppStore } from '../src/store/useAppStore';

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

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
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '800',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.background,
        },
      }}
    >
      <Stack.Screen name="setup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}