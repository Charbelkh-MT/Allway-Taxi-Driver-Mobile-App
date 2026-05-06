import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../utils/supabase';
import { startLocationTracking, stopLocationTracking } from '../utils/locationTask';
import { TABLE_SHIFTS, TABLE_LOCATIONS, TABLE_TRIPS, TABLE_DRIVERS, TRIP_COLS, DRIVER_COLS } from '../config';
import { sendTripNotification } from '../utils/notifications';

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
  id:           'trip_001',
  customer:     'Ahmad K.',
  customerFull: 'Ahmad Khoury',
  phone:        '+961 71 234 567',
  pickup:       'Hamra, Beirut',
  dropoff:      'ABC Mall, Dbayeh',
  fare:         '$22',
  dist:         '14 km',
  pickupLat:    null,
  pickupLng:    null,
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

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

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
  const name  = row[TRIP_COLS.customerName] ?? 'Customer';
  const first = name.split(' ')[0];
  const fare  = row[TRIP_COLS.fare]       != null ? `$${Number(row[TRIP_COLS.fare]).toFixed(0)}`         : '$0';
  const dist  = row[TRIP_COLS.distanceKm] != null ? `${Number(row[TRIP_COLS.distanceKm]).toFixed(1)} km` : '';
  return {
    id:           row[TRIP_COLS.id] ?? row.id,
    customer:     `${first}.`,
    customerFull: name,
    phone:        row[TRIP_COLS.customerPhone] ?? '',
    pickup:       row[TRIP_COLS.pickupAddress]  ?? '',
    dropoff:      row[TRIP_COLS.dropoffAddress] ?? '',
    pickupLat:    row[TRIP_COLS.pickupLat]  ?? null,
    pickupLng:    row[TRIP_COLS.pickupLng]  ?? null,
    fare,
    dist,
    allowDebt: row[TRIP_COLS.allowDebt] === true,
  };
}

// ─── Foreground location watcher (Expo Go fallback) ───────────────────────────
let foregroundInterval = null;
let isTracking        = false;

async function startForegroundTracking() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') { console.warn('[GPS] Permission denied'); return; }
  if (foregroundInterval) return;

  isTracking = true;

  async function pushLocation() {
    if (!isTracking) return; // shift ended mid-flight — discard
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!isTracking) return; // ended while waiting for GPS
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isTracking) return;

      const now = new Date().toISOString();
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      console.log('[GPS] Position:', lat, lng, '| user:', user.id);

      // driver_locations — internal tracking table
      const locResult = await supabase.from(TABLE_LOCATIONS).upsert(
        {
          driver_id:  user.id,
          lat, lng,
          heading:    location.coords.heading ?? 0,
          speed:      location.coords.speed   ?? 0,
          is_online:  true,
          updated_at: now,
        },
        { onConflict: 'driver_id' }
      );
      if (locResult.error) console.warn('[GPS] driver_locations error:', locResult.error.message);

      // drivers — GPS tick only updates position + last_seen, never touches online
      const drvResult = await supabase.from(TABLE_DRIVERS)
        .update({ lat, lng, last_seen: now })
        .eq(DRIVER_COLS.id, user.id);
      if (drvResult.error) console.warn('[GPS] drivers update error:', drvResult.error.message, drvResult.error.details);
      else console.log('[GPS] drivers updated ok');

    } catch (e) { console.warn('[GPS] Write error:', e.message); }
  }

  // Fire immediately then every 5 seconds
  pushLocation();
  foregroundInterval = setInterval(pushLocation, 5000);
  console.log('[GPS] Foreground tracking started');
}

