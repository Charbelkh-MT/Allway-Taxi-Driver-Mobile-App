import 'react-native-url-polyfill/auto';
import './src/utils/locationTask';
import 'react-native-gesture-handler';

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DriverProvider, useDriver } from './src/context/DriverContext';
import { LanguageProvider } from './src/context/LanguageContext';
import RootNavigator from './src/navigation';
import TripRequestSheet from './src/components/TripRequestSheet';
import ErrorBoundary from './src/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

function AppInner() {
  const { isDark, colors }                                          = useTheme();
  const { isAuthenticated }                                                         = useAuth();
  const { showTripSheet, pendingTrip, tripSoundEnabled, acceptTrip, closeTripSheet } = useDriver();

  const navTheme = useMemo(() => isDark
    ? { ...DarkTheme,    colors: { ...DarkTheme.colors,    background: 'transparent' } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } },
  [isDark]);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-SemiBold':  Inter_600SemiBold,
    'Inter-Bold':      Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    'Inter-Black':     Inter_900Black,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) await SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <View
      style={[styles.root, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
      onLayout={onLayoutRootView}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>

      {/* Global trip request popup — overlays any screen */}
      {isAuthenticated && showTripSheet && pendingTrip && (
        <TripRequestSheet
          trip={pendingTrip}
          withSound={tripSoundEnabled}
          onAccept={() => acceptTrip(pendingTrip)}
          onDecline={closeTripSheet}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <DriverProvider>
                  <AppInner />
                </DriverProvider>
              </AuthProvider>
            </ThemeProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1 },
});
