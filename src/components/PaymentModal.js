import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, TextInput, Alert, ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

const ALL_METHODS = [
  { id: 'cash',   icon: '💵', labelKey: 'cash',   subKey: 'cashSub',   color: 'green'  },
  { id: 'card',   icon: '💳', labelKey: 'card',   subKey: 'cardSub',   color: 'yellow' },
  { id: 'wish',   icon: '💙', labelKey: 'wish',   subKey: 'wishSub',   color: 'yellow' },
  { id: 'wallet', icon: '💰', labelKey: 'wallet', subKey: 'walletSub', color: 'green'  },
];
const DEBT_METHOD = { id: 'debt', icon: '📋', labelKey: 'debt', subKey: 'debtSub', color: 'red' };

function formatSplitPayment(method1, amount1, method2, amount2) {
  return `split|${method1}|${amount1.toFixed(2)}|${method2}|${amount2.toFixed(2)}`;
}

// ─── Method chip row for split payment ───────────────────────────────────────
function MethodChips({ methods, selected, onSelect, colors }) {
  return (
    <View style={chipStyles.row}>
      {methods.map(m => {
        const isSelected = selected === m.id;
        const accent     = colors[m.color];
        return (
          <TouchableOpacity
            key={m.id}
            onPress={() => onSelect(m.id)}
            activeOpacity={0.75}
            style={[
              chipStyles.chip,
              isSelected
                ? { backgroundColor: `${accent}22`, borderColor: accent }
                : { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            <Text style={chipStyles.icon}>{m.icon}</Text>
            <Text style={[chipStyles.label, { color: isSelected ? accent : colors.textMuted }]}>
              {m.labelKey.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaymentModal({ trip, visible, onComplete, onCancel }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [isSplit,      setIsSplit]      = useState(false);
  const [splitMethod1, setSplitMethod1] = useState('cash');
  const [splitMethod2, setSplitMethod2] = useState('card');
  const [amountStr,    setAmountStr]    = useState('');

  const totalFare = trip?.fareNum ?? (parseFloat((trip?.fare || '0').replace(/[^0-9.]/g, '')) || 0);
  const amount1   = parseFloat(amountStr) || 0;
  const amount2   = Math.max(0, totalFare - amount1);

  const methods = [
    ...ALL_METHODS,
    ...(trip?.allowDebt ? [DEBT_METHOD] : []),
  ];

  useEffect(() => {
    if (visible) {
      setIsSplit(false);
      setAmountStr('');
      setSplitMethod1('cash');
      setSplitMethod2('card');
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  async function selectSingle(methodId) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onComplete(methodId);
  }

  async function confirmSplit() {
    if (amount1 <= 0 || amount1 >= totalFare) {
      Alert.alert('Invalid Amount', t('splitInvalid'));
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onComplete(formatSplitPayment(splitMethod1, amount1, splitMethod2, amount2));
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

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* ── Header ── */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {isSplit ? t('splitPayment') : t('paymentMethod')}
              </Text>
              {trip && (
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  {trip.customerFull || trip.customer}  ·  {trip.fare}
                </Text>
              )}
            </View>

            {!isSplit ? (
              <>
                {/* ── Single payment methods ── */}
                {methods.map(method => {
                  const accent = colors[method.color];
                  return (
                    <TouchableOpacity
                      key={method.id}
                      onPress={() => selectSingle(method.id)}
                      activeOpacity={0.8}
                      style={[styles.methodCard, {
                        backgroundColor: `${accent}12`,
                        borderColor: `${accent}35`,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      }]}
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

                {/* ── Split payment toggle ── */}
                {totalFare > 0 && (
                  <TouchableOpacity
                    onPress={() => setIsSplit(true)}
                    activeOpacity={0.8}
                    style={[styles.splitToggle, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
                  >
                    <Text style={styles.splitIcon}>🔀</Text>
                    <View style={styles.methodText}>
                      <Text style={[styles.methodLabel, { color: colors.textPrimary }]}>{t('splitPayment')}</Text>
                      <Text style={[styles.methodSub,   { color: colors.textMuted }]}>{t('splitPaymentSub')}</Text>
                    </View>
                    <Text style={[styles.methodArrowText, { color: colors.textMuted }]}>›</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {/* ── Split payment UI ── */}

                {/* First payment */}
                <View style={[styles.splitSection, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
                  <Text style={[styles.splitSectionLabel, { color: colors.textMuted }]}>{t('firstPayment')}</Text>
                  <MethodChips
                    methods={ALL_METHODS}
                    selected={splitMethod1}
                    onSelect={setSplitMethod1}
                    colors={colors}
                  />
                  <View style={[styles.amountRow, { borderColor: colors.border }]}>
                    <Text style={[styles.amountLabel, { color: colors.textMuted }]}>{t('enterAmount')}</Text>
                    <View style={[styles.amountInputWrap, { borderColor: colors.yellow, backgroundColor: `${colors.yellow}10` }]}>
                      <Text style={[styles.amountCurrency, { color: colors.yellow }]}>$</Text>
                      <TextInput
                        style={[styles.amountInput, { color: colors.textPrimary }]}
                        value={amountStr}
                        onChangeText={setAmountStr}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textDisabled}
                        maxLength={6}
                      />
                    </View>
                  </View>
                </View>

                {/* Second payment */}
                <View style={[styles.splitSection, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
                  <Text style={[styles.splitSectionLabel, { color: colors.textMuted }]}>{t('secondPayment')}</Text>
                  <MethodChips
                    methods={ALL_METHODS}
                    selected={splitMethod2}
                    onSelect={setSplitMethod2}
                    colors={colors}
                  />
                  <View style={[styles.amountRow, { borderColor: colors.border }]}>
                    <Text style={[styles.amountLabel, { color: colors.textMuted }]}>{t('remaining')}</Text>
                    <View style={[styles.amountInputWrap, { borderColor: colors.green, backgroundColor: `${colors.green}10` }]}>
                      <Text style={[styles.amountCurrency, { color: colors.green }]}>$</Text>
                      <Text style={[styles.amountInput, { color: colors.green }]}>
                        {amount2 > 0 ? amount2.toFixed(2) : '0'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Confirm split */}
                <TouchableOpacity
                  onPress={confirmSplit}
                  activeOpacity={0.85}
                  style={[styles.confirmSplitBtn, { backgroundColor: colors.yellow }]}
                >
                  <Text style={styles.confirmSplitText}>{t('confirmSplit')}</Text>
                </TouchableOpacity>

                {/* Back */}
                <TouchableOpacity onPress={() => setIsSplit(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('back')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Cancel (single mode only) ── */}
            {!isSplit && (
              <TouchableOpacity onPress={onCancel} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const chipStyles = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip:  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, gap: 4 },
  icon:  { fontSize: 18 },
  label: { fontSize: 9, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 12, paddingHorizontal: 20, maxHeight: '90%' },
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

  splitToggle: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: RADIUS.xl, padding: 18, marginBottom: 12 },
  splitIcon:   { fontSize: 28 },

  splitSection:     { borderWidth: 1, borderRadius: RADIUS.xl, padding: 16, marginBottom: 12 },
  splitSectionLabel:{ fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1, marginBottom: 12 },

  amountRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
  amountLabel:      { fontSize: 13, fontFamily: FONTS.bold },
  amountInputWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  amountCurrency:   { fontSize: 18, fontFamily: FONTS.black },
  amountInput:      { fontSize: 22, fontFamily: FONTS.black, minWidth: 60, textAlign: 'right' },

  confirmSplitBtn:  { borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  confirmSplitText: { fontSize: 15, fontFamily: FONTS.black, color: '#000' },

  cancelBtn:   { marginTop: 4, paddingVertical: 16, borderWidth: 1, borderRadius: RADIUS.xl, alignItems: 'center', marginBottom: 4 },
  cancelText:  { fontSize: 14, fontFamily: FONTS.extraBold },
});
