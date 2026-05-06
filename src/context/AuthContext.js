import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { TABLE_DRIVERS, DRIVER_COLS } from '../config';

const AuthContext = createContext(null);

const FALLBACK_DRIVER = {
  id: null, name: 'Driver', phone: '', vehicle: '', plate: '',
  rating: 5.0, totalTrips: 0, acceptRate: 100, photoUrl: null, initial: 'D',
};

const DEMO_DRIVER = {
  id: 'demo-driver-001', name: 'Ahmad Khoury', phone: '+961 71 234 567',
  vehicle: 'Toyota Corolla', plate: 'B 24681', rating: 4.9,
  totalTrips: 312, acceptRate: 94, photoUrl: null, initial: 'A',
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]             = useState(true);
  const [driver, setDriver]                   = useState(FALLBACK_DRIVER);

  const isDemoRef         = useRef(false);
  const profileChannelRef = useRef(null);

  // ─── Auth state listener ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchDriverProfile(session.user.id);
      else setIsLoading(false);
    }).catch(() => setIsLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isDemoRef.current) return;
      if (session?.user) {
        // Re-fetch profile on sign-in or token refresh
        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
          fetchDriverProfile(session.user.id);
        }
      } else if (_event === 'SIGNED_OUT') {
        // Only log out on an explicit sign-out, not transient connection events
        unsubscribeProfile();
        setDriver(FALLBACK_DRIVER);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeProfile();
    };
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function unsubscribeProfile() {
    if (profileChannelRef.current) {
      supabase.removeChannel(profileChannelRef.current);
      profileChannelRef.current = null;
    }
  }

  function applyDriverRow(data) {
    setDriver({
      id:         data[DRIVER_COLS.id],
      name:       data[DRIVER_COLS.name]       ?? 'Driver',
      phone:      data[DRIVER_COLS.phone]      ?? '',
      vehicle:    data[DRIVER_COLS.vehicle]    ?? '',
      plate:      data[DRIVER_COLS.plate]      ?? '',
      rating:     Number(data[DRIVER_COLS.rating])     || 5.0,
      totalTrips: Number(data[DRIVER_COLS.totalTrips]) || 0,
      acceptRate: Number(data[DRIVER_COLS.acceptRate]) || 100,
      photoUrl:   data[DRIVER_COLS.photoUrl]   ?? null,
      initial:    (data[DRIVER_COLS.name] ?? 'D')[0].toUpperCase(),
    });
  }

  // ─── Fetch driver profile ─────────────────────────────────────────────────────
  async function fetchDriverProfile(authUserId) {
    try {
      const { data, error } = await supabase
        .from(TABLE_DRIVERS)
        .select([
          DRIVER_COLS.id, DRIVER_COLS.name, DRIVER_COLS.phone,
          DRIVER_COLS.vehicle, DRIVER_COLS.plate, DRIVER_COLS.rating,
          DRIVER_COLS.totalTrips, DRIVER_COLS.acceptRate,
          DRIVER_COLS.pushToken, DRIVER_COLS.photoUrl, DRIVER_COLS.status,
        ].join(', '))
        .eq(DRIVER_COLS.id, authUserId)
        .single();
      if (error) throw error;
      applyDriverRow(data);

      // Real-time: keep driver profile in sync (rating, totalTrips updated by dispatcher)
      unsubscribeProfile();
      profileChannelRef.current = supabase
        .channel(`driver-profile-${authUserId}`)
        .on('postgres_changes', {
          event:  'UPDATE',
          schema: 'public',
          table:  TABLE_DRIVERS,
          filter: `${DRIVER_COLS.id}=eq.${authUserId}`,
        }, (payload) => applyDriverRow(payload.new))
        .subscribe();
    } catch (e) {
      console.warn('[Auth] fetchDriverProfile error:', e.message);
    } finally {
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }

  // ─── Real login ──────────────────────────────────────────────────────────────
  async function login(phone, pin) {
    const normalised = phone.replace(/[\s\-\(\)]/g, '');
    const e164       = normalised.startsWith('+') ? normalised : `+961${normalised}`;
    const email      = `${e164}@allwaytaxi.driver`;
    const { error }  = await supabase.auth.signInWithPassword({ email, password: pin });
    if (error) throw new Error(error.message);
  }

  // ─── Demo login ──────────────────────────────────────────────────────────────
  function demoLogin() {
    isDemoRef.current = true;
    setIsLoading(false);
    setDriver(DEMO_DRIVER);
    setIsAuthenticated(true);
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────
  async function logout() {
    isDemoRef.current = false;
    unsubscribeProfile();
    await supabase.auth.signOut();
    setDriver(FALLBACK_DRIVER);
    setIsAuthenticated(false);
  }

  // ─── Save push token ─────────────────────────────────────────────────────────
  async function savePushToken(token) {
    if (!driver.id || isDemoRef.current) return;
    await supabase
      .from(TABLE_DRIVERS)
      .update({ [DRIVER_COLS.pushToken]: token })
      .eq(DRIVER_COLS.id, driver.id);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, driver, setDriver, login, demoLogin, logout, savePushToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
