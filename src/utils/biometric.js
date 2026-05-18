import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDS_KEY   = 'allway_biometric_creds';
const ENABLED_KEY = 'allway_biometric_enabled';

export async function isBiometricAvailable() {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
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

// Returns true if the user passed biometric authentication, false otherwise.
export async function authenticateWithBiometric(promptMessage = 'Use fingerprint to sign in') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel:         'Use PIN instead',
      disableDeviceFallback: false,
      cancelLabel:           'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}
