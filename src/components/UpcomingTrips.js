import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';
import { timeUntil, formatScheduledTime } from '../utils/dateUtils';

const LARGE_GROUP_THRESHOLD = 6;
const ORANGE = '#F5A623';

function UpcomingCard({ trip, colors, isDark, t }) {
  const isLargeGroup = (trip.groupSize ?? 0) > LARGE_GROUP_THRESHOLD;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
      <View style={[styles.cardAccent, { backgroundColor: colors.yellow }]} />
      <View style={styles.cardBody}>

        {/* Time + countdown */}
        <View style={styles.timeRow}>
          <Text style={[styles.scheduledTime, { color: colors.textPrimary }]}>
            {formatScheduledTime(trip.scheduledFor)}
          </Text>
          <View style={[styles.countdownChip, { backgroundColor: `${colors.yellow}18`, borderColor: `${colors.yellow}40` }]}>
            <Text style={[styles.countdownText, { color: colors.yellow }]}>
              {timeUntil(trip.scheduledFor)}
            </Text>
          </View>
        </View>

        {/* Route */}
        <View style={[styles.routeBlock, { borderTopColor: colors.border }]}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: colors.green }]} />
            <Text style={[styles.routeAddr, { color: colors.textSecondary }]} numberOfLines={1}>{trip.pickup}</Text>
          </View>
          <View style={[styles.routeConnector, { backgroundColor: colors.border }]} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: colors.red }]} />
            <Text style={[styles.routeAddr, { color: colors.textSecondary }]} numberOfLines={1}>{trip.dropoff}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.customer, { color: colors.textMuted }]}>👤  {trip.customerFull || trip.customer}</Text>
          <Text style={[styles.fare, { color: colors.yellow }]}>{trip.fare}</Text>
        </View>

        {/* Large group badge */}
        {isLargeGroup && (
          <View style={[styles.badge, { backgroundColor: `${ORANGE}15`, borderColor: `${ORANGE}40` }]}>
            <Text style={[styles.badgeText, { color: ORANGE }]}>
              👥  {t('largeGroup')} — {trip.groupSize} {t('people')}
            </Text>
          </View>
        )}

        {/* Dispatcher notes */}
        {!!trip.notes && (
          <View style={[styles.notes, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5', borderColor: colors.border }]}>
            <Text style={[styles.notesLabel, { color: colors.textMuted }]}>📋  {t('dispatcherNotes')}</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{trip.notes}</Text>
          </View>
        )}

      </View>
    </View>
  );
}

export default function UpcomingTrips({ trips }) {
  const { colors, isDark } = useTheme();
  const { t }              = useLanguage();
  const [, setTick]        = useState(0);

  // Refresh countdowns every minute
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (!trips?.length) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: colors.textMuted }]}>{t('upcomingTrips')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {trips.map(trip => (
          <UpcomingCard
            key={trip.id}
            trip={trip}
            colors={colors}
            isDark={isDark}
            t={t}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_W = 300;

const styles = StyleSheet.create({
  container: { paddingTop: 18 },
  heading:   { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 18 },
  scroll:    { paddingHorizontal: 18, gap: 12 },

  card:       { width: CARD_W, flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  shadow:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: 14, gap: 10 },

  timeRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduledTime: { fontSize: 15, fontFamily: FONTS.black, flex: 1, marginRight: 8 },
  countdownChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingVertical: 4, paddingHorizontal: 10 },
  countdownText: { fontSize: 11, fontFamily: FONTS.extraBold },

  routeBlock:     { borderTopWidth: 1, paddingTop: 10, gap: 4 },
  routeRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:            { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeConnector: { width: 1, height: 8, marginLeft: 4 },
  routeAddr:      { fontSize: 12, fontFamily: FONTS.semiBold, flex: 1 },

  footer:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10 },
  customer: { fontSize: 12, fontFamily: FONTS.semiBold, flex: 1 },
  fare:     { fontSize: 18, fontFamily: FONTS.black },

  badge:     { borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 6, paddingHorizontal: 10 },
  badgeText: { fontSize: 12, fontFamily: FONTS.extraBold },

  notes:      { borderWidth: 1, borderRadius: RADIUS.md, padding: 10, gap: 4 },
  notesLabel: { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },
  notesText:  { fontSize: 12, fontFamily: FONTS.semiBold, lineHeight: 18 },
});
