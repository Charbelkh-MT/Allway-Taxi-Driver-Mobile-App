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
import { formatTime } from '../utils/dateUtils';

// In Expo Go, background location tasks crash — use foreground-only tracking
const IS_EXPO_GO = Constants.appOwnership === 'expo';

const SHIFT_STORAGE_KEY       = 'allway_active_shift';
const ACTIVE_TRIP_STORAGE_KEY = 'allway_active_trip';
const CASH_STORAGE_KEY        = 'allway_shift_cash';

export const DRIVER_STATE = {
  OFFLINE:  'offline',
  SCANNING: 'scanning',
  TRIPS:    'trips',
  ACTIVE:   'active',
};

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
    pickupLat:         row[TRIP_COLS.pickupLat]        ?? null,
    pickupLng:         row[TRIP_COLS.pickupLng]        ?? null,
    dropoffLat:        row[TRIP_COLS.dropoffLat]       ?? null,
    dropoffLng:        row[TRIP_COLS.dropoffLng]       ?? null,
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
    scheduledFor:       row[TRIP_COLS.scheduledFor]        ?? null,
    groupSize:          row[TRIP_COLS.groupSize]           ?? null,
    notes:              row[TRIP_COLS.notes]               ?? null,
  };
}

function markPreferred(trips, userId) {
  if (!userId) return trips;
  return trips.map(t => ({ ...t, isPreferred: t.preferredDriverId === userId }));
}

const DISPATCH_RADIUS_KM = 15; // drivers only receive trips within this radius

// Module-level GPS state — accessible by both the watcher and the trip filter
let driverLat  = null;
let driverLng  = null;
let gpsTick    = 0;     // increments every 2s ping
let locationSubscription = null;

async function startForegroundTracking(cachedUserId) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') { console.warn('[GPS] Permission denied'); return; }
  if (locationSubscription) return;

  locationSubscription = await Location.watchPositionAsync(
    {
      // Balanced fires more reliably when stationary than High
      accuracy:         Location.Accuracy.Balanced,
      timeInterval:     2000,
      distanceInterval: 0,
    },
    async (location) => {
      if (!locationSubscription) return;
      try {
        const { latitude: lat, longitude: lng } = location.coords;
        const heading = location.coords.heading ?? 0;
        const speed   = Math.max(0, location.coords.speed ?? 0);
        const now     = new Date().toISOString();

        // Keep module-level position in sync for proximity filtering
        driverLat = lat;
        driverLng = lng;
        gpsTick++;

        console.log(`[GPS] lat=${lat.toFixed(6)}  lng=${lng.toFixed(6)}  heading=${heading.toFixed(1)}°  speed=${speed.toFixed(1)}m/s`);

        // driver_locations gets every ping (CRM map needs real-time position)
        // drivers table is updated every 30s to reduce unnecessary DB writes
        const ops = [
          supabase.from(TABLE_LOCATIONS).upsert(
            { driver_id: cachedUserId, lat, lng, heading, speed, is_online: true, updated_at: now },
            { onConflict: 'driver_id' }
          ),
        ];
        // Update drivers on first ping and every 15 ticks (~30s) so the CRM map
        // reflects position immediately when the driver goes online.
        if (gpsTick === 1 || gpsTick % 15 === 0) {
          ops.push(
            supabase.from(TABLE_DRIVERS)
              .update({ lat, lng, last_seen: now, heading, speed })
              .eq(DRIVER_COLS.id, cachedUserId)
          );
        }
        await Promise.all(ops);
      } catch (e) { console.warn('[GPS] Write error:', e.message); }
    }
  );

  console.log('[GPS] Foreground watch started (2s)');
}

