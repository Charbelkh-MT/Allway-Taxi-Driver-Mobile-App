import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const ORANGE = '#F5A623';

function TripCard({ trip, onAccept, onDismiss, colors, isDark, t }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
      <View style={[styles.accent, { backgroundColor: trip.isPreferred ? colors.yellow : colors.green }]} />
      <View style={styles.body}>

        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {trip.customerFull || trip.customer || '—'}
            </Text>
            {trip.isPreferred && (
              <Text style={[styles.preferred, { color: colors.yellow }]}>⭐ {t('preferredDriver')}</Text>
            )}
          </View>
          <View style={styles.fareWrap}>
            <Text style={[styles.fare, { color: colors.yellow }]}>{trip.fare}</Text>
            {!!trip.dist && (
              <Text style={[styles.dist, { color: colors.textMuted }]}>📍 {trip.dist}</Text>
            )}
          </View>
        </View>

        {/* Route */}
        <View style={[styles.route, { borderTopColor: colors.border }]}>
          <View style={styles.routeRow}>
            <View style={[styles.dotG, { backgroundColor: colors.green }]} />
            <Text style={[styles.routeAddr, { color: colors.textSecondary }]} numberOfLines={1}>{trip.pickup}</Text>
          </View>
          <View style={[styles.routeConnector, { backgroundColor: colors.border }]} />
          <View style={styles.routeRow}>
            <View style={[styles.dotR, { backgroundColor: colors.red }]} />
            <Text style={[styles.routeAddr, { color: colors.textSecondary }]} numberOfLines={1}>{trip.dropoff}</Text>
          </View>
        </View>

        {/* Badges */}
        {(trip.passengerCount > 1 || trip.allowDebt) && (
          <View style={styles.badges}>
            {trip.passengerCount > 1 && (
              <View style={[styles.badge, { backgroundColor: `${colors.yellow}15`, borderColor: `${colors.yellow}35` }]}>
                <Text style={[styles.badgeText, { color: colors.yellow }]}>👥 {trip.passengerCount} {t('passengers')}</Text>
              </View>
            )}
            {trip.allowDebt && (
              <View style={[styles.badge, { backgroundColor: `${colors.red}15`, borderColor: `${colors.red}35` }]}>
                <Text style={[styles.badgeText, { color: colors.red }]}>📋 {t('creditAccount')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {!!trip.notes && (
          <View style={[styles.notes, { backgroundColor: `${ORANGE}10`, borderColor: `${ORANGE}30` }]}>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>📋 {trip.notes}</Text>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => Alert.alert(
              t('declineTripQ'),
              t('declineTripConfirm'),
              [
                { text: t('cancel'), style: 'cancel' },
                { text: t('decline'), style: 'destructive', onPress: async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onDismiss(trip.id);
                }},
              ]
            )}
            style={[styles.declineBtn, { backgroundColor: colors.redFaint, borderColor: `${colors.red}30` }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.declineBtnText, { color: colors.red }]}>✕  {t('decline')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Alert.alert(
              t('acceptTripQ'),
              `${trip.pickup} → ${trip.dropoff}  ·  ${trip.fare}`,
              [
                { text: t('cancel'), style: 'cancel' },
                { text: t('accept'), onPress: async () => {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onAccept(trip);
                }},
              ]
            )}
            style={styles.acceptWrap}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.yellow, colors.yellowDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.acceptBtn}
            >
              <Text style={styles.acceptBtnText}>{t('acceptTrip')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

export default function AvailableTripsInline({ trips, onAccept, onDismiss }) {
  const { colors, isDark } = useTheme();
  const { t }              = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!trips?.length) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.heading, { color: colors.green }]}>
            {trips.length} {trips.length === 1 ? t('tripAvailable') : t('tripsAvailable')}
          </Text>
        </View>
        {trips.length > 1 && (
          <Text style={[styles.counter, { color: colors.textDisabled }]}>
            {currentIndex + 1} / {trips.length}
          </Text>
        )}
      </View>

      {/* Full-width carousel */}
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
            <TripCard
              trip={item}
              onAccept={onAccept}
              onDismiss={onDismiss}
              colors={colors}
              isDark={isDark}
              t={t}
            />
          </View>
        )}
      />

      {/* Pagination dots */}
      {trips.length > 1 && (
        <View style={styles.dots}>
          {trips.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dotIndicator,
                { backgroundColor: i === currentIndex ? colors.green : colors.border,
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

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot:    { width: 8, height: 8, borderRadius: 4 },
  heading:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2, textTransform: 'uppercase' },
  counter:    { fontSize: 11, fontFamily: FONTS.semiBold },

  page: { width: SCREEN_W, paddingHorizontal: 18 },

  dots:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  dotIndicator: { height: 7, borderRadius: 4 },

  // Card — same structure as TripRow / UpcomingTrips
  shadow:  { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  card:    { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  accent:  { width: 5 },
  body:    { flex: 1, padding: 14, gap: 10 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  name:      { fontSize: 16, fontFamily: FONTS.black, marginBottom: 2 },
  preferred: { fontSize: 10, fontFamily: FONTS.extraBold },
  fareWrap:  { alignItems: 'flex-end', gap: 3 },
  fare:      { fontSize: 22, fontFamily: FONTS.black },
  dist:      { fontSize: 11, fontFamily: FONTS.semiBold },

  route:          { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 4 },
  routeRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dotG:           { width: 9, height: 9, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  dotR:           { width: 9, height: 9, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  routeConnector: { width: 1.5, height: 10, marginLeft: 4, borderRadius: 1 },
  routeAddr:      { fontSize: 13, fontFamily: FONTS.semiBold, flex: 1, lineHeight: 19 },

  badges:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge:     { borderWidth: 1, borderRadius: RADIUS.full, paddingVertical: 4, paddingHorizontal: 12 },
  badgeText: { fontSize: 11, fontFamily: FONTS.extraBold },

  notes:     { borderWidth: 1, borderRadius: RADIUS.md, padding: 10 },
  notesText: { fontSize: 12, fontFamily: FONTS.semiBold, lineHeight: 18 },

  actions:       { flexDirection: 'row', gap: 10 },
  declineBtn:    { paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1, borderRadius: RADIUS.lg, alignItems: 'center' },
  declineBtnText:{ fontSize: 13, fontFamily: FONTS.extraBold },
  acceptWrap:    { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
  acceptBtn:     { paddingVertical: 13, alignItems: 'center' },
  acceptBtnText: { fontSize: 14, fontFamily: FONTS.black, color: '#000' },
});
