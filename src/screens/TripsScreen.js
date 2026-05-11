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
import { relativeTime, formatScheduledTime } from '../utils/dateUtils';
import AppHeader from '../components/AppHeader';
import { SkeletonTripCard } from '../components/Skeleton';
import { supabase } from '../utils/supabase';
import { TABLE_TRIPS, TRIP_COLS } from '../config';

const FILTERS = [
  { id: 'all',       labelKey: 'filterAll'         },
  { id: 'scheduled', labelKey: 'filterScheduled'   },
  { id: 'completed', labelKey: 'filterCompleted'   },
  { id: 'accepted',  labelKey: 'filterDispatching' },
  { id: 'no_show',   labelKey: 'statusNoShow'      },
  { id: 'cancelled', labelKey: 'filterCancelled'   },
];

const STATUS_CONFIG = {
  scheduled: { labelKey: 'filterScheduled',  accentKey: 'yellow', icon: '🕐' },
  pending:   { labelKey: 'statusPending',    accentKey: 'yellow', icon: '⏳' },
  accepted:  { labelKey: 'statusAccepted',   accentKey: 'yellow', icon: '🚕' },
  picked_up: { labelKey: 'statusPickedUp',   accentKey: 'green',  icon: '🟢' },
  completed: { labelKey: 'statusCompleted',  accentKey: 'green',  icon: '✓'  },
  no_show:   { labelKey: 'statusNoShow',     accentKey: 'red',    icon: '👻' },
  cancelled: { labelKey: 'statusCancelled',  accentKey: 'red',    icon: '✕'  },
};

const Separator   = () => <View style={{ height: 10 }} />;
const EmptyState  = React.memo(({ colors }) => {
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

export default function TripsScreen() {
  const { colors }  = useTheme();
  const { isOnline } = useDriver();
  const { t, isRTL } = useLanguage();
  const [filter, setFilter]           = useState('all');
  const [trips, setTrips]             = useState([]);
  const [stats, setStats]             = useState({ total: 0, earned: 0, completed: 0 });
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const fetchTrips = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: e } = await supabase
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
        .order(TRIP_COLS.createdAt, { ascending: false })
        .limit(200);
      if (e) throw e;
      let totalEarned = 0, completedCount = 0;
      const mapped = (data ?? []).map(row => {
        const fare = row[TRIP_COLS.fare];
        if (row[TRIP_COLS.status] === 'completed') { totalEarned += Number(fare) || 0; completedCount++; }
        return {
          id:            row.id,
          name:          row[TRIP_COLS.customerName] ?? 'Passenger',
          phone:         row[TRIP_COLS.customerPhone] ?? '',
          pickup:        row[TRIP_COLS.pickupAddress]  ?? '',
          dropoff:       row[TRIP_COLS.dropoffAddress] ?? '',
          fare:          fare != null ? `$${Number(fare).toFixed(0)}` : '',
          dist:          row[TRIP_COLS.distanceKm] != null ? `${Number(row[TRIP_COLS.distanceKm]).toFixed(1)} km` : '',
          status:        row[TRIP_COLS.status] ?? 'completed',
          paymentMethod: row[TRIP_COLS.paymentMethod] ?? '',
          time:          relativeTime(row[TRIP_COLS.createdAt]),
          completedAt:   row.completed_at ? relativeTime(row.completed_at) : '',
          scheduledFor:  row[TRIP_COLS.scheduledFor] ?? null,
        };
      });
      setTrips(mapped);
      setStats({ total: mapped.length, earned: totalEarned, completed: completedCount });
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let channel;
    async function init() {
      await fetchTrips();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`trips-list-${user.id}`)
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  TABLE_TRIPS,
          filter: `${TRIP_COLS.driverId}=eq.${user.id}`,
        }, fetchTrips)
        .subscribe();
    }
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchTrips]);

  const filtered = useMemo(
    () => filter === 'all' ? trips : trips.filter(t => t.status === filter),
    [trips, filter]
  );

  const renderItem = useCallback(({ item, index }) => (
    <TripRow trip={item} index={index} onPress={() => setSelectedTrip(item)} />
  ), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.appBar }}>
        <AppHeader online={isOnline} />
      </SafeAreaView>

      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('tripHistory')}</Text>
        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {[
            { val: loading ? '—' : `$${stats.earned.toFixed(0)}`, label: t('totalEarned'),    color: colors.yellow },
            { val: loading ? '—' : String(stats.completed),       label: t('completedCount'), color: colors.green  },
            { val: loading ? '—' : String(stats.total),           label: t('totalCount'),     color: colors.textPrimary },
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
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterWrap}
      >
        {FILTERS.map(({ id, labelKey }) => {
          const active = filter === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setFilter(id)}
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
          keyExtractor={t => t.id}
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

const PAYMENT_ICONS = { cash: '💵', card: '💳', debt: '📋' };

const TripRow = memo(function TripRow({ trip, index = 0, onPress }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
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
                  🕐 {formatScheduledTime(trip.scheduledFor)}
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
                  {PAYMENT_ICONS[trip.paymentMethod] ?? ''} {trip.paymentMethod === 'debt' ? 'Account' : trip.paymentMethod.charAt(0).toUpperCase() + trip.paymentMethod.slice(1)}
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

const styles = StyleSheet.create({
  container:   { flex: 1 },
  pageHeader:  { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  pageTitle:   { fontSize: 28, fontFamily: FONTS.black, marginBottom: 16 },
  statsRow:    { flexDirection: 'row', alignItems: 'center' },
  stat:        { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 22, fontFamily: FONTS.black, marginBottom: 2 },
  statLabel:   { fontSize: 11, fontFamily: FONTS.semiBold },
  statDivider: { width: 1, height: 32 },
  filterWrap:  { maxHeight: 56 },
  filterRow:   { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterPill:  { paddingVertical: 8, paddingHorizontal: 18, borderRadius: RADIUS.full, borderWidth: 1 },
  filterText:  { fontSize: 12 },
  listContent: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 140 : 32 },
  cardWrap:         { },
  cardShadow:       { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  card:             { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  cardAccent:       { width: 5 },
  cardBody:         { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardTop:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardTopLeft:      { flex: 1 },
  cardTopRight:     { alignItems: 'flex-end', gap: 6 },
  cardName:         { fontSize: 16, fontFamily: FONTS.black, marginBottom: 2 },
  cardTime:         { fontSize: 11, fontFamily: FONTS.semiBold },
  cardFare:         { fontSize: 20, fontFamily: FONTS.black },
  chip:             { borderWidth: 1, borderRadius: RADIUS.sm, paddingVertical: 4, paddingHorizontal: 10 },
  chipText:         { fontSize: 10, fontFamily: FONTS.extraBold },
  routeBlock:       { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 4 },
  routeRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dotG:             { width: 9, height: 9, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  dotR:             { width: 9, height: 9, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  routeConnector:   { width: 1.5, height: 10, marginLeft: 4, borderRadius: 1 },
  routeAddr:        { fontSize: 13, fontFamily: FONTS.semiBold, flex: 1, lineHeight: 19 },
  cardFooter:       { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10 },
  footerItem:       { fontSize: 12, fontFamily: FONTS.semiBold },
  footerChevron:    { marginLeft: 'auto', fontSize: 20, lineHeight: 22 },
});
