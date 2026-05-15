import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';
import { timeUntil, formatScheduledTime } from '../utils/dateUtils';

const { width: SCREEN_W }   = Dimensions.get('window');
const LARGE_GROUP_THRESHOLD = 6;
const ORANGE                = '#F5A623';

function UpcomingCard({ trip, colors, isDark, t, onPress }) {
  const isLargeGroup = (trip.groupSize ?? 0) > LARGE_GROUP_THRESHOLD;
  const accent       = colors.yellow;
  const customerName = trip.customerFull && trip.customerFull !== 'Customer'
    ? trip.customerFull
    : (trip.customer && trip.customer !== 'C.' ? trip.customer : '—');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.cardShadow]}
    >
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>

        {/* Top row — name / time  +  fare / chip */}
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={[styles.cardName, { color: colors.textPrimary }]}>{customerName}</Text>
            <Text style={[styles.cardTime, { color: colors.yellow }]}>
              🕐 {formatScheduledTime(trip.scheduledFor)}
            </Text>
          </View>
          <View style={styles.cardTopRight}>
            <Text style={[styles.cardFare, { color: accent }]}>{trip.fare || '—'}</Text>
            <View style={[styles.chip, { backgroundColor: `${accent}15`, borderColor: `${accent}30` }]}>
              <Text style={[styles.chipText, { color: accent }]}>🕐 {t('filterScheduled')}</Text>
            </View>
          </View>
        </View>

        {/* Route */}
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

        {/* Footer — countdown + dist + chevron */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={[styles.countdownChip, { backgroundColor: `${accent}15`, borderColor: `${accent}30` }]}>
            <Text style={[styles.countdownText, { color: accent }]}>{timeUntil(trip.scheduledFor)}</Text>
          </View>
          {!!trip.dist && (
            <Text style={[styles.footerItem, { color: colors.textMuted }]}>📍 {trip.dist}</Text>
          )}
          {isLargeGroup && (
            <Text style={[styles.footerItem, { color: ORANGE }]}>👥 {trip.groupSize}</Text>
          )}
          <Text style={[styles.footerChevron, { color: colors.textDisabled }]}>›</Text>
        </View>

      </View>
    </TouchableOpacity>
  );
}

export default function UpcomingTrips({ trips, onPressTrip }) {
  const { colors, isDark } = useTheme();
  const { t }              = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setTick]        = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (!trips?.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.textMuted }]}>{t('upcomingTrips')}</Text>
        {trips.length > 1 && (
          <Text style={[styles.counter, { color: colors.textDisabled }]}>
            {currentIndex + 1} / {trips.length}
          </Text>
        )}
      </View>

      <FlatList
        data={trips}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setCurrentIndex(Math.min(Math.max(idx, 0), trips.length - 1));
        }}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <UpcomingCard
              trip={item}
              colors={colors}
              isDark={isDark}
              t={t}
              onPress={() => onPressTrip?.(item)}
            />
          </View>
        )}
      />

      {trips.length > 1 && (
        <View style={styles.dots}>
          {trips.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dotIndicator,
                { backgroundColor: i === currentIndex ? colors.yellow : colors.border,
                  width: i === currentIndex ? 18 : 7 },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 18 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 12 },
  heading:   { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2, textTransform: 'uppercase' },
  counter:   { fontSize: 11, fontFamily: FONTS.semiBold },
  page:      { width: SCREEN_W, paddingHorizontal: 18 },
  dots:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  dotIndicator: { height: 7, borderRadius: 4 },

  // Card — identical structure to TripRow in TripsScreen
  cardShadow:   { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  card:         { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  cardAccent:   { width: 5 },
  cardBody:     { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardTopLeft:  { flex: 1 },
  cardTopRight: { alignItems: 'flex-end', gap: 6 },
  cardName:     { fontSize: 16, fontFamily: FONTS.black, marginBottom: 2 },
  cardTime:     { fontSize: 11, fontFamily: FONTS.semiBold },
  cardFare:     { fontSize: 20, fontFamily: FONTS.black },
  chip:         { borderWidth: 1, borderRadius: RADIUS.sm, paddingVertical: 4, paddingHorizontal: 10 },
  chipText:     { fontSize: 10, fontFamily: FONTS.extraBold },

  routeBlock:     { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 4 },
  routeRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dotG:           { width: 9, height: 9, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  dotR:           { width: 9, height: 9, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  routeConnector: { width: 1.5, height: 10, marginLeft: 4, borderRadius: 1 },
  routeAddr:      { fontSize: 13, fontFamily: FONTS.semiBold, flex: 1, lineHeight: 19 },

  cardFooter:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10 },
  countdownChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingVertical: 3, paddingHorizontal: 10 },
  countdownText: { fontSize: 11, fontFamily: FONTS.extraBold },
  footerItem:    { fontSize: 12, fontFamily: FONTS.semiBold },
  footerChevron: { marginLeft: 'auto', fontSize: 20, lineHeight: 22 },
});
