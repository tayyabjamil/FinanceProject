import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { TamaguiProvider, Theme } from 'tamagui';

import tamaguiConfig from '../tamagui.config';
import { initSupabase } from '../lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

const NavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0D0E12',
    card: '#0D0E12',
    border: '#272B34',
    text: '#FFFFFF',
  },
};

export default function RootLayout() {
  useEffect(() => {
    // Migrate any existing AsyncStorage session to SecureStore (runs once).
    initSupabase();
  }, []);

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <Theme name="dark">
        <ThemeProvider value={NavTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-transaction"
              options={{
                presentation: 'modal',
                title: 'Add Transaction',
                headerStyle: { backgroundColor: '#16191F' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </Theme>
    </TamaguiProvider>
  );
}
