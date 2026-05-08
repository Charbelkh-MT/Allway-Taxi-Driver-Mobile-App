import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

const COUNTDOWN_MAX = 84;

async function playTripSound() {
  try {
    // Only plays if the local file exists — haptics fire regardless
    const player = createAudioPlayer(require('../../assets/trip-alert.mp3'));
    player.play();
  } catch {
    // File not found — haptics + push notification sound still play
  }
}

export default function TripRequestSheet({ trip, onAccept, onDecline, withSound = false }) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const [countdown, setCountdown] = useState(COUNTDOWN_MAX);
  const scaleAnim   = useRef(new Animated.Value(0.82)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef(null);

  useEffect(() => {
    // Pop in
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    // Sound only for auto-incoming trips, not manual opens
    if (withSound) playTripSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Countdown
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); onDecline(); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  function handleDecline() { clearInterval(intervalRef.current); onDecline(); }
  function handleAccept() {
    clearInterval(intervalRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept();
  }

  const pct      = countdown / COUNTDOWN_MAX;
  const barColor = pct > 0.4 ? colors.green : pct > 0.15 ? colors.yellow : colors.red;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={handleDecline}>
      <Animated.View style={[
        styles.backdrop,
        { opacity: opacityAnim, backgroundColor: 'rgba(0,0,0,0.82)' },
      ]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleDecline} activeOpacity={1} />

        <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <View style={[styles.card, { backgroundColor: isDark ? '#111' : '#fff', borderColor: colors.border }]}>

            {/* Countdown bar */}
            <View style={[styles.timerTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.timerFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
            </View>

            {/* Header: logo + title + ride type + countdown */}
            <View style={styles.header}>
              <Image
                source={require('../../assets/allway-main-logo.jpg')}
                style={styles.logo}
                resizeMode="cover"
              />
              <View style={styles.headerCenter}>
                <View style={styles.headerTitleRow}>
                  <Text style={[styles.headerTitle, { color: colors.yellow }]}>NEW TRIP</Text>
                  {trip.rideType === 'xl' && (
                    <View style={[styles.rideTypeBadge, { backgroundColor: `${colors.yellow}22`, borderColor: `${colors.yellow}60` }]}>
                      <Text style={[styles.rideTypeText, { color: colors.yellow }]}>XL</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>Request incoming</Text>
              </View>
              <View style={[styles.countdownBadge, { backgroundColor: `${barColor}18`, borderColor: `${barColor}55` }]}>
                <Text style={[styles.countdownNum, { color: barColor }]}>{countdown}</Text>
                <Text style={[styles.countdownSec, { color: barColor }]}>sec</Text>
              </View>
            </View>

            {/* Preferred driver banner */}
            {trip.isPreferred && (
              <View style={[styles.preferredBanner, { backgroundColor: `${colors.yellow}15`, borderColor: `${colors.yellow}40` }]}>
                <Text style={[styles.preferredText, { color: colors.yellow }]}>{t('preferredDriver')}</Text>
              </View>
            )}

            {/* Addresses — big and clear */}
            <View style={[styles.addressBlock, { backgroundColor: isDark ? '#1a1a1a' : '#f7f7f7', borderColor: colors.border }]}>
              {/* Pickup */}
              <View style={styles.addressRow}>
                <View style={[styles.addrDot, { backgroundColor: colors.green }]} />
                <View style={styles.addrText}>
                  <Text style={[styles.addrLabel, { color: colors.textMuted }]}>{t('pickup')}</Text>
                  <Text style={[styles.addrValue, { color: colors.textPrimary }]} numberOfLines={2}>{trip.pickup}</Text>
                </View>
              </View>

              {/* Connector line */}
              <View style={styles.connectorRow}>
                <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Dropoff */}
              <View style={styles.addressRow}>
                <View style={[styles.addrDot, { backgroundColor: colors.red }]} />
                <View style={styles.addrText}>
                  <Text style={[styles.addrLabel, { color: colors.textMuted }]}>{t('dropoff')}</Text>
                  <Text style={[styles.addrValue, { color: colors.textPrimary }]} numberOfLines={2}>{trip.dropoff}</Text>
                </View>
              </View>
            </View>

            {/* Fare + distance + customer */}
            <View style={styles.infoRow}>
              <View style={[styles.infoCard, { backgroundColor: `${colors.yellow}15`, borderColor: `${colors.yellow}35` }]}>
                <Text style={[styles.infoValue, { color: colors.yellow }]}>{trip.fare}</Text>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t('fare')}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{trip.dist || '—'}</Text>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t('distance')}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>{trip.customer}</Text>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t('rider')}</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={[styles.buttons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={handleDecline}
                style={[styles.declineBtn, { backgroundColor: colors.redFaint, borderColor: `${colors.red}30` }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.declineBtnText, { color: colors.red }]}>✕  {t('decline')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleAccept} style={styles.acceptWrap} activeOpacity={0.85}>
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  cardWrap:     { width: '100%' },
  card:         { borderRadius: RADIUS.xxxl, borderWidth: 1, overflow: 'hidden' },

  timerTrack:   { height: 5 },
  timerFill:    { height: '100%' },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 12 },
  logo:           { width: 80, height: 36, borderRadius: 8 },
  headerCenter:   { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:    { fontSize: 20, fontFamily: FONTS.black, letterSpacing: 0.5 },
  rideTypeBadge:  { borderWidth: 1.5, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  rideTypeText:   { fontSize: 11, fontFamily: FONTS.black, letterSpacing: 1 },
  headerSub:      { fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 1 },
  preferredBanner:{ marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  preferredText:  { fontSize: 12, fontFamily: FONTS.extraBold, letterSpacing: 0.3 },
  countdownBadge:{ alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, minWidth: 52 },
  countdownNum: { fontSize: 22, fontFamily: FONTS.black, lineHeight: 26 },
  countdownSec: { fontSize: 10, fontFamily: FONTS.bold, marginTop: -2 },

  // Address block
  addressBlock: { marginHorizontal: 14, borderRadius: RADIUS.xl, borderWidth: 1, padding: 16, marginBottom: 12 },
  addressRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  addrDot:      { width: 14, height: 14, borderRadius: 7, marginTop: 18, flexShrink: 0 },
  addrText:     { flex: 1 },
  addrLabel:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2, marginBottom: 4 },
  addrValue:    { fontSize: 18, fontFamily: FONTS.bold, lineHeight: 24 },
  connectorRow: { paddingLeft: 6, paddingVertical: 4 },
  connectorLine:{ width: 2, height: 16, marginLeft: 0, borderRadius: 1 },

  // Info cards
  infoRow:      { flexDirection: 'row', gap: 8, marginHorizontal: 14, marginBottom: 16 },
  infoCard:     { flex: 1, borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  infoValue:    { fontSize: 17, fontFamily: FONTS.black, marginBottom: 3 },
  infoLabel:    { fontSize: 9, fontFamily: FONTS.extraBold, letterSpacing: 0.8 },

  // Buttons
  buttons:      { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginBottom: 20 },
  declineBtn:   { paddingVertical: 18, paddingHorizontal: 20, borderWidth: 1, borderRadius: RADIUS.lg, alignItems: 'center' },
  declineBtnText:{ fontSize: 15, fontFamily: FONTS.extraBold },
  acceptWrap:   { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
  acceptBtn:    { paddingVertical: 18, alignItems: 'center' },
  acceptBtnText:{ fontSize: 16, fontFamily: FONTS.black, color: '#000' },
});
