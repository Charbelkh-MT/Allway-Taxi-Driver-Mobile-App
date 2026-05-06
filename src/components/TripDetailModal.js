import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Animated, Linking, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

const STATUS_CONFIG = {
  pending:   { labelKey: 'statusPending',   color: 'yellow', icon: '⏳' },
  accepted:  { labelKey: 'statusAccepted',  color: 'yellow', icon: '🚕' },
  picked_up: { labelKey: 'statusPickedUp',  color: 'green',  icon: '🟢' },
  completed: { labelKey: 'statusCompleted', color: 'green',  icon: '✓'  },
  no_show:   { labelKey: 'statusNoShow',    color: 'red',    icon: '👻' },
  cancelled: { labelKey: 'statusCancelled', color: 'red',    icon: '✕'  },
};

const PAYMENT_CONFIG = {
  cash: { icon: '💵', label: 'Cash'    },
  card: { icon: '💳', label: 'Card'    },
  debt: { icon: '📋', label: 'Account' },
};

export default function TripDetailModal({ trip, visible, onClose }) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(800)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(800);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 230, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  function close() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 800, duration: 260, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  if (!trip) return null;

  const cfgRaw   = STATUS_CONFIG[trip.status] || STATUS_CONFIG.completed;
  const cfg      = { ...cfgRaw, label: t(cfgRaw.labelKey) };
  const accent   = colors[cfg.color];
  const pay      = PAYMENT_CONFIG[trip.paymentMethod];

  // Context-aware actions based on status
  const isAccepted   = trip.status === 'accepted';
  const isPickedUp   = trip.status === 'picked_up';
  const showCall     = (isAccepted || isPickedUp) && !!trip.phone;
  const showToPickup = isAccepted;
  const showToDropoff = isAccepted || isPickedUp;

  async function callCustomer() {
    if (!trip.phone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `tel:${trip.phone}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert('Phone', trip.phone);
  }

  async function openMaps(address) {
    if (!address) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const q       = encodeURIComponent(address);
    const app     = `comgooglemaps://?q=${q}&directionsmode=driving`;
    const web     = `https://www.google.com/maps/search/?api=1&query=${q}`;
    await Linking.openURL(await Linking.canOpenURL(app) ? app : web);
  }

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />

        <Animated.View style={[
          styles.sheet,
          { backgroundColor: isDark ? '#0e0e0e' : '#f9f9f9', paddingBottom: insets.bottom + 24 },
          { transform: [{ translateY: slideAnim }] },
        ]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />

          {/* Close */}
          <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
            <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces>

            {/* ── Hero ──────────────────────────────────────── */}
            <View style={styles.hero}>
              {/* Status pill */}
              <View style={[styles.statusPill, { backgroundColor: `${accent}20`, borderColor: `${accent}45` }]}>
                <Text style={[styles.statusPillText, { color: accent }]}>{cfg.icon}  {cfg.label}</Text>
              </View>

              {/* Fare */}
              <Text style={[styles.fare, { color: accent }]}>{trip.fare || '—'}</Text>

              {/* Customer + time */}
              <Text style={[styles.heroName, { color: colors.textPrimary }]}>{trip.name}</Text>
              <Text style={[styles.heroTime, { color: colors.textMuted }]}>{trip.time}</Text>

              {/* Info chips — no duplicate time */}
              <View style={styles.chips}>
                {!!trip.dist && (
                  <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.chipText, { color: colors.textSecondary }]}>📍  {trip.dist}</Text>
                  </View>
                )}
                {pay && (
                  <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.chipText, { color: colors.textSecondary }]}>{pay.icon}  {pay.label}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

            <View style={styles.body}>

              {/* ── Route ─────────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                <TouchableOpacity style={styles.addrRow} onPress={() => openMaps(trip.pickup)} activeOpacity={0.7}>
                  <View style={[styles.addrDot, { backgroundColor: colors.green }]} />
                  <View style={styles.addrBody}>
                    <Text style={[styles.addrLabel, { color: colors.textMuted }]}>{t('pickup')}</Text>
                    <Text style={[styles.addrText, { color: colors.textPrimary }]}>{trip.pickup || '—'}</Text>
                  </View>
                  <Text style={[styles.arrow, { color: colors.textDisabled }]}>›</Text>
                </TouchableOpacity>

                <View style={styles.routeConnectorRow}>
                  <View style={[styles.routeConnectorDot]} />
                  <View style={[styles.routeConnectorLine, { backgroundColor: colors.border }]} />
                  <View style={[styles.routeConnectorDot]} />
                </View>

                <TouchableOpacity style={styles.addrRow} onPress={() => openMaps(trip.dropoff)} activeOpacity={0.7}>
                  <View style={[styles.addrDot, { backgroundColor: colors.red }]} />
                  <View style={styles.addrBody}>
                    <Text style={[styles.addrLabel, { color: colors.textMuted }]}>{t('dropoff')}</Text>
                    <Text style={[styles.addrText, { color: colors.textPrimary }]}>{trip.dropoff || '—'}</Text>
                  </View>
                  <Text style={[styles.arrow, { color: colors.textDisabled }]}>›</Text>
                </TouchableOpacity>
              </View>

              {/* ── Customer ──────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                <View style={styles.customerRow}>
                  <View style={[styles.avatar, { backgroundColor: `${accent}22` }]}>
                    <Text style={[styles.avatarText, { color: accent }]}>
                      {(trip.name ?? 'P')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: colors.textPrimary }]}>{trip.name}</Text>
                    {!!trip.phone && (
                      <Text style={[styles.customerPhone, { color: colors.textMuted }]}>{trip.phone}</Text>
                    )}
                  </View>
                  {showCall && (
                    <TouchableOpacity onPress={callCustomer} activeOpacity={0.8}
                      style={[styles.callBtn, { backgroundColor: `${colors.yellow}18`, borderColor: `${colors.yellow}40` }]}>
                      <Text style={[styles.callBtnText, { color: colors.yellow }]}>{t('call')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Navigate — only for active/in-progress trips */}
              {(showToPickup || showToDropoff) && (
                <View style={[styles.navRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {showToPickup && (
                    <TouchableOpacity
                      style={[styles.navBtn, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: colors.border }]}
                      onPress={() => openMaps(trip.pickup)} activeOpacity={0.8}
                    >
                      <View style={[styles.navDot, { backgroundColor: colors.green }]} />
                      <Text style={[styles.navLabel, { color: colors.textPrimary }]}>{t('goToPickup')}</Text>
                    </TouchableOpacity>
                  )}
                  {showToDropoff && (
                    <TouchableOpacity
                      style={[styles.navBtn, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: colors.border }]}
                      onPress={() => openMaps(trip.dropoff)} activeOpacity={0.8}
                    >
                      <View style={[styles.navDot, { backgroundColor: colors.red }]} />
                      <Text style={[styles.navLabel, { color: colors.textPrimary }]}>{t('goToDropoff')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },

  sheet:   { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingTop: 14, maxHeight: '93%' },
  handle:  { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 10 },

  closeBtn:     { position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  closeBtnText: { fontSize: 13, fontFamily: FONTS.bold },

  // Hero
  hero:           { alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 28, gap: 6 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 100, paddingVertical: 6, paddingHorizontal: 16, marginBottom: 6 },
  statusPillText: { fontSize: 13, fontFamily: FONTS.black, letterSpacing: 0.3 },
  fare:           { fontSize: 58, fontFamily: FONTS.black, lineHeight: 64 },
  heroName:       { fontSize: 20, fontFamily: FONTS.bold },
  heroTime:       { fontSize: 13, fontFamily: FONTS.semiBold, opacity: 0.6 },
  chips:          { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip:           { borderRadius: 100, paddingVertical: 6, paddingHorizontal: 14 },
  chipText:       { fontSize: 13, fontFamily: FONTS.semiBold },

  divider: { height: 1, marginBottom: 0 },

  body: { padding: 16, gap: 12 },

  card:  { borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },

  // Route
  addrRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  addrDot:  { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  addrBody: { flex: 1 },
  addrLabel:{ fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2, marginBottom: 4, opacity: 0.6 },
  addrText: { fontSize: 16, fontFamily: FONTS.bold, lineHeight: 22 },
  arrow:    { fontSize: 22, lineHeight: 26 },

  routeConnectorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 0 },
  routeConnectorDot: { width: 3, height: 3, borderRadius: 2, opacity: 0 },
  routeConnectorLine:{ flex: 1, height: 1, marginLeft: 5 },

  // Customer
  customerRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar:        { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:    { fontSize: 22, fontFamily: FONTS.black },
  customerInfo:  { flex: 1 },
  customerName:  { fontSize: 16, fontFamily: FONTS.black },
  customerPhone: { fontSize: 13, fontFamily: FONTS.semiBold, marginTop: 2, opacity: 0.6 },
  callBtn:       { borderWidth: 1.5, borderRadius: RADIUS.lg, paddingVertical: 9, paddingHorizontal: 16 },
  callBtnText:   { fontSize: 13, fontFamily: FONTS.extraBold },

  // Navigate
  navRow: { flexDirection: 'row', gap: 10 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 16, paddingHorizontal: 14 },
  navDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  navLabel:{ fontSize: 13, fontFamily: FONTS.bold, flex: 1 },
});
