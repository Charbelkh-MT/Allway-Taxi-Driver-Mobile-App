import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

export default function PaymentModal({ trip, visible, onComplete, onCancel }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();

  const METHODS = [
    { id: 'cash', icon: '💵', labelKey: 'cash', subKey: 'cashSub', color: 'green'  },
    { id: 'card', icon: '💳', labelKey: 'card', subKey: 'cardSub', color: 'yellow' },
    // Debt only shown if dispatcher enabled it for this customer
    ...(trip?.allowDebt ? [{ id: 'debt', icon: '📋', labelKey: 'debt', subKey: 'debtSub', color: 'red' }] : []),
  ];
  const insets     = useSafeAreaInsets();
  const slideAnim  = useRef(new Animated.Value(500)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  async function select(methodId) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onComplete(methodId);
  }

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.75)' }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} activeOpacity={1} />

        <Animated.View style={[
          styles.sheet,
          { backgroundColor: colors.bg, paddingBottom: insets.bottom + 20 },
          { transform: [{ translateY: slideAnim }] },
        ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Title */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('paymentMethod')}</Text>
            {trip && (
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                {trip.customerFull || trip.customer}  ·  {trip.fare}
              </Text>
            )}
          </View>

          {/* Options */}
          {METHODS.map(method => {
            const accent = colors[method.color];
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => select(method.id)}
                activeOpacity={0.8}
                style={[styles.methodCard, { backgroundColor: `${accent}12`, borderColor: `${accent}35`, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={styles.methodIcon}>{method.icon}</Text>
                <View style={styles.methodText}>
                  <Text style={[styles.methodLabel, { color: colors.textPrimary }]}>{t(method.labelKey)}</Text>
                  <Text style={[styles.methodSub,   { color: colors.textMuted }]}>{t(method.subKey)}</Text>
                </View>
                <View style={[styles.methodArrow, { backgroundColor: `${accent}20` }]}>
                  <Text style={[styles.methodArrowText, { color: accent }]}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Cancel */}
          <TouchableOpacity onPress={onCancel} style={[styles.cancelBtn, { borderColor: colors.border }]}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('cancel')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 12, paddingHorizontal: 20 },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

  header:      { marginBottom: 20 },
  title:       { fontSize: 26, fontFamily: FONTS.black, marginBottom: 4 },
  sub:         { fontSize: 14, fontFamily: FONTS.semiBold },

  methodCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: RADIUS.xl, padding: 18, marginBottom: 12 },
  methodIcon:  { fontSize: 32 },
  methodText:  { flex: 1 },
  methodLabel: { fontSize: 18, fontFamily: FONTS.black, marginBottom: 3 },
  methodSub:   { fontSize: 12, fontFamily: FONTS.semiBold },
  methodArrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  methodArrowText: { fontSize: 24, lineHeight: 30, fontFamily: FONTS.black },

  cancelBtn:   { marginTop: 4, paddingVertical: 16, borderWidth: 1, borderRadius: RADIUS.xl, alignItems: 'center' },
  cancelText:  { fontSize: 14, fontFamily: FONTS.extraBold },
});
