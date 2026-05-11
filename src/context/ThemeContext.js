import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let NavigationBar = null;
try { NavigationBar = require('expo-navigation-bar'); } catch {}

const ACCENTS = {
  yellow:      '#F5B800',
  yellowDark:  '#E6A800',
  yellowFaint: 'rgba(245,184,0,0.12)',
  green:       '#5DCAA5',
  greenFaint:  'rgba(93,202,165,0.12)',
  red:         '#F09595',
  redFaint:    'rgba(240,149,149,0.1)',
};

const DARK = {
  ...ACCENTS,
  bg:           '#000000',
  bgCard:       'rgba(255,255,255,0.08)',
  bgCardStrong: 'rgba(255,255,255,0.13)',
  bgSheet:      '#16161E',
  textPrimary:  '#FFFFFF',
  textSecondary:'rgba(255,255,255,0.6)',
  textMuted:    'rgba(255,255,255,0.38)',
  textDisabled: 'rgba(255,255,255,0.2)',
  border:       'rgba(255,255,255,0.1)',
  borderStrong: 'rgba(255,255,255,0.18)',
  appBar:       'rgba(12,10,22,0.85)',
  tabBar:       'rgba(10,10,16,0.9)',
  overlay:      'rgba(0,0,0,0.88)',
  inputBg:      'rgba(255,255,255,0.08)',
};

const LIGHT = {
  ...ACCENTS,
  bg:           '#FFFFFF',
  bgCard:       '#FFFFFF',
  bgCardStrong: '#F5F5F5',
  bgSheet:      '#FFFFFF',
  textPrimary:  '#111827',
  textSecondary:'rgba(0,0,0,0.58)',
  textMuted:    'rgba(0,0,0,0.42)',
  textDisabled: 'rgba(0,0,0,0.24)',
  border:       'rgba(0,0,0,0.07)',
  borderStrong: 'rgba(0,0,0,0.15)',
  appBar:       '#FFFFFF',
  tabBar:       '#FFFFFF',
  overlay:      'rgba(0,0,0,0.55)',
  inputBg:      '#F2F2F2',
};

const STORAGE_KEY = 'allway_theme';

function applyNavBar(dark) {
  if (Platform.OS !== 'android' || !NavigationBar) return;
  try {
    // Edge-to-edge mode: nav bar is transparent, app background shows through.
    // Only button style is needed — icons turn white in dark mode, dark in light mode.
    NavigationBar.setButtonStyleAsync(dark ? 'light' : 'dark');
  } catch {}
}

const ThemeContext = createContext({ colors: LIGHT, isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      setIsDark(val === 'dark');
    });
  }, []);

  // Apply nav bar after React commits the new isDark value
  useEffect(() => {
    applyNavBar(isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isDark, colors: isDark ? DARK : LIGHT, toggleTheme }),
    [isDark, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
