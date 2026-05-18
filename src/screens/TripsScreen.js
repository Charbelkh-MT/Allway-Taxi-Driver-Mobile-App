import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl, FlatList, Animated,
} from 'react-native';
import TripDetailModal from '../components/TripDetailModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDriver } from '../context/DriverContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';
import { formatScheduledTime, formatTripDateTime } from '../utils/dateUtils';
import AppHeader from '../components/AppHeader';
import { SkeletonTripCard } from '../components/Skeleton';
import { supabase } from '../utils/supabase';
import { TABLE_TRIPS, TRIP_COLS } from '../config';

// ─── Constants ───────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { id: 'today', labelKey: 'today'     },
  { id: 'week',  labelKey: 'thisWeek'  },
  { id: 'month', labelKey: 'thisMonth' },
  { id: 'all',   labelKey: 'filterAll' },
];

const STATUS_FILTERS = [
  { id: 'all',       labelKey: 'filterAll'         },
  { id: 'completed', labelKey: 'filterCompleted'   },
  { id: 'accepted',  labelKey: 'filterDispatching' },
  { id: 'scheduled', labelKey: 'filterScheduled'   },
  { id: 'no_show',   labelKey: 'statusNoShow'      },
  { id: 'cancelled', labelKey: 'filterCancelled'   },
];

const STATUS_CONFIG = {
  scheduled:   { labelKey: 'filterScheduled',  accentKey: 'yellow', icon: '🕐' },
  pending:     { labelKey: 'statusPending',    accentKey: 'yellow', icon: '⏳' },
  dispatching: { labelKey: 'statusPending',    accentKey: 'yellow', icon: '📡' },
  accepted:    { labelKey: 'statusAccepted',   accentKey: 'yellow', icon: '🚕' },
  picked_up:   { labelKey: 'statusPickedUp',   accentKey: 'green',  icon: '🟢' },
  on_board:    { labelKey: 'statusPickedUp',   accentKey: 'green',  icon: '🚗' },
  on_trip:     { labelKey: 'statusPickedUp',   accentKey: 'green',  icon: '🚗' },
  completed:   { labelKey: 'statusCompleted',  accentKey: 'green',  icon: '✓'  },
  no_show:     { labelKey: 'statusNoShow',     accentKey: 'red',    icon: '👻' },
  cancelled:   { labelKey: 'statusCancelled',  accentKey: 'red',    icon: '✕'  },
};