async function stopForegroundTracking() {
  isTracking = false;
  if (foregroundInterval) {
    clearInterval(foregroundInterval);
    foregroundInterval = null;
    console.log('[GPS] Foreground tracking stopped');
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
  const isDemoRef       = useRef(false);

  // ─── Shift timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (driverState === DRIVER_STATE.OFFLINE) {
      clearInterval(timerRef.current);
      timerRef.current     = null;
      startTimeRef.current = null;
      setShiftSeconds(0);
    } else if (!timerRef.current) {
      startTimeRef.current = Date.now();
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
        .is(TRIP_COLS.driverId, null);
      setAvailableTrips((data ?? []).map(normalizeTrip));
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

          // INSERT: only react to new unclaimed pending trips
          if (status !== 'pending' || driverId) return;

          const trip = normalizeTrip(row);

          // TODO: re-enable range filter before production
          // if (trip.pickupLat && trip.pickupLng) { ... }

          setAvailableTrips(prev =>
            prev.find(t => t.id === trip.id) ? prev : [trip, ...prev]
          );
          sendTripNotification(trip);
          openTripSheet(trip, true); // realtime → play sound
        }
      )
      .subscribe((status) => console.log('[Realtime] dispatch channel:', status));
  }

  // ─── Go online ────────────────────────────────────────────────────────────────
  async function goOnline() {
    setDriverState(DRIVER_STATE.SCANNING);

    // Location runs independently — a failure here must never block the subscription
    try {
      const backgroundStarted = await startLocationTracking();
      if (!backgroundStarted) startForegroundTracking();
    } catch (e) {
      console.warn('[DriverContext] Location start error:', e.message);
      try { startForegroundTracking(); } catch {}
    }

    // Get auth user
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
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        setDriverState(prev => prev === DRIVER_STATE.SCANNING ? DRIVER_STATE.TRIPS : prev);
      }, 3000);
      return;
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

    // Fetch any trips already pending before we came online
    try {
      const { data } = await supabase
        .from(TABLE_TRIPS)
        .select('*')
        .eq(TRIP_COLS.status, 'pending')
        .is(TRIP_COLS.driverId, null);
      setAvailableTrips((data ?? []).map(normalizeTrip));
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
  }

  // ─── Accept trip (atomic claim — first driver wins) ───────────────────────────
  async function acceptTrip(trip) {
    const resolved = trip || DEMO_TRIP;

    if (!isDemoRef.current && resolved.id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Atomic: only succeeds if trip is still unclaimed (status = 'pending')
        const { data } = await supabase
          .from(TABLE_TRIPS)
          .update({
            [TRIP_COLS.driverId]: user.id,
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

    // Update CRM status to on_trip
    if (!isDemoRef.current) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'on_trip' }).eq(DRIVER_COLS.id, user.id);
      } catch {}
    }
  }

  // ─── Passenger picked up (en route to drop-off) ──────────────────────────────
  async function pickUpPassenger() {
    const tripId = activeTripIdRef.current;
    // Update local state immediately for snappy UI
    setActiveTrip(prev => prev ? { ...prev, status: 'picked_up' } : prev);
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
    if (!isDemoRef.current && tripId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from(TABLE_TRIPS)
          .update({ [TRIP_COLS.status]: 'no_show' })
          .eq(TRIP_COLS.id, tripId);
        if (user) await supabase.from(TABLE_DRIVERS)
          .update({ [DRIVER_COLS.status]: 'available' })
          .eq(DRIVER_COLS.id, user.id);
      } catch (e) { console.warn('[DriverContext] markNoShow error:', e.message); }
    }
  }

  // ─── Cancel trip (rare — emergency or dispatcher-triggered) ──────────────────
  async function cancelTrip(reason = '') {
    const tripId = activeTripIdRef.current;
    activeTripIdRef.current = null;
    setActiveTrip(null);
    setDriverState(DRIVER_STATE.SCANNING);
    if (!isDemoRef.current && tripId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from(TABLE_TRIPS)
          .update({
            [TRIP_COLS.status]:       'cancelled',
            [TRIP_COLS.cancelReason]: reason,
          })
          .eq(TRIP_COLS.id, tripId);
        if (user) await supabase.from(TABLE_DRIVERS)
          .update({ [DRIVER_COLS.status]: 'available' })
          .eq(DRIVER_COLS.id, user.id);
      } catch (e) { console.warn('[DriverContext] cancelTrip error:', e.message); }
    }
  }

  // ─── Complete trip ────────────────────────────────────────────────────────────
  async function completeTrip(paymentMethod = 'cash') {
    const tripId = activeTripIdRef.current;
    activeTripIdRef.current = null;
    setActiveTrip(null);
    setDriverState(DRIVER_STATE.SCANNING);

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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from(TABLE_DRIVERS).update({ [DRIVER_COLS.status]: 'available' }).eq(DRIVER_COLS.id, user.id);
      } catch {}
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
