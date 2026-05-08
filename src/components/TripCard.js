import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FONTS, RADIUS } from '../theme';

const STATUS = {
  completed:   { label: 'DONE',        accentKey: 'green'  },
  dispatching: { label: 'DISPATCHING', accentKey: 'yellow' },
  cancelled:   { label: 'CANCELLED',   accentKey: 'red'    },
};

export default function TripCard({ trip }) {
  const { colors } = useTheme();
  const s        = STATUS[trip.status] || STATUS.completed;
  const accent   = colors[s.accentKey];
  const initials = (trip.name ?? 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.top}>
        <View style={styles.left}>
          <View style={[styles.avatar, { backgroundColor: `${colors.yellow}18`, borderColor: `${colors.yellow}25` }]}>
            <Text style={[styles.avatarText, { color: colors.yellow }]}>{initials}</Text>
          </View>
          <View>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{trip.name}</Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>{trip.time}</Text>
          </View>
        </View>
        <View style={styles.right}>
          {!!trip.fare && <Text style={[styles.fare, { color: colors.yellow }]}>{trip.fare}</Text>}
          {trip.rideType === 'xl' && (
            <View style={[styles.chip, { backgroundColor: `${colors.yellow}15`, borderColor: `${colors.yellow}30` }]}>
              <Text style={[styles.chipText, { color: colors.yellow }]}>XL</Text>
            </View>
          )}
          <View style={[styles.chip, { backgroundColor: `${accent}15`, borderColor: `${accent}30` }]}>
            <Text style={[styles.chipText, { color: accent }]}>{s.label}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.route}>
        <View style={styles.routeIcons}>
          <View style={[styles.dotG, { backgroundColor: colors.green }]} />
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <View style={[styles.dotR, { backgroundColor: colors.red }]} />
        </View>
        <View style={styles.routeTexts}>
          <Text style={[styles.routeText, { color: colors.textSecondary }]} numberOfLines={1}>{trip.pickup}</Text>
          <Text style={[styles.routeText, { color: colors.textSecondary, marginTop: 8 }]} numberOfLines={1}>{trip.dropoff}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:       { borderWidth: 1, borderRadius: RADIUS.xl, padding: 16 },
  top:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  left:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 12, fontFamily: FONTS.extraBold },
  name:       { fontSize: 14, fontFamily: FONTS.bold },
  time:       { fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 2 },
  right:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fare:       { fontSize: 15, fontFamily: FONTS.black },
  chip:       { borderWidth: 1, borderRadius: RADIUS.sm, paddingVertical: 3, paddingHorizontal: 8 },
  chipText:   { fontSize: 9, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },
  divider:    { height: 1, marginBottom: 12 },
  route:      { flexDirection: 'row', gap: 12 },
  routeIcons: { alignItems: 'center', paddingTop: 2, flexShrink: 0 },
  dotG:       { width: 7, height: 7, borderRadius: 4 },
  routeLine:  { width: 1.5, height: 14, marginVertical: 4 },
  dotR:       { width: 7, height: 7, borderRadius: 4 },
  routeTexts: { flex: 1 },
  routeText:  { fontSize: 12, fontFamily: FONTS.semiBold },
});
