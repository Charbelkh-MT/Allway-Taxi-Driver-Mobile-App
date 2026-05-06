import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { RADIUS } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Shared animation ref so all skeletons pulse in sync
let sharedAnim = null;
let listenerCount = 0;

function getSharedAnim() {
  if (!sharedAnim) {
    sharedAnim = new Animated.Value(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(sharedAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(sharedAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }
  return sharedAnim;
}

// Base skeleton block — pulsing opacity between dim and brighter
export function SkeletonBox({ width, height, radius, style }) {
  const { isDark } = useTheme();
  const anim    = getSharedAnim();
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  const bg      = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  return (
    <Animated.View
      style={[
        { backgroundColor: bg, width, height, borderRadius: radius ?? RADIUS.md, opacity },
        style,
      ]}
    />
  );
}

// Thin line skeleton (for text)
export function SkeletonLine({ width = '100%', height = 12, style }) {
  return <SkeletonBox width={width} height={height} radius={6} style={style} />;
}

// ── Preset skeletons ────────────────────────────────────────────────────────

// Matches the 3-column stats row on TripsScreen / AccountScreen
export function SkeletonStatRow() {
  const { isDark } = useTheme();
  const cardBg    = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder= isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  return (
    <View style={presets.statRow}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[presets.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SkeletonBox width={44} height={24} radius={6} style={{ marginBottom: 8 }} />
          <SkeletonLine width={48} height={9} />
        </View>
      ))}
    </View>
  );
}

// Matches a TripCard
export function SkeletonTripCard() {
  const { isDark } = useTheme();
  const cardBg    = isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF';
  const cardBorder= isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  return (
    <View style={[presets.tripCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={presets.tripCardTop}>
        <View style={presets.tripCardLeft}>
          <SkeletonBox width={32} height={32} radius={10} style={{ marginRight: 10 }} />
          <View>
            <SkeletonLine width={110} height={12} style={{ marginBottom: 6 }} />
            <SkeletonLine width={70} height={9} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <SkeletonLine width={40} height={13} />
          <SkeletonBox width={64} height={18} radius={6} />
        </View>
      </View>
      <View style={presets.tripCardRoute}>
        <SkeletonLine width={160} height={10} style={{ marginBottom: 8 }} />
        <SkeletonLine width={130} height={10} />
      </View>
    </View>
  );
}

// Matches the 3-column earnings breakdown
export function SkeletonEarningsRow() {
  const { isDark } = useTheme();
  const cardBg    = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder= isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  return (
    <View style={presets.statRow}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[presets.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SkeletonBox width={52} height={22} radius={6} style={{ marginBottom: 8 }} />
          <SkeletonLine width={36} height={9} style={{ marginBottom: 4 }} />
          <SkeletonLine width={48} height={8} />
        </View>
      ))}
    </View>
  );
}

// Matches the MiniEarningsChart
export function SkeletonChart() {
  const { isDark } = useTheme();
  const bg     = isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  return (
    <View style={[presets.chart, { backgroundColor: bg, borderColor: border }]}>
      <View style={presets.chartHeader}>
        <View>
          <SkeletonLine width={70} height={9} style={{ marginBottom: 8 }} />
          <SkeletonLine width={90} height={22} />
        </View>
        <SkeletonLine width={55} height={12} />
      </View>
      <View style={presets.chartBars}>
        {[0.4, 0.7, 0.5, 1, 0.3, 0.1, 0.1].map((h, i) => (
          <View key={i} style={presets.barCol}>
            <SkeletonBox width={18} height={Math.max(h * 48, 4)} radius={3} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Profile card skeleton for AccountScreen
export function SkeletonProfileCard() {
  const { isDark } = useTheme();
  const bg = isDark ? 'rgba(245,184,0,0.06)' : 'rgba(245,184,0,0.08)';
  return (
    <View style={[presets.profileCard, { backgroundColor: bg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <SkeletonBox width={64} height={64} radius={18} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonLine width={140} height={16} />
          <SkeletonLine width={100} height={11} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <SkeletonBox width={60} height={22} radius={7} />
            <SkeletonBox width={70} height={22} radius={7} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});

const presets = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tripCard: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tripCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tripCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripCardRoute: {
    gap: 4,
  },
  chart: {
    marginHorizontal: 18,
    marginTop: 18,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 48,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  profileCard: {
    borderWidth: 1,
    borderColor: 'rgba(245,184,0,0.15)',
    borderRadius: RADIUS.xxl,
    padding: 22,
    marginBottom: 20,
  },
});
