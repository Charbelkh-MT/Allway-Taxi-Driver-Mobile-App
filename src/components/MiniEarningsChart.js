import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { FONTS, RADIUS } from '../theme';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function MiniEarningsChart({ earned = 0, trips = 0, bars = [0,0,0,0,0,0,0], todayIndex = 0, empty = false }) {
  const { colors, isDark } = useTheme();
  const displayBars = empty ? [0,0,0,0,0,0,0] : bars;
  const maxBar      = Math.max(...displayBars, 1);
  const hasData     = !empty && trips > 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.cardShadow]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>THIS WEEK</Text>
          <Text style={[styles.amount, { color: hasData ? colors.yellow : colors.textMuted }]}>
            {hasData ? `$${Number(earned).toFixed(0)}` : '—'}
          </Text>
        </View>
        <View style={[styles.tripsBadge, { backgroundColor: colors.bgCardStrong, borderColor: colors.border }]}>
          <Text style={[styles.tripsText, { color: hasData ? colors.textPrimary : colors.textMuted }]}>
            {hasData ? `${trips} trips` : '0 trips'}
          </Text>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.chart}>
        {displayBars.map((h, i) => {
          const isToday = !empty && i === todayIndex;
          const barH    = empty ? 4 : Math.max((h / maxBar) * 60, 4);
          const barBg   = isToday ? colors.yellow : h > 0 ? colors.yellowFaint : colors.border;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                {isToday && h > 0 ? (
                  <LinearGradient
                    colors={[colors.yellow, colors.yellowDark]}
                    style={[styles.bar, { height: barH }]}
                  />
                ) : (
                  <View style={[styles.bar, { height: barH, backgroundColor: barBg }]} />
                )}
              </View>
              <Text style={[styles.dayLabel, { color: isToday ? colors.yellow : colors.textMuted, fontFamily: isToday ? FONTS.extraBold : FONTS.bold }]}>
                {DAY_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default memo(MiniEarningsChart);

const styles = StyleSheet.create({
  card:         { marginHorizontal: 18, marginTop: 18, borderWidth: 1, borderRadius: RADIUS.xxl, padding: 20 },
  cardShadow:   { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  weekLabel:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  amount:       { fontSize: 28, fontFamily: FONTS.black },
  tripsBadge:   { borderRadius: RADIUS.full, borderWidth: 1, paddingVertical: 5, paddingHorizontal: 12, marginTop: 4 },
  tripsText:    { fontSize: 12, fontFamily: FONTS.bold },
  chart:        { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 },
  barCol:       { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  barTrack:     { flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar:          { width: '100%', borderRadius: 4 },
  dayLabel:     { fontSize: 9 },
});
