// Background GPS task — must be imported in App.js before the app tree renders.
// TaskManager.defineTask runs at module level so the OS can wake this task
// even when the app is backgrounded or suspended.
//
// NOTE: Background location does NOT work in Expo Go.
// You must use a Development Build or Production Build (EAS Build).

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { TABLE_LOCATIONS } from '../config';

export const LOCATION_TASK_NAME = 'allway-background-location';

// ─── Task Definition (module-level, required by TaskManager) ─────────────────
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[GPS Task] Error:', error.message);
    return;
  }
  if (!data?.locations?.length) return;

  const loc = data.locations[0];

  // Get the currently authenticated driver — safe to call in background context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from(TABLE_LOCATIONS).upsert(
    {
      driver_id:  user.id,
      lat:        loc.coords.latitude,
      lng:        loc.coords.longitude,
      heading:    loc.coords.heading  ?? 0,
      speed:      loc.coords.speed    ?? 0,
      is_online:  true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'driver_id' }
  );
});

// ─── Start tracking (call when driver goes online) ────────────────────────────
export async function startLocationTracking() {
  // Request foreground permission first (required before background)
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') {
    console.warn('[GPS] Foreground location permission denied');
    return false;
  }

  // Request background permission (shows system dialog on iOS/Android)
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') {
    console.warn('[GPS] Background location permission denied — tracking only while app is open');
    // Still track in foreground with a simpler interval-based approach
    return 'foreground-only';
  }

  const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (isTracking) return true;

  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy:                         Location.Accuracy.High,
      timeInterval:                     5000,
      distanceInterval:                 0,
      pausesUpdatesAutomatically:       false,
      showsBackgroundLocationIndicator: true,
      ...(Platform.OS === 'android' && {
        foregroundService: {
          notificationTitle: 'Allway Driver — Online',
          notificationBody:  'Location tracking active. Tap to open.',
          notificationColor: '#F5B800',
        },
      }),
    });
    console.log('[GPS] Background tracking started');
    return true;
  } catch (e) {
    // expo-task-manager is not available in Expo Go — caller will use foreground fallback
    console.log('[GPS] Background task unavailable, using foreground fallback:', e.message);
    return false;
  }
}

// ─── Stop tracking (call when driver goes offline) ────────────────────────────
export async function stopLocationTracking() {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    // Mark driver as offline in Supabase so CRM map shows correct status
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from(TABLE_LOCATIONS).upsert(
        {
          driver_id:  user.id,
          is_online:  false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'driver_id' }
      );
    }
    console.log('[GPS] Tracking stopped');
  } catch (e) {
    console.warn('[GPS] Stop error:', e.message);
  }
}
