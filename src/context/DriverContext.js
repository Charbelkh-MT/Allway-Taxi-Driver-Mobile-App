import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';
import { startLocationTracking, stopLocationTracking, LOCATION_TASK_NAME } from '../utils/locationTask';
import { TABLE_SHIFTS, TABLE_LOCATIONS, TABLE_TRIPS, TABLE_DRIVERS, TRIP_COLS, DRIVER_COLS } from '../config';
import { useAuth } from './AuthContext';
import { sendTripNotification } from '../utils/notifications';
import { formatTime } from '../utils/dateUtils';

// In Expo Go, background location tasks crash — use foreground-only tracking
const IS_EXPO_GO = Constants.appOwnership === 'expo';

const SHIFT_STORAGE_KEY       = 'allway_active_shift';
const ACTIVE_TRIP_STORAGE_KEY = 'allway_active_trip';

export const DRIVER_STATE = {
  OFFLINE:  'offline',
  SCANNING: 'scanning',
  TRIPS:    'trips',
  ACTIVE:   'active',
};

// Max radius (km) within which a driver receives a trip request
const MAX_DISPATCH_RANGE_KM = 10;

const DriverContext = createContext(null);

export const DEMO_TRIP = {
  id:              'trip_001',
  customer:        'Ahmad K.',
  customerFull:    'Ahmad Khoury',
  phone:           '+961 71 234 567',
  pickup:          'Hamra, Beirut',
  dropoff:         'ABC Mall, Dbayeh',
  fare:            '$22',
  fareNum:         22,
  dist:            '14 km',
  pickupLat:       null,
  pickupLng:       null,
  rideType:        'comfort',
  isPreferred:     false,
  allowDebt:       false,
};

export const DEMO_AVAILABLE_TRIPS = [
  { ...DEMO_TRIP },
  {
    id:           'trip_002',
    customer:     'Sara R.',
    customerFull: 'Sara Rizk',
    phone:        '+961 70 987 654',
    pickup:       'Verdun, Beirut',
    dropoff:      'AUB Medical Center',
    fare:         '$12',
    dist:         '4.2 km',
    pickupLat:    null,
    pickupLng:    null,
  },
];

// Haversine distance between two lat/lng points in kilometres
function haversineKm(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeTrip(row) {
  const name    = row[TRIP_COLS.customerName] ?? 'Customer';
  const first   = name.split(' ')[0];
  const fareNum = row[TRIP_COLS.fare] != null ? Number(row[TRIP_COLS.fare]) : 0;
  const fare    = fareNum > 0 ? `$${fareNum.toFixed(0)}` : '$0';
  const dist    = row[TRIP_COLS.distanceKm] != null ? `${Number(row[TRIP_COLS.distanceKm]).toFixed(1)} km` : '';
  return {
    id:                row[TRIP_COLS.id] ?? row.id,
    customer:          `${first}.`,
    customerFull:      name,
    phone:             row[TRIP_COLS.customerPhone]   ?? '',
    pickup:            row[TRIP_COLS.pickupAddress]   ?? '',
    dropoff:           row[TRIP_COLS.dropoffAddress]  ?? '',
    pickupLat:         row[TRIP_COLS.pickupLat]       ?? null,
    pickupLng:         row[TRIP_COLS.pickupLng]       ?? null,
    fare,
    fareNum,
    dist,
    allowDebt:          row[TRIP_COLS.allowDebt] === true,
    rideType:           row[TRIP_COLS.rideType]          ?? 'comfort',
    preferredDriverId:  row[TRIP_COLS.preferredDriverId] ?? null,
    isPreferred:        false,
    passengerCount:     Number(row[TRIP_COLS.passengerCount]) || 1,
    dispatchTimeoutAt:  row[TRIP_COLS.dispatchTimeoutAt]  ?? null,
    createdAt:          row[TRIP_COLS.createdAt]           ?? null,
  };
}

function markPreferred(trips, userId) {
  if (!userId) return trips;
  return trips.map(t => ({ ...t, isPreferred: t.preferredDriverId === userId }));
}

// ─── Foreground location watcher (Expo Go fallback) ───────────────────────────
// Uses watchPositionAsync so the OS delivers locations on a reliable 2s cadence.
// This avoids the blocking delay of getCurrentPositionAsync + setInterval, which
// caused effective send rates of 3-4s in practice.
let locationSubscription = null;

async function startForegroundTracking(cachedUserId) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') { console.warn('[GPS] Permission denied'); return; }
  if (locationSubscription) return;

  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy:         Location.Accuracy.High,
      timeInterval:     2000, // minimum ms between updates
      distanceInterval: 0,    // fire even when stationary so dashboard stays live
    },
    async (location) => {
      if (!locationSubscription) return;
      try {
        const { latitude: lat, longitude: lng } = location.coords;
        const heading = location.coords.heading ?? 0;
        const speed   = Math.max(0, location.coords.speed ?? 0);
        const now     = new Date().toISOString();

        console.log(`[GPS] lat=${lat.toFixed(6)}  lng=${lng.toFixed(6)}  heading=${heading.toFixed(1)}°  speed=${speed.toFixed(1)}m/s`);

        await Promise.all([
          supabase.from(TABLE_LOCATIONS).upsert(
            { driver_id: cachedUserId, lat, lng, heading, speed, is_online: true, updated_at: now },
            { onConflict: 'driver_id' }
          ),
          supabase.from(TABLE_DRIVERS)
            .update({ lat, lng, last_seen: now, heading, speed })
            .eq(DRIVER_COLS.id, cachedUserId),
        ]);
      } catch (e) { console.warn('[GPS] Write error:', e.message); }
    }
  );

  console.log('[GPS] Foreground watch started (2s)');
}

