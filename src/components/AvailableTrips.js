import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

export default function AvailableTrips({ trips, onAccept }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.dot, { backgroundColor: colors.yellow }]} />
        <Text style={[styles.heading, { color: colors.yellow }]}>{t('availableRequests')} ({trips.length})</Text>
      </View>
      <View style={styles.list}>
        {trips.map(trip => <TripOffer key={trip.id} trip={trip} onAccept={onAccept} colors={colors} />)}
      </View>
    </View>
  );
}

function TripOffer({ trip, onAccept, colors }) {
  const { t, isRTL } = useLanguage();
  return (
    <View style={[styles.card, { backgroundColor: colors.yellowFaint, borderColor: 'rgba(245,184,0,0.22)', borderTopColor: 'rgba(245,184,0,0.4)' }]}>
      <View style={styles.cardTop}>
        <View style={styles.route}>
          <Text style={[styles.routeLabel, { color: colors.textMuted }]}>{t('pickup')}</Text>
          <Text style={[styles.routeText,  { color: colors.textPrimary }]} numberOfLines={1}>{trip.pickup}</Text>
          <Text style={[styles.routeLabel, { color: colors.textMuted, marginTop: 10 }]}>{t('dropoff')}</Text>
          <Text style={[styles.routeTextMuted, { color: colors.textSecondary }]} numberOfLines={1}>{trip.dropoff}</Text>
        </View>
        <View style={styles.fareCol}>
          <Text style={[styles.fare, { color: colors.yellow }]}>{trip.fare}</Text>
          <Text style={[styles.dist, { color: colors.textMuted }]}>{trip.dist}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onAccept(trip); }}
        activeOpacity={0.85}
        style={styles.acceptWrap}
      >
        <LinearGradient colors={[colors.yellow, colors.yellowDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptBtn}>
          <Text style={styles.acceptText}>{t('acceptTrip')}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { paddingHorizontal: 18, paddingTop: 18 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  dot:          { width: 6, height: 6, borderRadius: 3 },
  heading:      { fontSize: 11, fontFamily: FONTS.extraBold, letterSpacing: 0.8 },
  list:         { gap: 12 },
  card:         { borderWidth: 1, borderTopWidth: 2, borderRadius: RADIUS.xl, padding: 16, paddingBottom: 14 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  route:        { flex: 1, minWidth: 0 },
  routeLabel:   { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 0.8, marginBottom: 4 },
  routeText:    { fontSize: 13, fontFamily: FONTS.bold },
  routeTextMuted:{ fontSize: 13, fontFamily: FONTS.semiBold, marginTop: 3 },
  fareCol:      { alignItems: 'flex-end', flexShrink: 0 },
  fare:         { fontSize: 20, fontFamily: FONTS.black },
  dist:         { fontSize: 10, fontFamily: FONTS.bold, marginTop: 3 },
  acceptWrap:   { borderRadius: RADIUS.lg, overflow: 'hidden' },
  acceptBtn:    { paddingVertical: 14, alignItems: 'center' },
  acceptText:   { fontSize: 14, fontFamily: FONTS.black, color: '#000' },
});
