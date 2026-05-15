import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Platform, Animated, AppState } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

async function checkNetwork() {
  try {
    const res = await fetch('https://www.google.com', { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export default function AppHeader({ online }) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!online) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [online]);

  // Check network on mount and whenever the app comes to foreground
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const ok = await checkNetwork();
      if (!cancelled) setIsOffline(!ok);
    };
    run();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') run();
    });
    return () => { cancelled = true; sub.remove(); };
  }, []);

  const content = (
    <View style={[styles.inner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={styles.logoWrap}>
        <Image
          source={require('../../assets/allway-main-logo.jpg')}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>

      <View style={[
        styles.statusBadge,
        online
          ? { backgroundColor: 'rgba(93,202,165,0.13)', borderColor: 'rgba(93,202,165,0.40)' }
          : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F0F0F0', borderColor: 'transparent' },
      ]}>
        <View style={styles.dotWrap}>
          <Animated.View style={[styles.dotRing, {
            borderColor: online ? 'rgba(93,202,165,0.35)' : 'transparent',
            opacity: online ? pulseAnim : 0,
          }]} />
          <View style={[styles.dot, { backgroundColor: online ? colors.green : colors.textDisabled }]} />
        </View>
        <View style={styles.statusText}>
          <Text style={[styles.statusLabel, { color: online ? colors.green : colors.textMuted }]}>
            {online ? t('onShift') : t('offDuty')}
          </Text>
          <Text style={[styles.statusSub, { color: online ? 'rgba(93,202,165,0.65)' : colors.textDisabled }]}>
            {online ? t('gpsActive') : t('goOnlineToStart')}
          </Text>
        </View>
      </View>
    </View>
  );

  const offlineBanner = isOffline ? (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>⚠  No internet connection — live features unavailable</Text>
    </View>
  ) : null;

  if (Platform.OS === 'ios' && isDark) {
    return (
      <BlurView intensity={85} tint="systemUltraThinMaterialDark" style={{ overflow: 'hidden' }}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(8,8,16,0.4)' }]} pointerEvents="none" />
        {content}
        {offlineBanner}
      </BlurView>
    );
  }

  return (
    <View style={{ backgroundColor: colors.bg }}>
      {content}
      {offlineBanner}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoWrap: { width: 120, height: 48, borderRadius: 10, overflow: 'hidden' },
  logo:     { width: '100%', height: '100%' },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  dotWrap:     { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  dotRing:     { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  statusText:  { gap: 1 },
  statusLabel: { fontSize: 13, fontFamily: FONTS.extraBold },
  statusSub:   { fontSize: 10, fontFamily: FONTS.semiBold },

  offlineBanner: { backgroundColor: '#F5A623', paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
  offlineText:   { fontSize: 11, fontFamily: FONTS.extraBold, color: '#000', letterSpacing: 0.3 },
});
