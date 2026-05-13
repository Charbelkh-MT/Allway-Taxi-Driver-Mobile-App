// Background GPS task — must be imported in App.js before the app tree renders so
// TaskManager.defineTask runs at module level and the OS can wake the task while the
// app is backgrounded or suspended.
//
// Background location does NOT work in Expo Go — requires a Development or EAS Build.

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { TABLE_LOCATIONS, TABLE_DRIVERS, DRIVER_COLS } from '../config';

export const LOCATION_TASK_NAME = 'allway-background-location';

let bgTick = 0;

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[GPS Task] Error:', error.message);
    return;
  }
  if (!data?.locations?.length) return;

  const loc = data.locations[0];
  const { latitude: lat, longitude: lng } = loc.coords;
  const heading = loc.coords.heading ?? 0;
  const speed   = Math.max(0, loc.coords.speed ?? 0);
  const now     = new Date().toISOString();
  bgTick++;

  console.log(`[GPS] lat=${lat.toFixed(6)}  lng=${lng.toFixed(6)}  heading=${heading.toFixed(1)}°  speed=${speed.toFixed(1)}m/s`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const ops = [
    supabase.from(TABLE_LOCATIONS).upsert(
      { driver_id: user.id, lat, lng, heading, speed, is_online: true, updated_at: now },
      { onConflict: 'driver_id' }
    ),
  ];

  // Mirror the foreground watcher: update drivers every 30 ticks (~60s) to keep CRM map current
  if (bgTick % 15 === 0) {
    ops.push(
      supabase.from(TABLE_DRIVERS)
        .update({ lat, lng, last_seen: now, heading, speed })
        .eq(DRIVER_COLS.id, user.id)
    );
  }

  await Promise.all(ops);
});

export async function startLocationTracking() {
  // Foreground permission is required before background can be requested
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') {
    console.warn('[GPS] Foreground location permission denied');
    return false;
  }

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') {
    console.warn('[GPS] Background location permission denied — tracking only while app is open');
    return 'foreground-only';
  }

  const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (isTracking) return true;

  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy:                         Location.Accuracy.High,
      timeInterval:                     2000,
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
    // expo-task-manager isn't available in Expo Go — caller falls back to foreground tracking
    console.log('[GPS] Background task unavailable, using foreground fallback:', e.message);
    return false;
  }
}

export async function stopLocationTracking() {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    // Mark driver offline so the CRM map reflects the correct status
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
