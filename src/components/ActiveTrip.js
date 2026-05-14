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

function TripSuccessOverlay({ visible, trip, paymentMethod, onDone }) {
  const { colors }   = useTheme();
  const { t }        = useLanguage();
  const scaleAnim   = useRef(new Animated.Value(0.75)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim   = useRef(new Animated.Value(0)).current;
  const timerRef    = useRef(null);

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      Animated.spring(checkAnim, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }).start();
    });

    timerRef.current = setTimeout(onDone, 5000);
    return () => clearTimeout(timerRef.current);
  }, [visible]);

  function handleDone() {
    clearTimeout(timerRef.current);
    onDone();
  }

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={[successStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.88)' }]}>
        <Animated.View style={[successStyles.card, {
          backgroundColor: colors.bg,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }]}>

          <Animated.View style={[
            successStyles.iconWrap,
            { backgroundColor: 'rgba(93,202,165,0.15)', borderColor: 'rgba(93,202,165,0.35)', transform: [{ scale: checkAnim }] },
          ]}>
            <Text style={successStyles.icon}>✓</Text>
          </Animated.View>

          <Text style={[successStyles.title, { color: colors.textPrimary }]}>{t('tripCompleted')}</Text>

          <Text style={[successStyles.customer, { color: colors.textMuted }]}>
            {trip?.customerFull || trip?.customer}
          </Text>

          <View style={[successStyles.fareBox, { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}30` }]}>
            <Text style={[successStyles.fare, { color: colors.green }]}>{trip?.fare}</Text>
            <View style={[successStyles.paymentChip, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[successStyles.paymentText, { color: colors.textSecondary }]}>
                {formatPaymentLabel(paymentMethod)}
              </Text>
            </View>
          </View>

          <Text style={[successStyles.sub, { color: colors.textDisabled }]}>
            {t('receiptRecorded')}
          </Text>

          <TouchableOpacity
            onPress={handleDone}
            activeOpacity={0.85}
            style={[successStyles.doneBtn, { backgroundColor: colors.yellow }]}
          >
            <Text style={successStyles.doneBtnText}>{t('okBackHome')}</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

function CustomerRatingModal({ visible, trip, onRate }) {
  const { colors } = useTheme();
  const { t }      = useLanguage();
  const [selected, setSelected] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setSelected(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={[ratingStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.88)' }]}>
        <Animated.View style={[ratingStyles.card, { backgroundColor: colors.bg, transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
          <Text style={[ratingStyles.title, { color: colors.textPrimary }]}>{t('rateCustomer')}</Text>
          <Text style={[ratingStyles.sub, { color: colors.textMuted }]}>{trip?.customerFull || trip?.customer}</Text>

          <View style={ratingStyles.stars}>
            {[1,2,3,4,5].map(star => (
              <TouchableOpacity key={star} onPress={() => setSelected(star)} activeOpacity={0.7}>
                <Text style={[ratingStyles.star, { color: star <= selected ? '#F5B800' : colors.border }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => onRate(selected || null)}
            activeOpacity={0.85}
            style={[ratingStyles.btn, { backgroundColor: selected ? colors.yellow : colors.bgCard, borderColor: colors.border }]}
          >
            <Text style={[ratingStyles.btnText, { color: selected ? '#000' : colors.textMuted }]}>
              {selected ? `${t('submitRating')} ${selected} ★` : t('skip')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}



const ratingStyles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  card:    { width: '100%', borderRadius: RADIUS.xxxl, padding: 32, alignItems: 'center', gap: 14 },
  title:   { fontSize: 24, fontFamily: FONTS.black, textAlign: 'center' },
  sub:     { fontSize: 14, fontFamily: FONTS.semiBold, textAlign: 'center', opacity: 0.7 },
  stars:   { flexDirection: 'row', gap: 8, marginVertical: 8 },
  star:    { fontSize: 44 },
  btn:     { width: '100%', borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontFamily: FONTS.black },
});

export default function ActiveTrip({ trip, onComplete, onPickUp, onNoShow, onCancel }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRating,  setShowRating]  = useState(false);
  const [paidMethod,  setPaidMethod]  = useState(null);
  const [elapsed,     setElapsed]     = useState(0);
  // Initialise from acceptedAt (restored from AsyncStorage) so the timer survives app restarts
  const startRef = useRef(trip?.acceptedAt ? new Date(trip.acceptedAt).getTime() : Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
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
    setShowRating(true);
  }

  function handleRatingDone(stars) {
    setShowRating(false);
    onComplete(paidMethod, stars);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: `${colors.green}14`, borderColor: `${colors.green}40` }]}>

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

        {trip.isPreferred && (
          <View style={[styles.preferredBanner, { backgroundColor: `${colors.yellow}15`, borderColor: `${colors.yellow}40` }]}>
            <Text style={[styles.preferredText, { color: colors.yellow }]}>{t('preferredDriver')}</Text>
          </View>
        )}

        <Text style={[styles.customerName, { color: colors.textPrimary }]}>
          {trip.customerFull || trip.customer}
        </Text>

        {!!trip.phone && (
          <TouchableOpacity
            onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); callCustomer(); }}
            style={[styles.phoneChip, { backgroundColor: colors.yellowFaint, borderColor: 'rgba(245,184,0,0.22)' }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.phoneChipText, { color: colors.yellow }]}>📞  {trip.phone}</Text>
          </TouchableOpacity>
        )}

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

        {isAccepted && (
          <View style={styles.actionsWrap}>
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

            <TouchableOpacity onPress={handlePickUp} activeOpacity={0.85} style={styles.pickUpWrap}>
              <LinearGradient
                colors={[colors.green, '#3DAE8A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.pickUpBtn}
              >
                <Text style={styles.pickUpBtnText}>{t('passengerPickedUp')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={styles.cancelLink}>
              <Text style={[styles.cancelLinkText, { color: colors.textDisabled }]}>{t('cancelTripBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPickedUp && (
          <View style={styles.actionsWrap}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.bgCard, borderColor: colors.border, width: '100%' }]}
              onPress={() => openMaps(trip.dropoff)}
              activeOpacity={0.75}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>{t('navigateDropoff')}</Text>
            </TouchableOpacity>

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

      <CustomerRatingModal
        visible={showRating}
        trip={trip}
        onRate={handleRatingDone}
      />
    </View>
  );
}

const successStyles = StyleSheet.create({
  overlay:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  card:         { width: '100%', borderRadius: RADIUS.xxxl, padding: 32, alignItems: 'center', gap: 12 },
  iconWrap:     { width: 100, height: 100, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  icon:         { fontSize: 52, color: '#5DCAA5' },
  title:        { fontSize: 30, fontFamily: FONTS.black, textAlign: 'center' },
  customer:     { fontSize: 15, fontFamily: FONTS.semiBold, textAlign: 'center', opacity: 0.8 },
  fareBox:      { width: '100%', borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center', gap: 8, marginTop: 4 },
  fare:         { fontSize: 44, fontFamily: FONTS.black },
  paymentChip:  { borderWidth: 1, borderRadius: RADIUS.full, paddingVertical: 5, paddingHorizontal: 14 },
  paymentText:  { fontSize: 13, fontFamily: FONTS.bold },
  sub:          { fontSize: 12, fontFamily: FONTS.semiBold, textAlign: 'center', opacity: 0.5 },
  doneBtn:      { width: '100%', borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  doneBtnText:  { fontSize: 16, fontFamily: FONTS.black, color: '#000' },
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
