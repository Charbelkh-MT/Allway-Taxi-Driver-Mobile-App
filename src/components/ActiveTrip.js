import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { formatTime } from '../utils/dateUtils';
import { FONTS, RADIUS } from '../theme';
import PaymentModal from './PaymentModal';

function formatPaymentLabel(method) {
  if (!method) return '';
  if (method.startsWith('split|')) {
    const [, m1, a1, m2, a2] = method.split('|');
    const icons = { cash: '💵', card: '💳', wish: '💙', wallet: '💰', debt: '📋' };
    return `${icons[m1] ?? '💵'} $${parseFloat(a1).toFixed(0)}  +  ${icons[m2] ?? '💳'} $${parseFloat(a2).toFixed(0)}`;
  }
  const LABELS = { cash: '💵 Cash', card: '💳 Card', wish: '💙 Wish', wallet: '💰 Wallet', debt: '📋 Account' };
  return LABELS[method] ?? method;
}

// ─── Success overlay ──────────────────────────────────────────────────────────
function TripSuccessOverlay({ visible, trip, paymentMethod, onDone }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const scaleAnim   = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={[successStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
        <Animated.View style={[successStyles.card, {
          backgroundColor: colors.bg,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }]}>
          <View style={[successStyles.iconWrap, { backgroundColor: 'rgba(93,202,165,0.18)' }]}>
            <Text style={successStyles.icon}>✓</Text>
          </View>
          <Text style={[successStyles.title,    { color: colors.textPrimary }]}>{t('tripCompleted')}</Text>
          <Text style={[successStyles.customer, { color: colors.textMuted }]}>
            {trip?.customerFull || trip?.customer}
          </Text>
          <View style={[successStyles.fareRow, { backgroundColor: `${colors.yellow}12`, borderColor: `${colors.yellow}30` }]}>
            <Text style={[successStyles.fare,    { color: colors.yellow }]}>{trip?.fare}</Text>
            <Text style={[successStyles.payment, { color: colors.textMuted }]}>
              {formatPaymentLabel(paymentMethod)}
            </Text>
          </View>
          <Text style={[successStyles.sub, { color: colors.textDisabled }]}>
            {t('receiptRecorded')}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ActiveTrip({ trip, onComplete, onPickUp, onNoShow, onCancel }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paidMethod,  setPaidMethod]  = useState(null);
  const [elapsed,     setElapsed]     = useState(0);
  const startRef = useRef(Date.now());
  const timerRef = useRef(null);

  // Live trip timer — starts when ActiveTrip mounts (trip accepted)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const isAccepted = trip.status === 'accepted' || !trip.status;
  const isPickedUp = trip.status === 'picked_up';

  async function callCustomer() {
    const url = `tel:${trip.phone}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert('Call', trip.phone);
  }

  async function openMaps(address) {
    const q   = encodeURIComponent(address);
    const app = `comgooglemaps://?q=${q}&directionsmode=driving`;
    const web = `https://www.google.com/maps/search/?api=1&query=${q}`;
    await Linking.openURL(await Linking.canOpenURL(app) ? app : web);
  }

  function handlePickUp() {
    Alert.alert(
      t('passengerPickedUpQ'),
      t('passengerPickedUpConfirm'),
      [
        { text: t('notYet'), style: 'cancel' },
        { text: t('yesPickedUp'), onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onPickUp();
        }},
      ]
    );
  }

  function handleNoShow() {
    Alert.alert(
      t('noShowQ'),
      t('noShowConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('markNoShow'), style: 'destructive', onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onNoShow();
        }},
      ]
    );
  }

  function handleCancel() {
    Alert.alert(
      t('cancelTripQ'),
      t('cancelTripConfirm'),
      [
        { text: t('back'), style: 'cancel' },
        { text: t('cancelTripBtn'), style: 'destructive', onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onCancel('driver_cancelled');
        }},
      ]
    );
  }

  async function handlePayment(method) {
    setShowPayment(false);
    setPaidMethod(method);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSuccess(true);
  }

  function handleSuccessDone() {
    setShowSuccess(false);
    onComplete(paidMethod);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: `${colors.green}14`, borderColor: `${colors.green}40` }]}>

        {/* Status badge + ride type + elapsed timer */}
        <View style={styles.badgeRow}>
          <View style={[styles.dot, { backgroundColor: colors.green }]} />
          <Text style={[styles.badgeText, { color: colors.green, flex: 1 }]}>
            {isPickedUp ? t('passengerOnBoard') : t('headingToPickup')}
          </Text>
          {trip.rideType === 'xl' && (
            <View style={[styles.rideTypeBadge, { backgroundColor: `${colors.yellow}20`, borderColor: `${colors.yellow}50` }]}>
              <Text style={[styles.rideTypeText, { color: colors.yellow }]}>{t('rideXL')}</Text>
            </View>
          )}
          <View style={[styles.timerChip, { backgroundColor: `${colors.green}20`, borderColor: `${colors.green}40` }]}>
            <Text style={[styles.timerText, { color: colors.green }]}>⏱ {formatTime(elapsed)}</Text>
          </View>
        </View>

        {/* Preferred driver banner */}
        {trip.isPreferred && (
          <View style={[styles.preferredBanner, { backgroundColor: `${colors.yellow}15`, borderColor: `${colors.yellow}40` }]}>
            <Text style={[styles.preferredText, { color: colors.yellow }]}>{t('preferredDriver')}</Text>
          </View>
        )}

        {/* Customer */}
        <Text style={[styles.customerName, { color: colors.textPrimary }]}>
          {trip.customerFull || trip.customer}
        </Text>

        {/* Phone */}
        {!!trip.phone && (
          <TouchableOpacity
            onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); callCustomer(); }}
            style={[styles.phoneChip, { backgroundColor: colors.yellowFaint, borderColor: 'rgba(245,184,0,0.22)' }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.phoneChipText, { color: colors.yellow }]}>📞  {trip.phone}</Text>
          </TouchableOpacity>
        )}

        {/* Route */}
        <View style={styles.routeBlock}>
          {[
            { label: t('pickup'),   text: trip.pickup,  dot: colors.green },
            { label: t('dropoff'), text: trip.dropoff, dot: colors.red   },
          ].map((r, i) => (
            <React.Fragment key={r.label}>
              {i > 0 && <View style={[styles.routeLine, { backgroundColor: colors.border }]} />}
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: r.dot }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeLabel, { color: colors.textMuted }]}>{r.label}</Text>
                  <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={2}>{r.text}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Fare + distance */}
        <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('fare')}</Text>
            <Text style={[styles.metaVal, { color: colors.yellow }]}>{trip.fare}</Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('distance')}</Text>
            <Text style={[styles.metaVal, { color: colors.textPrimary }]}>{trip.dist || '—'}</Text>
          </View>
        </View>

        {/* ── Actions: heading to pickup ──────────────────────────── */}
        {isAccepted && (
          <View style={styles.actionsWrap}>
            {/* Row 1: Maps + No Show */}
            <View style={[styles.actionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.bgCard, borderColor: colors.border, flex: 1 }]}
                onPress={() => openMaps(trip.pickup)}
                activeOpacity={0.75}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>{t('toPickup')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.redFaint, borderColor: `${colors.red}25`, flex: 1 }]}
                onPress={handleNoShow}
                activeOpacity={0.75}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.red }]}>{t('noShow')}</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: Passenger Picked Up (main CTA) */}
            <TouchableOpacity onPress={handlePickUp} activeOpacity={0.85} style={styles.pickUpWrap}>
              <LinearGradient
                colors={[colors.green, '#3DAE8A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.pickUpBtn}
              >
                <Text style={styles.pickUpBtnText}>{t('passengerPickedUp')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel (tucked away) */}
            <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={styles.cancelLink}>
              <Text style={[styles.cancelLinkText, { color: colors.textDisabled }]}>{t('cancelTripBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Actions: passenger on board ────────────────────────── */}
        {isPickedUp && (
          <View style={styles.actionsWrap}>
            {/* Navigate to drop-off */}
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.bgCard, borderColor: colors.border, width: '100%' }]}
              onPress={() => openMaps(trip.dropoff)}
              activeOpacity={0.75}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>{t('navigateDropoff')}</Text>
            </TouchableOpacity>

            {/* End trip */}
            <TouchableOpacity onPress={() => setShowPayment(true)} activeOpacity={0.85} style={styles.pickUpWrap}>
              <LinearGradient
                colors={[colors.green, '#3DAE8A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.pickUpBtn}
              >
                <Text style={styles.pickUpBtnText}>{t('endTripCollect')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <PaymentModal
        trip={trip}
        visible={showPayment}
        onComplete={handlePayment}
        onCancel={() => setShowPayment(false)}
      />

      <TripSuccessOverlay
        visible={showSuccess}
        trip={trip}
        paymentMethod={paidMethod}
        onDone={handleSuccessDone}
      />
    </View>
  );
}

const successStyles = StyleSheet.create({
  overlay:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  card:      { width: '100%', borderRadius: RADIUS.xxxl, padding: 32, alignItems: 'center', gap: 10 },
  iconWrap:  { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon:      { fontSize: 48, color: '#5DCAA5' },
  title:     { fontSize: 28, fontFamily: FONTS.black, textAlign: 'center' },
  customer:  { fontSize: 15, fontFamily: FONTS.semiBold, textAlign: 'center' },
  fareRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 20, marginTop: 8 },
  fare:      { fontSize: 28, fontFamily: FONTS.black },
  payment:   { fontSize: 14, fontFamily: FONTS.semiBold },
  sub:       { fontSize: 11, fontFamily: FONTS.semiBold, textAlign: 'center', marginTop: 4 },
});

const styles = StyleSheet.create({
  container:    { paddingHorizontal: 18, paddingTop: 20 },
  card:         { borderWidth: 1, borderRadius: RADIUS.xxl, padding: 20 },

  badgeRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot:            { width: 8, height: 8, borderRadius: 4 },
  badgeText:      { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2 },
  rideTypeBadge:  { borderWidth: 1, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
  rideTypeText:   { fontSize: 9, fontFamily: FONTS.black, letterSpacing: 0.8 },
  timerChip:      { borderWidth: 1, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10 },
  timerText:      { fontSize: 12, fontFamily: FONTS.black, fontVariant: ['tabular-nums'] },
  preferredBanner:{ borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 10, alignSelf: 'flex-start' },
  preferredText:  { fontSize: 11, fontFamily: FONTS.extraBold, letterSpacing: 0.3 },

  customerName: { fontSize: 22, fontFamily: FONTS.black, marginBottom: 10 },
  phoneChip:    { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 18 },
  phoneChipText:{ fontSize: 13, fontFamily: FONTS.bold },

  routeBlock:   { marginBottom: 18 },
  routeRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  routeDot:     { width: 10, height: 10, borderRadius: 5, marginTop: 14, flexShrink: 0 },
  routeLine:    { width: 1, height: 16, marginLeft: 5, marginVertical: 4 },
  routeLabel:   { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1, marginBottom: 3, marginTop: 10 },
  routeText:    { fontSize: 15, fontFamily: FONTS.bold, lineHeight: 21 },

  metaRow:      { flexDirection: 'row', borderTopWidth: 1, paddingTop: 14, marginBottom: 18 },
  metaItem:     { flex: 1, alignItems: 'center' },
  metaDivider:  { width: 1, marginVertical: 4 },
  metaLabel:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 0.8, marginBottom: 4 },
  metaVal:      { fontSize: 18, fontFamily: FONTS.black },

  actionsWrap:      { gap: 10 },
  actionRow:        { flexDirection: 'row', gap: 10 },
  secondaryBtn:     { paddingVertical: 13, borderWidth: 1, borderRadius: RADIUS.lg, alignItems: 'center' },
  secondaryBtnText: { fontSize: 13, fontFamily: FONTS.bold },

  pickUpWrap:    { borderRadius: RADIUS.lg, overflow: 'hidden' },
  pickUpBtn:     { paddingVertical: 16, alignItems: 'center' },
  pickUpBtnText: { fontSize: 14, fontFamily: FONTS.black, color: '#fff' },

  cancelLink:     { alignItems: 'center', paddingTop: 4 },
  cancelLinkText: { fontSize: 12, fontFamily: FONTS.semiBold },
});
