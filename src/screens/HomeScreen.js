import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useDriver, DRIVER_STATE } from '../context/DriverContext';
import { FONTS, RADIUS } from '../theme';
import { getWeekBounds } from '../utils/dateUtils';
import AppHeader from '../components/AppHeader';
import FadeInView from '../components/FadeInView';
import ShiftCard from '../components/ShiftCard';
import MiniEarningsChart from '../components/MiniEarningsChart';
import QuickActions from '../components/QuickActions';
import ScanningRadar from '../components/ScanningRadar';
import ActiveTrip from '../components/ActiveTrip';
import AvailableTripsSheet from '../components/AvailableTripsSheet';
import ShiftSummaryModal from '../components/ShiftSummaryModal';
import SosButton from '../components/SosButton';
import UpcomingTrips from '../components/UpcomingTrips';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { SkeletonChart } from '../components/Skeleton';
import { supabase } from '../utils/supabase';
import { TABLE_TRIPS, TRIP_COLS } from '../config';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { driver, savePushToken } = useAuth();
  const {
    driverState, activeTrip, showTripSheet,
    availableTrips, shiftTime, shiftSeconds, isOnline,
    cashCollected, scheduledTrips, buildShiftSummary,
    goOnline, goOffline, acceptTrip, completeTrip,
    pickUpPassenger, markNoShow, cancelTrip, openTripSheet,
  } = useDriver();

  const [showAvailableSheet,  setShowAvailableSheet]  = useState(false);
  const [showSummary,         setShowSummary]          = useState(false);
  const [summaryData,         setSummaryData]          = useState(null);
  const [summaryLoading,      setSummaryLoading]       = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  async function initiateEndShift() {
    setSummaryData(null);
    setSummaryLoading(true);
    setShowSummary(true);
    const data = await buildShiftSummary();
    setSummaryData(data);
    setSummaryLoading(false);
  }

  useEffect(() => {
    if (availableTrips.length === 0) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [availableTrips.length]);

  const firstName = useMemo(() => (driver.name ?? 'Driver').split(' ')[0], [driver.name]);

  const [weeklyData, setWeeklyData] = useState({ bars: [0,0,0,0,0,0,0], todayIndex: 0, earned: 0, trips: 0, tripsToday: 0, earnedToday: 0 });
  const [earningsLoading, setEarningsLoading] = useState(true);

  // Prevents the driverState effect from re-running the initial fetch on first SCANNING transition
  const initialFetchDone = useRef(false);

  const fetchWeeklyEarnings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { monday, todayIndex } = getWeekBounds();
      const { data } = await supabase
        .from(TABLE_TRIPS)
        .select(`${TRIP_COLS.fare}, ${TRIP_COLS.createdAt}`)
        .eq(TRIP_COLS.driverId, user.id)
        .eq(TRIP_COLS.status, 'completed')
        .gte(TRIP_COLS.createdAt, monday)
        .not(TRIP_COLS.fare, 'is', null);

      const bars = [0, 0, 0, 0, 0, 0, 0];
      const tripsByDay = [0, 0, 0, 0, 0, 0, 0];
      let earned = 0;
      (data ?? []).forEach(row => {
        const fare    = Number(row[TRIP_COLS.fare]) || 0;
        const isoDay  = new Date(row[TRIP_COLS.createdAt]).getDay();
        const dayIdx  = isoDay === 0 ? 6 : isoDay - 1;
        bars[dayIdx]      += fare;
        tripsByDay[dayIdx] += 1;
        earned += fare;
      });
      setWeeklyData({
        bars, todayIndex, earned,
        trips:       (data ?? []).length,
        tripsToday:  tripsByDay[todayIndex],
        earnedToday: bars[todayIndex],
      });
    } catch (e) {
      console.warn('[HomeScreen] earnings error:', e.message);
    } finally {
      setEarningsLoading(false);
      initialFetchDone.current = true;
    }
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => { if (token) savePushToken(token); });
    fetchWeeklyEarnings();
  }, [fetchWeeklyEarnings]);

  useEffect(() => {
    if (initialFetchDone.current && driverState === DRIVER_STATE.SCANNING) {
      fetchWeeklyEarnings();
    }
  }, [driverState, fetchWeeklyEarnings]);

  useEffect(() => {
    let channel;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel(`home-trips-${user.id}`)
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  TABLE_TRIPS,
          filter: `${TRIP_COLS.driverId}=eq.${user.id}`,
        }, fetchWeeklyEarnings)
        .subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchWeeklyEarnings]);

  const earningsChart = useMemo(() => {
    if (earningsLoading) return <SkeletonChart />;
    return (
      <MiniEarningsChart
        earned={weeklyData.earned}
        trips={weeklyData.trips}
        bars={weeklyData.bars}
        todayIndex={weeklyData.todayIndex}
        empty={false}
      />
    );
  }, [earningsLoading, weeklyData]);

  const isActive  = driverState === DRIVER_STATE.ACTIVE;
  const showChart = driverState !== DRIVER_STATE.ACTIVE;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.appBar }}>
        <AppHeader online={isOnline} />
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0} distance={12}>
          <GreetingHeader
            name={firstName}
            earned={weeklyData.earnedToday}
            trips={weeklyData.tripsToday}
            rating={driver.rating}
            loading={earningsLoading}
          />
        </FadeInView>
        <FadeInView delay={80} distance={16}>
          <ShiftCard
            online={isOnline}
            onToggle={isOnline ? initiateEndShift : goOnline}
            shiftTime={isOnline ? shiftTime : '00:00:00'}
            disabled={driverState === DRIVER_STATE.ACTIVE}
          />
        </FadeInView>

        {isOnline && cashCollected > 0 && (
          <FadeInView delay={120} distance={10}>
            <View style={[styles.cashCard, { backgroundColor: `${colors.yellow}10`, borderColor: `${colors.yellow}30` }]}>
              <Text style={styles.cashIcon}>💵</Text>
              <Text style={[styles.cashLabel, { color: colors.textMuted }]}>{t('cashOnHand')}</Text>
              <Text style={[styles.cashAmount, { color: colors.yellow }]}>${cashCollected.toFixed(0)}</Text>
            </View>
          </FadeInView>
        )}

        {isOnline && scheduledTrips.length > 0 && (
          <FadeInView delay={140} distance={16}>
            <UpcomingTrips trips={scheduledTrips} />
          </FadeInView>
        )}

        {isOnline && (
          <FadeInView delay={160} distance={10}>
            <SosButton />
          </FadeInView>
        )}

        {driverState === DRIVER_STATE.SCANNING && <FadeInView delay={160} distance={16}><ScanningRadar /></FadeInView>}
        {driverState === DRIVER_STATE.ACTIVE   && activeTrip && (
          <FadeInView delay={160} distance={16}>
            <ActiveTrip
              trip={activeTrip}
              onComplete={completeTrip}
              onPickUp={pickUpPassenger}
              onNoShow={markNoShow}
              onCancel={cancelTrip}
            />
          </FadeInView>
        )}

        {showChart && <FadeInView delay={160} distance={16}>{earningsChart}</FadeInView>}
        {!isActive  && <FadeInView delay={240} distance={16}><QuickActions /></FadeInView>}
      </ScrollView>

      <ShiftSummaryModal
        visible={showSummary}
        summary={summaryData}
        loading={summaryLoading}
        shiftSeconds={shiftSeconds ?? 0}
        onConfirmEnd={(summary) => { setShowSummary(false); goOffline(summary); }}
        onResume={() => { setShowSummary(false); setSummaryData(null); }}
      />

      {showAvailableSheet && (
        <AvailableTripsSheet
          trips={availableTrips}
          onAccept={(trip) => { setShowAvailableSheet(false); acceptTrip(trip); }}
          onClose={() => setShowAvailableSheet(false)}
        />
      )}

      {isOnline && availableTrips.filter(t => !t.createdAt || (Date.now() - new Date(t.createdAt).getTime()) / 1000 < 84).length > 0 && !showTripSheet && driverState !== DRIVER_STATE.ACTIVE && (
        <Animated.View collapsable={false} style={[styles.floatWrap, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[styles.floatBtn, { backgroundColor: colors.yellow }]}
            onPress={() => {
              const validTrips = availableTrips.filter(t => {
                if (!t.createdAt) return true;
                return (Date.now() - new Date(t.createdAt).getTime()) / 1000 < 84;
              });
              if (validTrips.length === 0) return;
              if (validTrips.length === 1) {
                openTripSheet(validTrips[0]);
              } else {
                setShowAvailableSheet(true);
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.floatIcon}>🚕</Text>
            <Text style={styles.floatText}>
              {availableTrips.length} {availableTrips.length === 1 ? t('tripAvailable') : t('tripsAvailable')}
            </Text>
            <View style={styles.floatBadge}>
              <Text style={styles.floatBadgeText}>{availableTrips.length}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const GreetingHeader = memo(function GreetingHeader({ name, earned, trips, rating, loading }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const hour     = new Date().getHours();
  const greeting = useMemo(
    () => hour < 12 ? t('goodMorning') : hour < 17 ? t('goodAfternoon') : t('goodEvening'),
    [hour, t]
  );
  const dateStr = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    [hour]
  );

  const stats = [
    { label: t('tripsToday'), value: loading ? '—' : String(trips > 0 ? trips : 0),               color: colors.yellow },
    { label: t('earned'),     value: loading ? '—' : earned > 0 ? `$${earned.toFixed(0)}` : '$0', color: colors.green  },
    { label: t('rating'),     value: loading ? '—' : Number(rating || 0).toFixed(1),               color: colors.yellow },
  ];

  return (
    <View style={greetingStyles.container}>
      <Text style={[greetingStyles.date, { color: colors.yellow }]}>{dateStr}</Text>
      <Text style={[greetingStyles.name, { color: colors.textPrimary }]}>{greeting}, {name} 👋</Text>

      <View style={[greetingStyles.statsStrip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={[greetingStyles.divider, { backgroundColor: colors.border }]} />}
            <View style={greetingStyles.statItem}>
              <Text style={[greetingStyles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[greetingStyles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
});

const greetingStyles = StyleSheet.create({
  container:  { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  date:       { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase' },
  name:       { fontSize: 28, fontFamily: FONTS.black, lineHeight: 36, marginBottom: 16 },
  statsStrip: { flexDirection: 'row', alignItems: 'center' },
  statItem:   { flex: 1, alignItems: 'center', gap: 2 },
  statValue:  { fontSize: 22, fontFamily: FONTS.black },
  statLabel:  { fontSize: 10, fontFamily: FONTS.semiBold },
  divider:    { width: 1, height: 32 },
});

const styles = StyleSheet.create({
  container:      { flex: 1 },
  scroll:         { flex: 1 },
  scrollContent:  { paddingBottom: Platform.OS === 'ios' ? 140 : 32 },
  cashCard:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 12, borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 14, paddingHorizontal: 18 },
  cashIcon:   { fontSize: 20 },
  cashLabel:  { flex: 1, fontSize: 13, fontFamily: FONTS.semiBold },
  cashAmount: { fontSize: 22, fontFamily: FONTS.black },
  floatWrap:      { position: 'absolute', bottom: 12, alignSelf: 'center', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  floatBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 26, paddingVertical: 13, paddingHorizontal: 20, shadowColor: '#F5B800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },
  floatIcon:      { fontSize: 16 },
  floatText:      { fontSize: 13, fontFamily: FONTS.black, color: '#000' },
  floatBadge:     { backgroundColor: '#000', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  floatBadgeText: { fontSize: 11, fontFamily: FONTS.black, color: '#F5B800' },
});