async function stopForegroundTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    driverLat = null;
    driverLng = null;
    gpsTick   = 0;
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
      // Mark offline in drivers table so the CRM map removes the marker
      await supabase.from(TABLE_DRIVERS)
        .update({ [DRIVER_COLS.online]: false, last_seen: now, [DRIVER_COLS.status]: 'offline' })
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
  const [cashCollected, setCashCollected]   = useState(0);
  const [scheduledTrips, setScheduledTrips] = useState([]);

  const timerRef        = useRef(null);
  const startTimeRef    = useRef(null);
  const scanTimeoutRef  = useRef(null);
  const currentShiftRef = useRef(null);
  const channelRef      = useRef(null);
  const activeTripIdRef = useRef(null);
  const carTypeRef      = useRef('comfort');
  const isDemoRef       = useRef(false);
  const userIdRef       = useRef(null);
  const pickupTimeRef   = useRef(null);
  const cashRef         = useRef(0);

  useEffect(() => {
    if (driverState === DRIVER_STATE.OFFLINE) {
      clearInterval(timerRef.current);
      timerRef.current     = null;
      startTimeRef.current = null;
      setShiftSeconds(0);
    } else {
      // Restart the interval on every non-offline transition so the timer
      // never gets stuck after a completed/cancelled trip
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

  useEffect(() => {
    if (driverState === DRIVER_STATE.OFFLINE) return;

    const cleanup = setInterval(async () => {
      // Drop trips whose 84s countdown has expired
      setAvailableTrips(prev => prev.filter(t => {
        if (!t.createdAt) return true;
        const elapsed = (Date.now() - new Date(t.createdAt).getTime()) / 1000;
        return elapsed < 84;
      }));

      // Re-sync to catch trips claimed by other drivers
      await syncPendingTrips();
    }, 8000);

    return () => clearInterval(cleanup);
  }, [driverState]);

  useEffect(() => {
    async function restoreShiftIfActive() {
      try {
        const saved = await AsyncStorage.getItem(SHIFT_STORAGE_KEY);
        if (!saved) return;

        const { userId, shiftId, startTime } = JSON.parse(saved);
        if (!userId) return;

        const savedCash = await AsyncStorage.getItem(CASH_STORAGE_KEY);
        if (savedCash) {
          const c = parseFloat(savedCash) || 0;
          cashRef.current = c;
          setCashCollected(c);
        }

        const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);

        userIdRef.current       = userId;
        currentShiftRef.current = shiftId ?? null;
        isDemoRef.current       = false;
        startTimeRef.current    = startTime;

        const savedTrip = await AsyncStorage.getItem(ACTIVE_TRIP_STORAGE_KEY);
        if (savedTrip) {
          const trip = JSON.parse(savedTrip);

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
              .update({ [DRIVER_COLS.online]: true, [DRIVER_COLS.status]: 'on_trip' })
              .eq(DRIVER_COLS.id, userId);
            if (!isTracking) {
              try { await startForegroundTracking(userId); } catch {}
            }
            console.log('[DriverContext] Active trip restored:', trip.id, '— status:', tripStatus);
            return;
          } else {
            await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
          }
        }

        if (!isTracking) {
          // GPS stopped externally — clear the saved shift so we don't restore stale state
          await AsyncStorage.removeItem(SHIFT_STORAGE_KEY);
          return;
        }

        setDriverState(DRIVER_STATE.SCANNING);
        subscribeToTrips(userId);

        await supabase.from(TABLE_DRIVERS)
          .update({ [DRIVER_COLS.online]: true, [DRIVER_COLS.status]: 'available' })
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
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const tripId = response.notification.request.content.data?.tripId;
      if (tripId) handleNotificationTap(tripId);
    });

    // Notification tap that launched the app from a fully closed state
    Notifications.getLastNotificationResponseAsync().then(response => {
      const tripId = response?.notification.request.content.data?.tripId;
      if (tripId) {
        // Wait for shift restore to complete first
        setTimeout(() => handleNotificationTap(tripId), 1500);
      }
    });

    return () => sub.remove();
  }, []);

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
      // INSERT — server-side filtered by ride_type to reduce unnecessary traffic
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  TABLE_TRIPS,
          filter: `${TRIP_COLS.rideType}=eq.${carTypeRef.current}`,
        },
        (payload) => {
          const row      = payload.new;
          if (!row) return;
          const status   = row[TRIP_COLS.status];
          const driverId = row[TRIP_COLS.driverId];
          if (status !== 'pending' || driverId) return;

          const trip = normalizeTrip(row);

          // Proximity filter — skip if pickup coords available but outside radius
          if (
            trip.pickupLat && trip.pickupLng &&
            driverLat !== null && driverLng !== null
          ) {
            const distKm = haversineKm(driverLat, driverLng, trip.pickupLat, trip.pickupLng);
            if (distKm > DISPATCH_RADIUS_KM) return;
          }

          const markedTrip = markPreferred([trip], userIdRef.current)[0];
          setAvailableTrips(prev =>
            prev.find(t => t.id === markedTrip.id) ? prev : [markedTrip, ...prev]
          );
          openTripSheet(trip, true);
        }
      )
      // UPDATE — handle scheduled trips becoming live, and re-sync the pending queue
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: TABLE_TRIPS },
        async (payload) => {
          const row      = payload.new;
          const status   = row?.[TRIP_COLS.status];
          const driverId = row?.[TRIP_COLS.driverId];

          // Driver's own scheduled trip is now being dispatched — show acceptance sheet
          if (
            (status === 'pending' || status === 'dispatching') &&
            driverId === userIdRef.current
          ) {
            setScheduledTrips(prev => prev.filter(t => t.id !== row?.id));
            const trip = normalizeTrip(row);
            openTripSheet(markPreferred([trip], userIdRef.current)[0], true);
            return;
          }

          // Remove from upcoming list if trip was cancelled or modified
          if (driverId === userIdRef.current && status !== 'scheduled') {
            setScheduledTrips(prev => prev.filter(t => t.id !== row?.id));
          }

          // Re-sync available queue when any trip leaves pending state
          if (status && status !== 'pending') await syncPendingTrips();
        }
      )
      // DELETE — payload.old is unreliable; always re-sync
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: TABLE_TRIPS },
        async () => { await syncPendingTrips(); }
      )
      .subscribe((status) => console.log('[Realtime] dispatch channel:', status));
  }

  function addCashFromPayment(paymentMethod, fareNum) {
    if (!paymentMethod || !fareNum) return;
    let cash = 0;
    if (paymentMethod === 'cash') {
      cash = fareNum;
    } else if (paymentMethod.startsWith('split|')) {
      const parts = paymentMethod.split('|');
      for (let i = 1; i < parts.length - 1; i += 2) {
        if (parts[i] === 'cash') cash += parseFloat(parts[i + 1]) || 0;
      }
    }
    if (cash > 0) {
      const next = cashRef.current + cash;
      cashRef.current = next;
      setCashCollected(next);
      AsyncStorage.setItem(CASH_STORAGE_KEY, String(next)).catch(() => {});
    }
  }

  async function fetchScheduledTrips() {
    if (isDemoRef.current) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from(TABLE_TRIPS)
        .select([
          TRIP_COLS.id, TRIP_COLS.customerName, TRIP_COLS.customerPhone,
          TRIP_COLS.pickupAddress, TRIP_COLS.dropoffAddress,
          TRIP_COLS.pickupLat, TRIP_COLS.pickupLng, TRIP_COLS.dropoffLat, TRIP_COLS.dropoffLng,
          TRIP_COLS.fare, TRIP_COLS.distanceKm, TRIP_COLS.rideType,
          TRIP_COLS.passengerCount, TRIP_COLS.allowDebt, TRIP_COLS.preferredDriverId,
          TRIP_COLS.scheduledFor, TRIP_COLS.groupSize, TRIP_COLS.notes,
          TRIP_COLS.dispatchTimeoutAt, TRIP_COLS.createdAt,
        ].join(', '))
        .eq(TRIP_COLS.driverId, user.id)
        .eq(TRIP_COLS.status, 'scheduled')
        .order(TRIP_COLS.scheduledFor, { ascending: true });
      setScheduledTrips((data ?? []).map(normalizeTrip));
    } catch (e) { console.warn('[DriverContext] fetchScheduledTrips error:', e.message); }
  }

  async function buildShiftSummary() {
    try {
      if (isDemoRef.current) {
        return {
          tripsCompleted: 3, tripsCancelled: 0, tripsNoShow: 0,
          totalEarned: 66, cashUsd: cashRef.current,
          topAreas: ['Hamra', 'Verdun', 'Jounieh'], avgFare: 22, totalDistanceKm: 42,
        };
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const shiftStart = startTimeRef.current
        ? new Date(startTimeRef.current).toISOString()
        : new Date(Date.now() - shiftSeconds * 1000).toISOString();

      const { data } = await supabase
        .from(TABLE_TRIPS)
        .select(`${TRIP_COLS.status}, ${TRIP_COLS.fare}, ${TRIP_COLS.pickupAddress}, ${TRIP_COLS.distanceKm}`)
        .eq(TRIP_COLS.driverId, user.id)
        .gte('accepted_at', shiftStart);

      let tripsCompleted = 0, tripsCancelled = 0, tripsNoShow = 0;
      let totalEarned = 0, totalDistanceKm = 0;
      const areaCounts = {};

      (data ?? []).forEach(row => {
        const status = row[TRIP_COLS.status];
        const fare   = Number(row[TRIP_COLS.fare]) || 0;
        const dist   = Number(row[TRIP_COLS.distanceKm]) || 0;
        const pickup = row[TRIP_COLS.pickupAddress] ?? '';
        if (status === 'completed') {
          tripsCompleted++;
          totalEarned      += fare;
          totalDistanceKm  += dist;
          const area = pickup.split(',')[0].trim();
          if (area) areaCounts[area] = (areaCounts[area] || 0) + 1;
        } else if (status === 'cancelled') {
          tripsCancelled++;
        } else if (status === 'no_show') {
          tripsNoShow++;
        }
      });

      const topAreas = Object.entries(areaCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([area]) => area);

      return {
        tripsCompleted,
        tripsCancelled,
        tripsNoShow,
        totalEarned:     Math.round(totalEarned * 100) / 100,
        cashUsd:         cashRef.current,
        topAreas,
        avgFare:         tripsCompleted > 0 ? Math.round(totalEarned / tripsCompleted * 100) / 100 : 0,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      };
    } catch (e) {
      console.warn('[DriverContext] buildShiftSummary error:', e.message);
      return null;
    }
  }

  async function goOnline() {
    cashRef.current = 0;
    setCashCollected(0);
    AsyncStorage.setItem(CASH_STORAGE_KEY, '0').catch(() => {});

    setDriverState(DRIVER_STATE.SCANNING);

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

    userIdRef.current = user.id;
    carTypeRef.current = driver?.carType ?? 'comfort';

    // Foreground watcher is the source of truth for the 2s log/upsert cadence.
    // The background task (native builds only) layers on top to keep GPS alive when the screen is off.
    try {
      await startForegroundTracking(user.id);
    } catch (e) {
      console.warn('[DriverContext] Foreground GPS failed:', e.message);
    }

    if (!IS_EXPO_GO) {
      startLocationTracking().catch(e =>
        console.warn('[DriverContext] Background task failed (non-fatal):', e.message)
      );
    }

    isDemoRef.current = false;
    subscribeToTrips(user.id);
    fetchScheduledTrips();

    try {
      await supabase.from(TABLE_DRIVERS)
        .update({ [DRIVER_COLS.online]: true, [DRIVER_COLS.status]: 'available' })
        .eq(DRIVER_COLS.id, user.id);
    } catch (e) { console.warn('[DriverContext] online mark error:', e.message); }

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

    // Persist shift so it can be restored if the app is fully closed
    try {
      await AsyncStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify({
        userId:    user.id,
        shiftId:   currentShiftRef.current,
        startTime: startTimeRef.current ?? Date.now(),
      }));
    } catch (e) { console.warn('[DriverContext] Shift save error:', e.message); }

  }

  async function goOffline(summaryData = null) {
    clearTimeout(scanTimeoutRef.current);
    setDriverState(DRIVER_STATE.OFFLINE);
    setActiveTrip(null);
    setShowTripSheet(false);
    setPendingTrip(null);
    setAvailableTrips([]);
    activeTripIdRef.current = null;
    userIdRef.current = null;

    cashRef.current = 0;
    setCashCollected(0);
    setScheduledTrips([]);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    stopForegroundTracking();
    stopLocationTracking();

    try {
      if (currentShiftRef.current) {
        const shiftId = currentShiftRef.current;
        const { error: shiftError } = await supabase
          .from(TABLE_SHIFTS)
          .update({
            ended_at:   new Date().toISOString(),
            duration_s: shiftSeconds,
            ...(summaryData ? {
              trips_completed:   summaryData.tripsCompleted,
              trips_cancelled:   summaryData.tripsCancelled,
              trips_no_show:     summaryData.tripsNoShow,
              total_earned_usd:  summaryData.totalEarned,
              cash_usd:          summaryData.cashUsd,
              top_areas:         JSON.stringify(summaryData.topAreas),
              avg_fare_usd:      summaryData.avgFare,
              total_distance_km: summaryData.totalDistanceKm,
            } : {}),
          })
          .eq('id', shiftId);

        if (shiftError) {
          console.warn('[Shift] Report save failed:', shiftError.message);
          Alert.alert('Report Error', 'Shift ended but the report could not be saved. Please inform the dispatcher.');
        } else {
          console.log(
            `[Shift] Report saved — id: ${shiftId}` +
            (summaryData
              ? `, trips: ${summaryData.tripsCompleted}, earned: $${summaryData.totalEarned}, cash: $${summaryData.cashUsd}`
              : ' (no summary data)')
          );
        }
        currentShiftRef.current = null;
      }
    } catch (e) { console.warn('[Shift] Unexpected error ending shift:', e.message); }

    try {
      await AsyncStorage.removeItem(SHIFT_STORAGE_KEY);
      await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
      await AsyncStorage.removeItem(CASH_STORAGE_KEY);
    } catch {}
  }

  async function acceptTrip(trip) {
    const resolved = trip || DEMO_TRIP;

    if (!isDemoRef.current && resolved.id) {
      try {
        const userId = userIdRef.current;
        if (!userId) return;

        // Atomic claim — only succeeds if the trip is still unclaimed (status = 'pending')
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

    // Persist active trip so it survives the app being fully closed.
    // acceptedAt lets the trip timer resume from the correct time.
    try {
      const tripToSave = { ...resolved, acceptedAt: new Date().toISOString() };
      await AsyncStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(tripToSave));
    } catch (e) { console.warn('[DriverContext] Save active trip error:', e.message); }

    const uid = userIdRef.current;
    if (!isDemoRef.current && uid) {
      try {
        await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'on_trip' }).eq(DRIVER_COLS.id, uid);
      } catch {}
    }
  }

  async function pickUpPassenger() {
    const tripId  = activeTripIdRef.current;
    const now     = new Date().toISOString();
    pickupTimeRef.current = Date.now();
    setActiveTrip(prev => {
      const updated = prev ? { ...prev, status: 'picked_up', pickupAt: now } : prev;
      if (updated) AsyncStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    if (!isDemoRef.current && tripId) {
      try {
        await supabase.from(TABLE_TRIPS).update({
          [TRIP_COLS.status]:   'picked_up',
          [TRIP_COLS.pickupAt]: now,
        }).eq(TRIP_COLS.id, tripId);
      } catch (e) { console.warn('[DriverContext] pickUpPassenger error:', e.message); }
    }
  }

  async function markNoShow() {
    const tripId = activeTripIdRef.current;
    activeTripIdRef.current = null;
    setActiveTrip(null);
    setDriverState(DRIVER_STATE.SCANNING);
    try { await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY); } catch {}
    if (!isDemoRef.current && tripId) {
      // Run the trip update first — it has no user dependency and must always succeed
      try {
        await supabase.from(TABLE_TRIPS).update({ [TRIP_COLS.status]: 'no_show' }).eq(TRIP_COLS.id, tripId);
      } catch (e) { console.warn('[DriverContext] markNoShow trip error:', e.message); }
      const uid = userIdRef.current;
      if (uid) {
        try {
          await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'available' }).eq(DRIVER_COLS.id, uid);
        } catch (e) { console.warn('[DriverContext] markNoShow driver error:', e.message); }
      }
    }
  }

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

  async function completeTrip(paymentMethod = 'cash', customerRating = null) {
    const tripId   = activeTripIdRef.current;
    const tripSnap = activeTrip;
    addCashFromPayment(paymentMethod, tripSnap?.fareNum ?? 0);
    activeTripIdRef.current = null;
    setActiveTrip(null);
    setDriverState(DRIVER_STATE.SCANNING);
    try { await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY); } catch {}

    if (isDemoRef.current) {
      pickupTimeRef.current = null;
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        setDriverState(prev => prev === DRIVER_STATE.SCANNING ? DRIVER_STATE.TRIPS : prev);
      }, 3000);
    } else if (tripId) {
      // CRM expects 'split' rather than the full detail string
      const normalizedMethod = paymentMethod.startsWith('split|') ? 'split' : paymentMethod;

      const durationMin = pickupTimeRef.current
        ? Math.round((Date.now() - pickupTimeRef.current) / 60000)
        : null;
      pickupTimeRef.current = null;

      let distanceKm = null;
      if (tripSnap?.pickupLat && tripSnap?.pickupLng && tripSnap?.dropoffLat && tripSnap?.dropoffLng) {
        distanceKm = haversineKm(tripSnap.pickupLat, tripSnap.pickupLng, tripSnap.dropoffLat, tripSnap.dropoffLng);
        distanceKm = Math.round(distanceKm * 10) / 10;
      }

      try {
        await supabase
          .from(TABLE_TRIPS)
          .update({
            [TRIP_COLS.status]:         'completed',
            [TRIP_COLS.paymentMethod]:  normalizedMethod,
            [TRIP_COLS.durationMin]:    durationMin,
            [TRIP_COLS.distanceKm]:     distanceKm,
            ...(customerRating ? { [TRIP_COLS.customerRating]: customerRating } : {}),
            completed_at:               new Date().toISOString(),
          })
          .eq(TRIP_COLS.id, tripId);
      } catch (e) {
        console.warn('[DriverContext] completeTrip full update failed, retrying status only:', e.message);
        try {
          await supabase.from(TABLE_TRIPS).update({ [TRIP_COLS.status]: 'completed' }).eq(TRIP_COLS.id, tripId);
        } catch (e2) { console.warn('[DriverContext] completeTrip fallback error:', e2.message); }
      }
      const uid = userIdRef.current;
      if (uid) {
        try {
          await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'available' }).eq(DRIVER_COLS.id, uid);
        } catch {}
      }
    }
  }

  // withSound = true only for realtime-triggered popups; false when the driver taps the button manually
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
        cashCollected,
        scheduledTrips,
        buildShiftSummary,
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