const PAYMENT_ICONS  = { cash: '💵', card: '💳', debt: '📋', wish: '💙', wallet: '💰', split: '🔀' };
const PAYMENT_COLORS = ['#F5A623', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#607D8B'];

const IN_PROGRESS_STATUSES = ['accepted', 'dispatching', 'picked_up', 'on_board', 'on_trip'];

// Returns ISO string for the start of the selected date range, or null for 'all'
function rangeStart(range) {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Separator  = () => <View style={{ height: 10 }} />;

const EmptyState = React.memo(({ colors }) => {
  const { t } = useLanguage();
  return (
    <View style={emptyStyles.wrap}>
      <Text style={emptyStyles.icon}>🚕</Text>
      <Text style={[emptyStyles.title, { color: colors.textPrimary }]}>{t('noTripsYet')}</Text>
      <Text style={[emptyStyles.text,  { color: colors.textMuted   }]}>{t('tripsWillAppear')}</Text>
    </View>
  );
});

const emptyStyles = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingTop: 60, gap: 10 },
  icon:  { fontSize: 48 },
  title: { fontSize: 18, fontFamily: FONTS.black },
  text:  { fontSize: 13, fontFamily: FONTS.semiBold, textAlign: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TripsScreen() {
  const { colors, isDark } = useTheme();
  const { isOnline }       = useDriver();
  const { t, isRTL, language } = useLanguage();

  const [dateRange,    setDateRange]    = useState('week');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trips,        setTrips]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from(TABLE_TRIPS)
        .select([
          'id',
          TRIP_COLS.customerName, TRIP_COLS.customerPhone,
          TRIP_COLS.pickupAddress, TRIP_COLS.dropoffAddress,
          TRIP_COLS.fare, TRIP_COLS.distanceKm,
          TRIP_COLS.status, TRIP_COLS.paymentMethod,
          TRIP_COLS.scheduledFor, TRIP_COLS.createdAt, 'completed_at',
        ].join(', '))
        .eq(TRIP_COLS.driverId, user.id)
        .not(TRIP_COLS.status, 'in', '(pending,no_driver)')
        .order(TRIP_COLS.createdAt, { ascending: false });

      const since = rangeStart(dateRange);
      if (since) query = query.gte(TRIP_COLS.createdAt, since);
      else        query = query.limit(200);

      const { data, error: e } = await query;
      if (e) throw e;

      const mapped = (data ?? []).map(row => {
        const fareRaw = row[TRIP_COLS.fare];
        const fareNum = Number(fareRaw) || 0;
        return {
          id:            row.id,
          name:          row[TRIP_COLS.customerName] || 'Passenger',
          phone:         row[TRIP_COLS.customerPhone] ?? '',
          pickup:        row[TRIP_COLS.pickupAddress]  ?? '',
          dropoff:       row[TRIP_COLS.dropoffAddress] ?? '',
          fare:          fareNum > 0 ? `$${fareNum.toFixed(0)}` : '',
          fareNum,
          dist:          row[TRIP_COLS.distanceKm] != null ? `${Number(row[TRIP_COLS.distanceKm]).toFixed(1)} km` : '',
          status:        row[TRIP_COLS.status] ?? 'completed',
          paymentMethod: row[TRIP_COLS.paymentMethod] ?? '',
          time:          formatTripDateTime(row[TRIP_COLS.createdAt], language),
          completedAt:   row.completed_at ? formatTripDateTime(row.completed_at, language) : '',
          scheduledFor:  row[TRIP_COLS.scheduledFor] ?? null,
        };
      });
      setTrips(mapped);
    } catch (e) {
      console.warn('[TripsScreen] fetchTrips error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language, dateRange]);

  // Realtime subscription + initial fetch
  useEffect(() => {
    let channel;
    async function init() {
      await fetchTrips();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`trips-list-${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: TABLE_TRIPS,
          filter: `${TRIP_COLS.driverId}=eq.${user.id}`,
        }, fetchTrips)
        .subscribe();
    }
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchTrips]);

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (statusFilter === 'all')      return trips;
    if (statusFilter === 'accepted') return trips.filter(t => IN_PROGRESS_STATUSES.includes(t.status));
    return trips.filter(t => t.status === statusFilter);
  }, [trips, statusFilter]);

  // ── Stats (computed from filtered list) ──────────────────────────────────
  const stats = useMemo(() => {
    const completed = filtered.filter(t => t.status === 'completed');
    const earned    = completed.reduce((sum, t) => sum + t.fareNum, 0);
    const failed    = filtered.filter(t => t.status === 'no_show' || t.status === 'cancelled').length;
    const avgFare   = completed.length ? earned / completed.length : 0;

    // Payment method breakdown (completed trips only)
    const payMap = {};
    completed.forEach(trip => {
      const method = trip.paymentMethod.startsWith('split|') ? 'split' : (trip.paymentMethod || 'cash');
      payMap[method] = (payMap[method] || 0) + 1;
    });
    const total = completed.length || 1;
    const breakdown = Object.entries(payMap)
      .map(([method, count], i) => ({
        method,
        count,
        pct:   Math.round((count / total) * 100),
        color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
        icon:  PAYMENT_ICONS[method] ?? '💳',
      }))
      .sort((a, b) => b.count - a.count);

    return { earned, completedCount: completed.length, failed, avgFare, breakdown };
  }, [filtered]);

  const renderItem = useCallback(({ item, index }) => (
    <TripRow trip={item} index={index} onPress={() => setSelectedTrip(item)} />
  ), []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.appBar }}>
        <AppHeader online={isOnline} />
      </SafeAreaView>

      {/* Page title */}
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('tripHistory')}</Text>
      </View>

      {/* Stats panel */}
      <View style={[styles.statsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.statsCardShadow]}>
        {/* 4 numbers */}
        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {[
            { val: loading ? '—' : `$${stats.earned.toFixed(0)}`,         label: t('totalEarned'),    color: colors.yellow },
            { val: loading ? '—' : String(stats.completedCount),           label: t('completedCount'), color: colors.green  },
            { val: loading ? '—' : String(stats.failed),                   label: t('tripsFailedCount'), color: colors.red },
            { val: loading ? '—' : (stats.avgFare ? `$${stats.avgFare.toFixed(0)}` : '—'), label: t('avgFare'), color: colors.textPrimary },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.stat}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Payment breakdown */}
        {!loading && stats.breakdown.length > 0 && (
          <View style={[styles.breakdownWrap, { borderTopColor: colors.border }]}>
            {/* Proportional bar */}
            <View style={styles.breakdownBar}>
              {stats.breakdown.map(b => (
                <View
                  key={b.method}
                  style={[styles.breakdownSegment, { flex: b.pct, backgroundColor: b.color }]}
                />
              ))}
            </View>
            {/* Labels */}
            <View style={styles.breakdownLabels}>
              {stats.breakdown.map(b => (
                <Text key={b.method} style={[styles.breakdownLabel, { color: colors.textMuted }]}>
                  {b.icon} {t(b.method) || b.method} {b.pct}%
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Date range filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterWrap}
      >
        {DATE_RANGES.map(({ id, labelKey }) => {
          const active = dateRange === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => { setLoading(true); setDateRange(id); }}
              style={[styles.filterPill, {
                backgroundColor: active ? colors.yellow : colors.bgCard,
                borderColor:     active ? colors.yellow : colors.border,
              }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, {
                color:      active ? '#000' : colors.textMuted,
                fontFamily: active ? FONTS.extraBold : FONTS.semiBold,
              }]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterWrap}
      >
        {STATUS_FILTERS.map(({ id, labelKey }) => {
          const active = statusFilter === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setStatusFilter(id)}
              style={[styles.filterPill, {
                backgroundColor: active ? colors.textSecondary : colors.bgCard,
                borderColor:     active ? colors.textSecondary : colors.border,
              }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, {
                color:      active ? colors.bg : colors.textMuted,
                fontFamily: active ? FONTS.extraBold : FONTS.semiBold,
              }]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TripDetailModal
        trip={selectedTrip}
        visible={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
      />

      {loading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {[0,1,2,3,4].map(i => <SkeletonTripCard key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTrips(); }}
              tintColor={colors.yellow}
              colors={[colors.yellow]}
            />
          }
          ListEmptyComponent={<EmptyState colors={colors} />}
          renderItem={renderItem}
          ItemSeparatorComponent={Separator}
        />
      )}
    </View>
  );
}

// ─── Trip Row ─────────────────────────────────────────────────────────────────

const TripRow = memo(function TripRow({ trip, index = 0, onPress }) {
  const { colors, isDark } = useTheme();
  const { t, language }    = useLanguage();
  const cfgRaw   = STATUS_CONFIG[trip.status] || STATUS_CONFIG.completed;
  const cfg      = { ...cfgRaw, label: t(cfgRaw.labelKey) };
  const color    = colors[cfg.accentKey];
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, delay: Math.min(index, 8) * 55, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: Math.min(index, 8) * 55, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.cardWrap, !isDark && styles.cardShadow, { borderRadius: RADIUS.xl, opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={[styles.cardAccent, { backgroundColor: color }]} />
        <View style={styles.cardBody}>

          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]}>{trip.name}</Text>
              {trip.status === 'scheduled' && trip.scheduledFor ? (
                <Text style={[styles.cardTime, { color: colors.yellow }]}>
                  🕐 {formatScheduledTime(trip.scheduledFor, language)}
                </Text>
              ) : (
                <Text style={[styles.cardTime, { color: colors.textMuted }]}>{trip.time}</Text>
              )}
            </View>
            <View style={styles.cardTopRight}>
              <Text style={[styles.cardFare, { color: colors.yellow }]}>{trip.fare || '—'}</Text>
              <View style={[styles.chip, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
                <Text style={[styles.chipText, { color }]}>{cfg.icon} {cfg.label}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.routeBlock, { borderTopColor: colors.border }]}>
            <View style={styles.routeRow}>
              <View style={[styles.dotG, { backgroundColor: colors.green }]} />
              <Text style={[styles.routeAddr, { color: colors.textSecondary }]} numberOfLines={2}>{trip.pickup}</Text>
            </View>
            <View style={[styles.routeConnector, { backgroundColor: colors.border }]} />
            <View style={styles.routeRow}>
              <View style={[styles.dotR, { backgroundColor: colors.red }]} />
              <Text style={[styles.routeAddr, { color: colors.textSecondary }]} numberOfLines={2}>{trip.dropoff}</Text>
            </View>
          </View>

          {(!!trip.dist || !!trip.paymentMethod) && (
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
              {!!trip.dist && (
                <Text style={[styles.footerItem, { color: colors.textMuted }]}>📍 {trip.dist}</Text>
              )}
              {!!trip.paymentMethod && (
                <Text style={[styles.footerItem, { color: colors.textMuted }]}>
                  {trip.paymentMethod.startsWith('split|')
                    ? `🔀 ${t('splitPayment')}`
                    : `${PAYMENT_ICONS[trip.paymentMethod] ?? ''} ${t(trip.paymentMethod) || trip.paymentMethod}`}
                </Text>
              )}
              <Text style={[styles.footerChevron, { color: colors.textDisabled }]}>›</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1 },
  pageHeader:  { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  pageTitle:   { fontSize: 28, fontFamily: FONTS.black },

  // Stats card
  statsCard:       { marginHorizontal: 16, marginBottom: 6, borderWidth: 1, borderRadius: RADIUS.xxl, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 },
  statsCardShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  statsRow:        { flexDirection: 'row', alignItems: 'center' },
  stat:            { flex: 1, alignItems: 'center', paddingBottom: 4 },
  statVal:         { fontSize: 20, fontFamily: FONTS.black, marginBottom: 2 },
  statLabel:       { fontSize: 10, fontFamily: FONTS.semiBold, textAlign: 'center' },
  statDivider:     { width: 1, height: 32 },

  // Payment breakdown
  breakdownWrap:    { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12, gap: 8 },
  breakdownBar:     { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 },
  breakdownSegment: { borderRadius: 3 },
  breakdownLabels:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  breakdownLabel:   { fontSize: 11, fontFamily: FONTS.semiBold },

  // Filters
  filterWrap:  { maxHeight: 50 },
  filterRow:   { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  filterPill:  { paddingVertical: 7, paddingHorizontal: 16, borderRadius: RADIUS.full, borderWidth: 1 },
  filterText:  { fontSize: 12 },

  // List
  listContent: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 140 : 32 },

  // Trip card
  cardWrap:       { },
  cardShadow:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  card:           { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  cardAccent:     { width: 5 },
  cardBody:       { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardTopLeft:    { flex: 1 },
  cardTopRight:   { alignItems: 'flex-end', gap: 6 },
  cardName:       { fontSize: 16, fontFamily: FONTS.black, marginBottom: 2 },
  cardTime:       { fontSize: 11, fontFamily: FONTS.semiBold },
  cardFare:       { fontSize: 20, fontFamily: FONTS.black },
  chip:           { borderWidth: 1, borderRadius: RADIUS.sm, paddingVertical: 4, paddingHorizontal: 10 },
  chipText:       { fontSize: 10, fontFamily: FONTS.extraBold },
  routeBlock:     { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 4 },
  routeRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dotG:           { width: 9, height: 9, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  dotR:           { width: 9, height: 9, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  routeConnector: { width: 1.5, height: 10, marginLeft: 4, borderRadius: 1 },
  routeAddr:      { fontSize: 13, fontFamily: FONTS.semiBold, flex: 1, lineHeight: 19 },
  cardFooter:     { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10 },
  footerItem:     { fontSize: 12, fontFamily: FONTS.semiBold },
  footerChevron:  { marginLeft: 'auto', fontSize: 20, lineHeight: 22 },
});
