import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';
import { formatTime } from '../utils/dateUtils';

function BigStat({ value, label, color, large = false }) {
  const { colors } = useTheme();
  return (
    <View style={bigStatStyles.wrap}>
      <Text style={[bigStatStyles.value, large && bigStatStyles.valueLarge, { color }]}>{value}</Text>
      <Text style={[bigStatStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const bigStatStyles = StyleSheet.create({
  wrap:       { flex: 1, alignItems: 'center', gap: 6 },
  value:      { fontSize: 34, fontFamily: FONTS.black, lineHeight: 38 },
  valueLarge: { fontSize: 40, lineHeight: 44 },
  label:      { fontSize: 11, fontFamily: FONTS.extraBold, letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center' },
});

export default function ShiftSummaryModal({ visible, summary, loading, shiftSeconds, onConfirmEnd, onResume }) {
  const { colors, isDark } = useTheme();
  const { t, isRTL }       = useLanguage();
  const insets             = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(700)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(700);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  async function handleConfirm() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 700, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => onConfirmEnd(summary));
  }

  async function handleResume() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 700, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(onResume);
  }

  const s = summary ?? {};

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={handleResume}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleResume} activeOpacity={1} />

        <Animated.View style={[
          styles.sheet,
          { backgroundColor: colors.bg, paddingBottom: insets.bottom + 20 },
          { transform: [{ translateY: slideAnim }] },
        ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{t('shiftSummaryTitle')}</Text>
              <Text style={[styles.titleSub, { color: colors.textMuted }]}>
                {formatTime(shiftSeconds ?? 0)} {t('shiftDuration').toLowerCase()}
              </Text>
            </View>
            <TouchableOpacity onPress={handleResume} style={[styles.resumeChip, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}40` }]}>
              <Text style={[styles.resumeChipText, { color: colors.green }]}>{t('continueWorking')}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.yellow} size="large" />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('shiftSummaryLoading')}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

              {/* 3 big numbers */}
              <View style={[styles.bigRow, { borderColor: colors.border }]}>
                <BigStat
                  value={String(s.tripsCompleted ?? 0)}
                  label={t('tripsCompleted')}
                  color={colors.green}
                  large
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <BigStat
                  value={`$${(s.totalEarned ?? 0).toFixed(0)}`}
                  label={t('totalEarned')}
                  color={colors.yellow}
                  large
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <BigStat
                  value={`$${(s.cashUsd ?? 0).toFixed(0)}`}
                  label={t('cashToHandIn')}
                  color={colors.red}
                  large
                />
              </View>

              {/* Secondary stats */}
              {((s.tripsCancelled ?? 0) > 0 || (s.tripsNoShow ?? 0) > 0 || (s.avgFare ?? 0) > 0) && (
                <View style={[styles.secondaryRow, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9F9F9' }]}>
                  {(s.tripsCancelled ?? 0) > 0 && (
                    <View style={styles.secondaryStat}>
                      <Text style={[styles.secondaryVal, { color: colors.textPrimary }]}>{s.tripsCancelled}</Text>
                      <Text style={[styles.secondaryLabel, { color: colors.textMuted }]}>{t('cancelled')}</Text>
                    </View>
                  )}
                  {(s.tripsNoShow ?? 0) > 0 && (
                    <View style={styles.secondaryStat}>
                      <Text style={[styles.secondaryVal, { color: colors.textPrimary }]}>{s.tripsNoShow}</Text>
                      <Text style={[styles.secondaryLabel, { color: colors.textMuted }]}>{t('noShows')}</Text>
                    </View>
                  )}
                  {(s.avgFare ?? 0) > 0 && (
                    <View style={styles.secondaryStat}>
                      <Text style={[styles.secondaryVal, { color: colors.textPrimary }]}>${(s.avgFare ?? 0).toFixed(0)}</Text>
                      <Text style={[styles.secondaryLabel, { color: colors.textMuted }]}>{t('avgFare')}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Most active area */}
              {(s.topAreas ?? []).length > 0 && (
                <View style={[styles.areaCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9F9F9', borderColor: colors.border }]}>
                  <Text style={[styles.areaLabel, { color: colors.textMuted }]}>{t('mostActiveArea')}</Text>
                  <Text style={[styles.areaValue, { color: colors.textPrimary }]}>{s.topAreas[0]}</Text>
                  {s.topAreas.length > 1 && (
                    <Text style={[styles.areaOthers, { color: colors.textDisabled }]}>
                      {s.topAreas.slice(1).join('  ·  ')}
                    </Text>
                  )}
                </View>
              )}

              {/* Buttons */}
              <View style={styles.btnStack}>
                <TouchableOpacity onPress={handleConfirm} activeOpacity={0.85} style={styles.endWrap}>
                  <LinearGradient
                    colors={['#F09595', '#E07070']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.endBtn}
                  >
                    <Text style={styles.endBtnText}>{t('endShiftSendReport')}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResume} activeOpacity={0.75}
                  style={[styles.resumeBtn, { borderColor: colors.green, backgroundColor: `${colors.green}12` }]}>
                  <Text style={[styles.resumeBtnText, { color: colors.green }]}>{t('continueWorking')}</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet:         { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 14, paddingHorizontal: 22, maxHeight: '88%' },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

  header:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  title:         { fontSize: 26, fontFamily: FONTS.black },
  titleSub:      { fontSize: 13, fontFamily: FONTS.semiBold, marginTop: 4 },
  resumeChip:    { borderWidth: 1, borderRadius: RADIUS.full, paddingVertical: 8, paddingHorizontal: 14, marginTop: 4 },
  resumeChipText:{ fontSize: 12, fontFamily: FONTS.extraBold },

  loadingWrap:   { alignItems: 'center', paddingVertical: 48, gap: 16 },
  loadingText:   { fontSize: 13, fontFamily: FONTS.semiBold },

  bigRow:        { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 28, paddingHorizontal: 12, marginBottom: 14 },
  divider:       { width: 1, marginVertical: 4 },

  secondaryRow:  { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 18, paddingHorizontal: 12, marginBottom: 14, gap: 4 },
  secondaryStat: { flex: 1, alignItems: 'center', gap: 4 },
  secondaryVal:  { fontSize: 22, fontFamily: FONTS.black },
  secondaryLabel:{ fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' },

  areaCard:      { borderWidth: 1, borderRadius: RADIUS.xl, padding: 18, marginBottom: 22, gap: 4 },
  areaLabel:     { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1, textTransform: 'uppercase' },
  areaValue:     { fontSize: 20, fontFamily: FONTS.black },
  areaOthers:    { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 2 },

  btnStack:      { gap: 12, paddingBottom: 8 },
  endWrap:       { borderRadius: RADIUS.xl, overflow: 'hidden' },
  endBtn:        { paddingVertical: 18, alignItems: 'center' },
  endBtnText:    { fontSize: 16, fontFamily: FONTS.black, color: '#fff' },
  resumeBtn:     { borderWidth: 1.5, borderRadius: RADIUS.xl, paddingVertical: 17, alignItems: 'center' },
  resumeBtnText: { fontSize: 15, fontFamily: FONTS.extraBold },
});
