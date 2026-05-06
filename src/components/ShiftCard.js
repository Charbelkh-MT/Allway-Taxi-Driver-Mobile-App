import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

export default function ShiftCard({ online, onToggle, shiftTime, disabled }) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (online && !disabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [online, disabled]);

  function handlePress() {
    if (disabled) return;
    Alert.alert(
      online ? t('endShiftQ') : t('startShiftQ'),
      online
        ? t('endShiftConfirm')
        : t('startShiftConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: online ? t('endShift') : t('startShift'),
          style: online ? 'destructive' : 'default',
          onPress: async () => {
            await Haptics.impactAsync(online ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy);
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 0.94, duration: 90, useNativeDriver: true }),
              Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
            ]).start();
            onToggle();
          },
        },
      ]
    );
  }

  if (online) {
    return (
      <View style={styles.wrapper}>
        <LinearGradient
          colors={isDark ? ['rgba(18,42,30,0.98)', 'rgba(10,28,20,0.98)'] : ['rgba(220,255,240,0.98)', 'rgba(200,245,225,0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, styles.cardOnline, { borderColor: isDark ? 'rgba(93,202,165,0.25)' : 'rgba(93,202,165,0.4)' }]}
        >
          {/* Status row */}
          <View style={[styles.onlineTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: colors.green }]} />
              <Text style={[styles.statusLabel, { color: colors.green }]}>{t('onShiftBadge')}</Text>
            </View>
            <Text style={[styles.gpsTag, { color: colors.green, borderColor: `${colors.green}40` }]}>
              📡 {t('gpsLive')}
            </Text>
          </View>

          {/* Timer */}
          <Text style={[styles.timer, { color: isDark ? colors.textPrimary : '#1a5c40' }]}>{shiftTime}</Text>
          <Text style={[styles.timerLabel, { color: isDark ? colors.textSecondary : 'rgba(0,80,50,0.65)' }]}>{t('shiftDuration')}</Text>

          {/* Stop button */}
          <Animated.View style={[styles.stopWrap, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
              onPress={handlePress}
              disabled={disabled}
              activeOpacity={0.85}
              style={[styles.stopBtn, { borderColor: disabled ? colors.border : 'rgba(93,202,165,0.5)', opacity: disabled ? 0.4 : 1 }]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.green} strokeWidth="2.2" strokeLinecap="round">
                <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <Line x1="12" y1="2" x2="12" y2="12" />
              </Svg>
              <Text style={[styles.stopLabel, { color: colors.green }]}>{t('endShift')}</Text>
            </TouchableOpacity>
          </Animated.View>

          {disabled && (
            <Text style={[styles.disabledHint, { color: colors.textMuted }]}>{t('completeTripFirst')}</Text>
          )}
        </LinearGradient>
      </View>
    );
  }

  // OFFLINE — full-width hero CTA
  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, styles.cardOffline, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.offlineLeft}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.textDisabled }]} />
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>{t('offlineBadge')}</Text>
          </View>
          <Text style={[styles.offlineTitle, { color: colors.textPrimary }]}>{t('readyToDrive')}</Text>
          <Text style={[styles.offlineHint, { color: colors.textMuted }]}>{t('tapToStart')}</Text>
        </View>

        {/* Animated pulse + button */}
        <View style={styles.btnArea}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], borderColor: `${colors.yellow}30` }]} />
          <Animated.View style={[styles.pulseRing2, { transform: [{ scale: pulseAnim }], borderColor: `${colors.yellow}15` }]} />
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.startBtnWrap}>
              <LinearGradient
                colors={[colors.yellow, colors.yellowDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startBtn}
              >
                <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                  <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <Line x1="12" y1="2" x2="12" y2="12" />
                </Svg>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const BTN = 76;

const styles = StyleSheet.create({
  wrapper:      { marginHorizontal: 18, marginTop: 4 },

  card:         { borderRadius: RADIUS.xxl, borderWidth: 1, overflow: 'hidden', padding: 22 },
  cardOnline:   { borderColor: 'rgba(93,202,165,0.25)' },
  cardOffline:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Online
  onlineTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  timer:        { fontSize: 44, fontFamily: FONTS.black, fontVariant: ['tabular-nums'], letterSpacing: 3 },
  timerLabel:   { fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 2, marginBottom: 20 },
  stopWrap:     { alignSelf: 'flex-start' },
  stopBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: RADIUS.full, borderWidth: 1.5 },
  stopLabel:    { fontSize: 13, fontFamily: FONTS.extraBold },
  gpsTag:       { fontSize: 10, fontFamily: FONTS.bold, paddingVertical: 4, paddingHorizontal: 10, borderRadius: RADIUS.full, borderWidth: 1 },

  // Offline
  offlineLeft:  { flex: 1 },
  offlineTitle: { fontSize: 28, fontFamily: FONTS.black, lineHeight: 34, marginTop: 10, marginBottom: 8 },
  offlineHint:  { fontSize: 12, fontFamily: FONTS.semiBold },

  // Button area
  btnArea:      { alignItems: 'center', justifyContent: 'center', width: BTN + 48 },
  pulseRing:    { position: 'absolute', width: BTN + 28, height: BTN + 28, borderRadius: (BTN + 28) / 2, borderWidth: 2 },
  pulseRing2:   { position: 'absolute', width: BTN + 46, height: BTN + 46, borderRadius: (BTN + 46) / 2, borderWidth: 1.5 },
  startBtnWrap: { width: BTN, height: BTN, borderRadius: BTN / 2, overflow: 'hidden', elevation: 8, shadowColor: '#F5B800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
  startBtn:     { width: BTN, height: BTN, alignItems: 'center', justifyContent: 'center' },

  // Shared
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:    { width: 7, height: 7, borderRadius: 4 },
  statusLabel:  { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.5, textTransform: 'uppercase' },
  disabledHint: { fontSize: 10, fontFamily: FONTS.bold, marginTop: 12 },
});