async function stopForegroundTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    console.log('[GPS] Foreground watch stopped');
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const now = new Date().toISOString();
      await supabase.from(TABLE_LOCATIONS).upsert(
        { driver_id: user.id, is_online: false, updated_at: now },
        { onConflict: 'driver_id' }
      );
      // Mark offline in drivers table so CRM map removes the marker
      await supabase.from(TABLE_DRIVERS)
        .update({ online: false, last_seen: now, [DRIVER_COLS.status]: 'offline' })
        .eq(DRIVER_COLS.id, user.id);
    }
  } catch (e) { console.warn('[GPS] Offline mark error:', e.message); }
}

export function DriverProvider({ children }) {
  const { driver } = useAuth();

  const [driverState, setDriverState]       = useState(DRIVER_STATE.OFFLINE);
  const [activeTrip, setActiveTrip]         = useState(null);
  const [pendingTrip, setPendingTrip]       = useState(null);
  const [showTripSheet, setShowTripSheet]   = useState(false);
  const [tripSoundEnabled, setTripSoundEnabled] = useState(false);
  const [shiftSeconds, setShiftSeconds]     = useState(0);
  const [availableTrips, setAvailableTrips] = useState([]);

  const timerRef        = useRef(null);
  const startTimeRef    = useRef(null);
  const scanTimeoutRef  = useRef(null);
  const currentShiftRef = useRef(null);
  const channelRef      = useRef(null);
  const activeTripIdRef = useRef(null);
  const carTypeRef      = useRef('comfort'); // updated on goOnline from driver profile
  const isDemoRef       = useRef(false);
  const userIdRef       = useRef(null);

  // ─── Shift timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (driverState === DRIVER_STATE.OFFLINE) {
      clearInterval(timerRef.current);
      timerRef.current     = null;
      startTimeRef.current = null;
      setShiftSeconds(0);
    } else {
      // Always restart the interval on any non-offline state transition
      // so the timer never gets stuck after completing or cancelling a trip
      clearInterval(timerRef.current);
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setShiftSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  }, [driverState]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(scanTimeoutRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // ─── Periodic cleanup: remove expired or claimed trips from availableTrips ─────
  useEffect(() => {
    if (driverState === DRIVER_STATE.OFFLINE) return;

    const cleanup = setInterval(async () => {
      // Remove trips older than 84 seconds (countdown expired)
      setAvailableTrips(prev => prev.filter(t => {
        if (!t.createdAt) return true;
        const elapsed = (Date.now() - new Date(t.createdAt).getTime()) / 1000;
        return elapsed < 84;
      }));

      // Also re-sync from DB to catch trips claimed by other drivers
      await syncPendingTrips();
    }, 8000);

    return () => clearInterval(cleanup);
  }, [driverState]);

  // ─── Restore shift + active trip on app reopen ───────────────────────────────
  useEffect(() => {
    async function restoreShiftIfActive() {
      try {
        // ── Step 1: Check for saved shift (requires GPS task to be running) ────────
        const saved = await AsyncStorage.getItem(SHIFT_STORAGE_KEY);
        if (!saved) return;

        const { userId, shiftId, startTime } = JSON.parse(saved);
        if (!userId) return;

        // Verify GPS is still active (confirms driver is still on shift)
        const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);

        // Restore refs
        userIdRef.current       = userId;
        currentShiftRef.current = shiftId ?? null;
        isDemoRef.current       = false;
        startTimeRef.current    = startTime;

        // ── Step 2: Restore active trip (independent of GPS check) ───────────────
        const savedTrip = await AsyncStorage.getItem(ACTIVE_TRIP_STORAGE_KEY);
        if (savedTrip) {
          const trip = JSON.parse(savedTrip);

          // Verify trip is still active in DB
          const { data: tripRow } = await supabase
            .from(TABLE_TRIPS)
            .select('*')
            .eq(TRIP_COLS.id, trip.id)
            .single();

          const tripStatus = tripRow?.[TRIP_COLS.status];
          const stillActive = tripStatus === 'accepted' || tripStatus === 'picked_up';

          if (stillActive) {
            const restoredTrip = { ...trip, status: tripStatus };
            activeTripIdRef.current = trip.id;
            setActiveTrip(restoredTrip);
            setDriverState(DRIVER_STATE.ACTIVE);
            subscribeToTrips(userId);
            await supabase.from(TABLE_DRIVERS)
              .update({ online: true, [DRIVER_COLS.status]: 'on_trip' })
              .eq(DRIVER_COLS.id, userId);
            // Restart GPS if it stopped
            if (!isTracking) {
              try { await startForegroundTracking(userId); } catch {}
            }
            console.log('[DriverContext] Active trip restored:', trip.id, '— status:', tripStatus);
            return;
          } else {
            // Trip ended while app was closed
            await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
          }
        }

        // ── Step 3: No active trip — restore to scanning state ────────────────────
        if (!isTracking) {
          // GPS stopped — clear shift as driver likely ended it externally
          await AsyncStorage.removeItem(SHIFT_STORAGE_KEY);
          return;
        }

        setDriverState(DRIVER_STATE.SCANNING);
        subscribeToTrips(userId);

        await supabase.from(TABLE_DRIVERS)
          .update({ online: true, [DRIVER_COLS.status]: 'available' })
          .eq(DRIVER_COLS.id, userId);

        const { data } = await supabase
          .from(TABLE_TRIPS)
          .select('*')
          .eq(TRIP_COLS.status, 'pending')
          .is(TRIP_COLS.driverId, null);
        setAvailableTrips(markPreferred((data ?? []).map(normalizeTrip), userId));

        console.log('[DriverContext] Shift restored — elapsed:', Math.floor((Date.now() - startTime) / 1000), 's');
      } catch (e) {
        console.warn('[DriverContext] Shift restore error:', e.message);
      }
    }
    restoreShiftIfActive();
  }, []);

  // ─── Notification tap handler ─────────────────────────────────────────────────
  async function handleNotificationTap(tripId) {
    try {
      const { data } = await supabase
        .from(TABLE_TRIPS)
        .select('*')
        .eq(TRIP_COLS.id, tripId)
        .single();
      if (!data || data[TRIP_COLS.status] !== 'pending') return;
      const trip       = normalizeTrip(data);
      const markedTrip = markPreferred([trip], userIdRef.current)[0];
      openTripSheet(markedTrip, false);
    } catch (e) {
      console.warn('[Notification] handleNotificationTap:', e.message);
    }
  }

  useEffect(() => {
    // Foreground / background tap
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const tripId = response.notification.request.content.data?.tripId;
      if (tripId) handleNotificationTap(tripId);
    });

    // App launched from fully closed via notification tap
    Notifications.getLastNotificationResponseAsync().then(response => {
      const tripId = response?.notification.request.content.data?.tripId;
      if (tripId) {
        // Delay to let shift restore complete first
        setTimeout(() => handleNotificationTap(tripId), 1500);
      }
    });

    return () => sub.remove();
  }, []);

  // ─── Realtime: subscribe to ALL new pending trips ─────────────────────────────
  // Uber-style: every online driver receives new trip requests.
  // The haversine check filters out trips that are too far away.
  // Re-syncs availableTrips with what's actually pending in the DB
  async function syncPendingTrips() {
    try {
      const { data } = await supabase
        .from(TABLE_TRIPS)
        .select('*')
        .eq(TRIP_COLS.status, 'pending')
        .is(TRIP_COLS.driverId, null)
        .eq(TRIP_COLS.rideType, carTypeRef.current);
      setAvailableTrips(markPreferred((data ?? []).map(normalizeTrip), userIdRef.current));
    } catch (e) { console.warn('[DriverContext] syncPendingTrips error:', e.message); }
  }

  function subscribeToTrips(userId) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`dispatch-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  TABLE_TRIPS,
        },
        async (payload) => {
          // DELETE: re-sync from DB — more reliable than relying on payload.old
          if (payload.eventType === 'DELETE') {
            await syncPendingTrips();
            return;
          }

          const row = payload.new;
          if (!row) return;

          const status   = row[TRIP_COLS.status];
          const driverId = row[TRIP_COLS.driverId];

          // UPDATE: trip status changed — re-sync to get accurate list
          if (payload.eventType === 'UPDATE') {
            if (status !== 'pending') {
              await syncPendingTrips();
            }
            return;
          }

          // INSERT: only react to new unclaimed pending trips matching driver's car type
          if (status !== 'pending' || driverId) return;
          if (row[TRIP_COLS.rideType] && row[TRIP_COLS.rideType] !== carTypeRef.current) return;

          const trip = normalizeTrip(row);

          // TODO: re-enable range filter before production
          // if (trip.pickupLat && trip.pickupLng) { ... }

          const markedTrip = markPreferred([trip], userIdRef.current)[0];
          setAvailableTrips(prev =>
            prev.find(t => t.id === markedTrip.id) ? prev : [markedTrip, ...prev]
          );
          openTripSheet(trip, true); // realtime → play in-app sound only (push notification handles external alert)
        }
      )
      .subscribe((status) => console.log('[Realtime] dispatch channel:', status));
  }

  // ─── Go online ────────────────────────────────────────────────────────────────
  async function goOnline() {
    setDriverState(DRIVER_STATE.SCANNING);

    // Get auth user first — needed for GPS caching and subscriptions
    let user = null;
    try {
      const result = await supabase.auth.getUser();
      user = result.data?.user ?? null;
    } catch (e) {
      console.warn('[DriverContext] getUser error:', e.message);
    }

    if (!user) {
      // Demo mode
      isDemoRef.current = true;
      try { await startForegroundTracking(null); } catch (e) {
        console.warn('[DriverContext] Demo GPS start error:', e.message);
      }
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        setDriverState(prev => prev === DRIVER_STATE.SCANNING ? DRIVER_STATE.TRIPS : prev);
      }, 3000);
      return;
    }

    // Cache user ID and car type for trip filtering
    userIdRef.current = user.id;
    carTypeRef.current = driver?.carType ?? 'comfort';

    // Expo Go: skip background task entirely — it crashes Expo Go
    // EAS native build: attempt background task, fall back to foreground if unavailable
    try {
      if (IS_EXPO_GO) {
        await startForegroundTracking(user.id);
      } else {
        const backgroundStarted = await startLocationTracking();
        if (backgroundStarted !== true) await startForegroundTracking(user.id);
      }
    } catch (e) {
      console.warn('[DriverContext] GPS start error:', e.message);
      try { await startForegroundTracking(user.id); } catch (e2) {
        console.warn('[DriverContext] Foreground fallback failed:', e2.message);
      }
    }

    // Real mode — subscribe first, then log shift
    isDemoRef.current = false;
    subscribeToTrips(user.id);

    // Mark driver online in CRM
    try {
      await supabase.from(TABLE_DRIVERS)
        .update({ online: true, [DRIVER_COLS.status]: 'available' })
        .eq(DRIVER_COLS.id, user.id);
    } catch (e) { console.warn('[DriverContext] online mark error:', e.message); }

    // Fetch any trips already pending before we came online — filtered by driver's car type
    try {
      const { data } = await supabase
        .from(TABLE_TRIPS)
        .select('*')
        .eq(TRIP_COLS.status, 'pending')
        .is(TRIP_COLS.driverId, null)
        .eq(TRIP_COLS.rideType, carTypeRef.current);
      setAvailableTrips(markPreferred((data ?? []).map(normalizeTrip), user.id));
    } catch (e) { console.warn('[DriverContext] fetchPending error:', e.message); }

    try {
      const { data } = await supabase
        .from(TABLE_SHIFTS)
        .insert({ driver_id: user.id, started_at: new Date().toISOString() })
        .select('id')
        .single();
      currentShiftRef.current = data?.id ?? null;
    } catch (e) {
      console.warn('[DriverContext] Shift log error:', e.message);
    }

    // Persist shift state so it can be restored if the app is fully closed
    try {
      await AsyncStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify({
        userId:    user.id,
        shiftId:   currentShiftRef.current,
        startTime: startTimeRef.current ?? Date.now(),
      }));
    } catch (e) { console.warn('[DriverContext] Shift save error:', e.message); }

  }

  // ─── Go offline ───────────────────────────────────────────────────────────────
  async function goOffline() {
    clearTimeout(scanTimeoutRef.current);
    setDriverState(DRIVER_STATE.OFFLINE);
    setActiveTrip(null);
    setShowTripSheet(false);
    setPendingTrip(null);
    setAvailableTrips([]);
    activeTripIdRef.current = null;
    userIdRef.current = null;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    stopForegroundTracking();
    stopLocationTracking();

    try {
      if (currentShiftRef.current) {
        await supabase
          .from(TABLE_SHIFTS)
          .update({ ended_at: new Date().toISOString(), duration_s: shiftSeconds })
          .eq('id', currentShiftRef.current);
        currentShiftRef.current = null;
      }
    } catch (e) { console.warn('[DriverContext] Shift end error:', e.message); }

    // Clear persisted shift so restore doesn't fire on next app open
    try { await AsyncStorage.removeItem(SHIFT_STORAGE_KEY); } catch {}

  }

  // ─── Accept trip (atomic claim — first driver wins) ───────────────────────────
  async function acceptTrip(trip) {
    const resolved = trip || DEMO_TRIP;

    if (!isDemoRef.current && resolved.id) {
      try {
        const userId = userIdRef.current;
        if (!userId) return;

        // Atomic: only succeeds if trip is still unclaimed (status = 'pending')
        const { data } = await supabase
          .from(TABLE_TRIPS)
          .update({
            [TRIP_COLS.driverId]: userId,
            [TRIP_COLS.status]:   'accepted',
            accepted_at:          new Date().toISOString(),
          })
          .eq(TRIP_COLS.id,     resolved.id)
          .eq(TRIP_COLS.status, 'pending')
          .select('id')
          .single();

        if (!data) {
          Alert.alert('Trip No Longer Available', 'Another driver has already accepted this trip.');
          closeTripSheet();
          return;
        }
      } catch (e) {
        console.warn('[DriverContext] acceptTrip error:', e.message);
        closeTripSheet();
        return;
      }
    }

    activeTripIdRef.current = resolved.id;
    setActiveTrip(resolved);
    setDriverState(DRIVER_STATE.ACTIVE);
    setShowTripSheet(false);
    setPendingTrip(null);
    setAvailableTrips(prev => prev.filter(t => t.id !== resolved.id));

    // Persist active trip so it survives app being fully closed
    // Include acceptedAt so the trip timer can resume from the correct time
    try {
      const tripToSave = { ...resolved, acceptedAt: new Date().toISOString() };
      await AsyncStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(tripToSave));
    } catch (e) { console.warn('[DriverContext] Save active trip error:', e.message); }

    // Update CRM status to on_trip
    const uid = userIdRef.current;
    if (!isDemoRef.current && uid) {
      try {
        await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'on_trip' }).eq(DRIVER_COLS.id, uid);
      } catch {}
    }
  }

  // ─── Passenger picked up (en route to drop-off) ──────────────────────────────
  async function pickUpPassenger() {
    const tripId = activeTripIdRef.current;
    setActiveTrip(prev => {
      const updated = prev ? { ...prev, status: 'picked_up' } : prev;
      if (updated) AsyncStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    if (!isDemoRef.current && tripId) {
      try {
        await supabase.from(TABLE_TRIPS).update({ [TRIP_COLS.status]: 'picked_up' }).eq(TRIP_COLS.id, tripId);
      } catch (e) { console.warn('[DriverContext] pickUpPassenger error:', e.message); }
    }
  }

  // ─── No show — customer didn't appear ────────────────────────────────────────
  async function markNoShow() {
    const tripId = activeTripIdRef.current;
    activeTripIdRef.current = null;
    setActiveTrip(null);
    setDriverState(DRIVER_STATE.SCANNING);
    try { await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY); } catch {}
    if (!isDemoRef.current && tripId) {
      // Trip update has no user dependency — do it first so it always succeeds
      try {
        await supabase.from(TABLE_TRIPS).update({ [TRIP_COLS.status]: 'no_show' }).eq(TRIP_COLS.id, tripId);
      } catch (e) { console.warn('[DriverContext] markNoShow trip error:', e.message); }
      // Driver status update uses cached ID
      const uid = userIdRef.current;
      if (uid) {
        try {
          await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'available' }).eq(DRIVER_COLS.id, uid);
        } catch (e) { console.warn('[DriverContext] markNoShow driver error:', e.message); }
      }
    }
  }

  // ─── Cancel trip (rare — emergency or dispatcher-triggered) ──────────────────
  async function cancelTrip(reason = '') {
    const tripId = activeTripIdRef.current;
    activeTripIdRef.current = null;
    setActiveTrip(null);
    setDriverState(DRIVER_STATE.SCANNING);
    try { await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY); } catch {}
    if (!isDemoRef.current && tripId) {
      try {
        await supabase.from(TABLE_TRIPS)
          .update({ [TRIP_COLS.status]: 'cancelled', [TRIP_COLS.cancelReason]: reason })
          .eq(TRIP_COLS.id, tripId);
      } catch (e) { console.warn('[DriverContext] cancelTrip trip error:', e.message); }
      const uid = userIdRef.current;
      if (uid) {
        try {
          await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'available' }).eq(DRIVER_COLS.id, uid);
        } catch (e) { console.warn('[DriverContext] cancelTrip driver error:', e.message); }
      }
    }
  }

  // ─── Complete trip ────────────────────────────────────────────────────────────
  async function completeTrip(paymentMethod = 'cash') {
    const tripId = activeTripIdRef.current;
    activeTripIdRef.current = null;
    setActiveTrip(null);
    setDriverState(DRIVER_STATE.SCANNING);
    try { await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY); } catch {}

    if (isDemoRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        setDriverState(prev => prev === DRIVER_STATE.SCANNING ? DRIVER_STATE.TRIPS : prev);
      }, 3000);
    } else if (tripId) {
      try {
        await supabase
          .from(TABLE_TRIPS)
          .update({
            [TRIP_COLS.status]:        'completed',
            [TRIP_COLS.paymentMethod]: paymentMethod,
            completed_at:              new Date().toISOString(),
          })
          .eq(TRIP_COLS.id, tripId);
      } catch (e) {
        console.warn('[DriverContext] completeTrip full update failed, retrying status only:', e.message);
        try {
          await supabase.from(TABLE_TRIPS).update({ [TRIP_COLS.status]: 'completed' }).eq(TRIP_COLS.id, tripId);
        } catch (e2) { console.warn('[DriverContext] completeTrip fallback error:', e2.message); }
      }
      // Restore CRM status to available
      const uid = userIdRef.current;
      if (uid) {
        try {
          await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'available' }).eq(DRIVER_COLS.id, uid);
        } catch {}
      }
    }
  }

  // withSound = true only for realtime-triggered popups, false when driver taps button manually
  function openTripSheet(trip, withSound = false) {
    setTripSoundEnabled(withSound);
    setPendingTrip(trip || DEMO_TRIP);
    setShowTripSheet(true);
  }

  function closeTripSheet() {
    setShowTripSheet(false);
    setPendingTrip(null);
  }

  return (
    <DriverContext.Provider
      value={{
        driverState,
        activeTrip,
        pendingTrip,
        showTripSheet,
        tripSoundEnabled,
        availableTrips,
        shiftSeconds,
        shiftTime: formatTime(shiftSeconds),
        isOnline:  driverState !== DRIVER_STATE.OFFLINE,
        goOnline,
        goOffline,
        acceptTrip,
        pickUpPassenger,
        markNoShow,
        cancelTrip,
        completeTrip,
        openTripSheet,
        closeTripSheet,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
}

export const useDriver = () => useContext(DriverContext);
