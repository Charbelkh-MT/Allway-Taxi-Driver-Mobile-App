import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

const CREDS_KEY   = 'allway_biometric_creds';
const ENABLED_KEY = 'allway_biometric_enabled';

export async function isBiometricAvailable() {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;

    // Face ID requires NSFaceIDUsageDescription in the app's own Info.plist.
    // Expo Go uses its own plist which can't include this key, so Face ID always
    // fails there. Fingerprint (Touch ID / Android) works fine in Expo Go.
    if (IS_EXPO_GO && Platform.OS === 'ios') {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Returns 'face' on Face ID devices, 'fingerprint' on all others.
export async function getBiometricType() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    return 'fingerprint';
  } catch {
    return 'fingerprint';
  }
}

export async function isBiometricEnabled() {
  try {
    const val = await AsyncStorage.getItem(ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function enableBiometric(phone, pin) {
  await SecureStore.setItemAsync(CREDS_KEY, JSON.stringify({ phone, pin }));
  await AsyncStorage.setItem(ENABLED_KEY, 'true');
}

export async function disableBiometric() {
  try { await SecureStore.deleteItemAsync(CREDS_KEY); } catch {}
  await AsyncStorage.removeItem(ENABLED_KEY);
}

export async function getBiometricCredentials() {
  try {
    const raw = await SecureStore.getItemAsync(CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Returns the full result object so callers can distinguish cancel vs failure.
// result.success === true  → authenticated
// result.error === 'user_cancel' or 'system_cancel' → user pressed Cancel, no error
// anything else with success === false → actual failure (face not recognised, lockout, etc.)
export async function authenticateWithBiometric(promptMessage) {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:         promptMessage ?? 'Confirm your identity',
      disableDeviceFallback: true,
      cancelLabel:           'Cancel',
    });
    return result;
  } catch (e) {
    return { success: false, error: 'unknown', warning: e?.message };
  }
}
