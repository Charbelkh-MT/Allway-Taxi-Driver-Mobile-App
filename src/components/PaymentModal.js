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

// ─── Company accounts (replace with real numbers before go-live) ──────────────
const WISH_NUMBER   = '+961 71 234 567';
const WALLET_NUMBER = '+961 70 987 654';

// ─── Payment method definitions ───────────────────────────────────────────────
const ALL_METHODS = [
  { id: 'cash',   icon: '💵', labelKey: 'cash',   subKey: 'cashSub',   color: 'green'  },
  { id: 'card',   icon: '💳', labelKey: 'card',   subKey: 'cardSub',   color: 'yellow' },
  { id: 'wish',   icon: null, labelKey: 'wish',   subKey: 'wishSub',   color: 'yellow' },
  { id: 'wallet', icon: '💰', labelKey: 'wallet', subKey: 'walletSub', color: 'green'  },
];
const DEBT_METHOD = { id: 'debt', icon: '📋', labelKey: 'debt', subKey: 'debtSub', color: 'red' };

function formatSplitPayment(method1, amount1, method2, amount2) {
  return `split|${method1}|${amount1.toFixed(2)}|${method2}|${amount2.toFixed(2)}`;
}

// ─── Wish Money branded logo ──────────────────────────────────────────────────
function WishLogo({ size = 32 }) {
  return (
    <View style={[wishStyles.badge, { width: size * 2.4, height: size, borderRadius: size * 0.22 }]}>
      <Text style={[wishStyles.text, { fontSize: size * 0.44 }]}>Whish</Text>
      <View style={[wishStyles.dot, { width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06 }]} />
    </View>
  );
}
const wishStyles = StyleSheet.create({
  badge: { backgroundColor: '#0A1F44', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 8 },
  text:  { color: '#D4A843', fontFamily: FONTS.black, letterSpacing: 0.5 },
  dot:   { backgroundColor: '#D4A843', marginTop: 2 },
});

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
            {m.icon ? (
              <Text style={chipStyles.icon}>{m.icon}</Text>
            ) : (
              <WishLogo size={18} />
            )}
            <Text style={[chipStyles.label, { color: isSelected ? accent : colors.textMuted }]}>
              {m.labelKey.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Confirmation screen for each method ─────────────────────────────────────
function ConfirmationScreen({ method, fare, fareNum, colors, isRTL, onConfirm, onBack, t }) {
  const configs = {
    cash: {
      header:    '💵 Cash Payment',
      accent:    colors.green,
      lines:     ['Collect from the customer:'],
      account:   null,
      note:      'Count the cash before confirming.',
      btnLabel:  '✓  Cash Collected — End Trip',
    },
    card: {
      header:    '💳 Card Payment',
      accent:    colors.yellow,
      lines:     ['Charge the customer:'],
      account:   null,
      note:      'Process via your card reader before confirming.',
      btnLabel:  '✓  Card Charged — End Trip',
    },
    wish: {
      header:    null, // uses WishLogo
      accent:    '#D4A843',
      lines:     ['Customer sends to:'],
      account:   WISH_NUMBER,
      note:      'Wait for the transfer confirmation before proceeding.',
      btnLabel:  '✓  Whish Received — End Trip',
    },
    wallet: {
      header:    '💰 Wallet Transfer',
      accent:    colors.green,
      lines:     ['Customer transfers to:'],
      account:   `${WALLET_NUMBER} (OMT)`,
      note:      'Confirm the transfer was received before proceeding.',
      btnLabel:  '✓  Transfer Received — End Trip',
    },
    debt: {
      header:    '📋 Account (Debt)',
      accent:    colors.red,
      lines:     ['Amount added to customer account:'],
      account:   null,
      note:      'This will be settled at the next billing cycle.',
      btnLabel:  '✓  Logged — End Trip',
    },
  };

  const cfg = configs[method] ?? configs.cash;

  return (
    <View style={confirmStyles.container}>
      {/* Header */}
      <View style={[confirmStyles.headerBox, { borderColor: `${cfg.accent}30`, backgroundColor: `${cfg.accent}10` }]}>
        {method === 'wish' ? (
          <WishLogo size={36} />
        ) : (
          <Text style={[confirmStyles.headerText, { color: cfg.accent }]}>{cfg.header}</Text>
        )}
      </View>

      {/* Instruction line */}
      {cfg.lines.map((line, i) => (
        <Text key={i} style={[confirmStyles.instruction, { color: colors.textMuted }]}>{line}</Text>
      ))}

      {/* Account number (Wish / Wallet) */}
      {cfg.account && (
        <View style={[confirmStyles.accountBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[confirmStyles.accountNum, { color: colors.textPrimary }]}>{cfg.account}</Text>
        </View>
      )}

      {/* Fare amount — big and clear */}
      <View style={[confirmStyles.fareBox, { borderColor: `${cfg.accent}40`, backgroundColor: `${cfg.accent}12` }]}>
        <Text style={[confirmStyles.fareVal, { color: cfg.accent }]}>{fare}</Text>
        <Text style={[confirmStyles.fareLabel, { color: colors.textMuted }]}>AMOUNT</Text>
      </View>

      {/* Note */}
      <View style={[confirmStyles.noteBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[confirmStyles.noteText, { color: colors.textMuted }]}>ⓘ  {cfg.note}</Text>
      </View>

      {/* Confirm button */}
      <TouchableOpacity
        onPress={onConfirm}
        activeOpacity={0.85}
        style={[confirmStyles.confirmBtn, { backgroundColor: cfg.accent }]}
      >
        <Text style={[confirmStyles.confirmText, { color: method === 'wish' ? '#0A1F44' : '#000' }]}>
          {cfg.btnLabel}
        </Text>
      </TouchableOpacity>

      {/* Back */}
      <TouchableOpacity onPress={onBack} style={confirmStyles.backBtn} activeOpacity={0.7}>
        <Text style={[confirmStyles.backText, { color: colors.textMuted }]}>← Change payment method</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Split confirmation ───────────────────────────────────────────────────────
function SplitConfirmationScreen({ method1, amount1, method2, amount2, fare, colors, onConfirm, onBack }) {
  const icons = { cash: '💵', card: '💳', wish: null, wallet: '💰', debt: '📋' };
  const labels = { cash: 'Cash', card: 'Card', wish: 'Whish', wallet: 'Wallet', debt: 'Account' };

  return (
    <View style={confirmStyles.container}>
      <View style={[confirmStyles.headerBox, { borderColor: `${colors.yellow}30`, backgroundColor: `${colors.yellow}10` }]}>
        <Text style={[confirmStyles.headerText, { color: colors.yellow }]}>🔀 Split Payment</Text>
      </View>

      <Text style={[confirmStyles.instruction, { color: colors.textMuted }]}>Total fare: {fare}</Text>

      {/* Method 1 */}
      <View style={[confirmStyles.splitRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={confirmStyles.splitLeft}>
          {icons[method1] ? (
            <Text style={{ fontSize: 24 }}>{icons[method1]}</Text>
          ) : (
            <WishLogo size={22} />
          )}
          <Text style={[confirmStyles.splitLabel, { color: colors.textPrimary }]}>{labels[method1]}</Text>
        </View>
        <Text style={[confirmStyles.splitAmount, { color: colors.green }]}>${parseFloat(amount1).toFixed(2)}</Text>
      </View>

      {/* Method 2 */}
      <View style={[confirmStyles.splitRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={confirmStyles.splitLeft}>
          {icons[method2] ? (
            <Text style={{ fontSize: 24 }}>{icons[method2]}</Text>
          ) : (
            <WishLogo size={22} />
          )}
          <Text style={[confirmStyles.splitLabel, { color: colors.textPrimary }]}>{labels[method2]}</Text>
        </View>
        <Text style={[confirmStyles.splitAmount, { color: colors.yellow }]}>${parseFloat(amount2).toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        onPress={onConfirm}
        activeOpacity={0.85}
        style={[confirmStyles.confirmBtn, { backgroundColor: colors.yellow }]}
      >
        <Text style={[confirmStyles.confirmText, { color: '#000' }]}>✓  Both Collected — End Trip</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack} style={confirmStyles.backBtn} activeOpacity={0.7}>
        <Text style={[confirmStyles.backText, { color: colors.textMuted }]}>← Change payment method</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function PaymentModal({ trip, visible, onComplete, onCancel }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  // step: 'select' | 'confirm' | 'split' | 'splitConfirm'
  const [step,         setStep]         = useState('select');
  const [chosenMethod, setChosenMethod] = useState(null);
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
      setStep('select');
      setChosenMethod(null);
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

  async function selectMethod(methodId) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosenMethod(methodId);
    setStep('confirm');
  }

  async function confirmPayment() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(chosenMethod);
  }

  async function confirmSplit() {
    if (amount1 <= 0 || amount1 >= totalFare) {
      Alert.alert('Invalid Amount', t('splitInvalid'));
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStep('splitConfirm');
  }

  async function confirmSplitFinal() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

            {/* ── STEP: Select method ── */}
            {step === 'select' && (
              <>
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>{t('paymentMethod')}</Text>
                  {trip && (
                    <Text style={[styles.sub, { color: colors.textMuted }]}>
                      {trip.customerFull || trip.customer}  ·  {trip.fare}
                    </Text>
                  )}
                </View>

                {methods.map(method => {
                  const accent = colors[method.color];
                  return (
                    <TouchableOpacity
                      key={method.id}
                      onPress={() => selectMethod(method.id)}
                      activeOpacity={0.8}
                      style={[styles.methodCard, {
                        backgroundColor: `${accent}12`,
                        borderColor:     `${accent}35`,
                        flexDirection:   isRTL ? 'row-reverse' : 'row',
                      }]}
                    >
                      <View style={styles.methodIconWrap}>
                        {method.icon ? (
                          <Text style={styles.methodIcon}>{method.icon}</Text>
                        ) : (
                          <WishLogo size={30} />
                        )}
                      </View>
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

                {/* Split payment */}
                {totalFare > 0 && (
                  <TouchableOpacity
                    onPress={() => setStep('split')}
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

                <TouchableOpacity onPress={onCancel} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('cancel')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP: Method confirmation ── */}
            {step === 'confirm' && chosenMethod && (
              <ConfirmationScreen
                method={chosenMethod}
                fare={trip?.fare ?? '$0'}
                fareNum={totalFare}
                colors={colors}
                isRTL={isRTL}
                onConfirm={confirmPayment}
                onBack={() => setStep('select')}
                t={t}
              />
            )}

            {/* ── STEP: Split — enter amounts ── */}
            {step === 'split' && (
              <>
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>{t('splitPayment')}</Text>
                  {trip && (
                    <Text style={[styles.sub, { color: colors.textMuted }]}>
                      {trip.customerFull || trip.customer}  ·  {trip.fare}
                    </Text>
                  )}
                </View>

                {/* First payment */}
                <View style={[styles.splitSection, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
                  <Text style={[styles.splitSectionLabel, { color: colors.textMuted }]}>{t('firstPayment')}</Text>
                  <MethodChips methods={ALL_METHODS} selected={splitMethod1} onSelect={setSplitMethod1} colors={colors} />
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
                  <MethodChips methods={ALL_METHODS} selected={splitMethod2} onSelect={setSplitMethod2} colors={colors} />
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

                <TouchableOpacity onPress={confirmSplit} activeOpacity={0.85}
                  style={[styles.confirmSplitBtn, { backgroundColor: colors.yellow }]}>
                  <Text style={styles.confirmSplitText}>{t('confirmSplit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('select')} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('back')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP: Split confirmation ── */}
            {step === 'splitConfirm' && (
              <SplitConfirmationScreen
                method1={splitMethod1}
                amount1={amount1}
                method2={splitMethod2}
                amount2={amount2}
                fare={trip?.fare ?? '$0'}
                colors={colors}
                onConfirm={confirmSplitFinal}
                onBack={() => setStep('split')}
              />
            )}

          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Confirmation styles ──────────────────────────────────────────────────────
const confirmStyles = StyleSheet.create({
  container:   { paddingHorizontal: 4, paddingTop: 8, gap: 12 },
  headerBox:   { borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  headerText:  { fontSize: 22, fontFamily: FONTS.black },
  instruction: { fontSize: 14, fontFamily: FONTS.semiBold, textAlign: 'center' },
  accountBox:  { borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  accountNum:  { fontSize: 20, fontFamily: FONTS.black, letterSpacing: 0.5 },
  fareBox:     { borderWidth: 1.5, borderRadius: RADIUS.xl, paddingVertical: 20, alignItems: 'center', gap: 4 },
  fareVal:     { fontSize: 52, fontFamily: FONTS.black, lineHeight: 58 },
  fareLabel:   { fontSize: 11, fontFamily: FONTS.extraBold, letterSpacing: 1.5 },
  noteBox:     { borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 16 },
  noteText:    { fontSize: 12, fontFamily: FONTS.semiBold, lineHeight: 18 },
  confirmBtn:  { borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  confirmText: { fontSize: 15, fontFamily: FONTS.black },
  backBtn:     { alignItems: 'center', paddingVertical: 14 },
  backText:    { fontSize: 13, fontFamily: FONTS.semiBold },
  splitRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 16, paddingHorizontal: 20 },
  splitLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  splitLabel:  { fontSize: 16, fontFamily: FONTS.black },
  splitAmount: { fontSize: 22, fontFamily: FONTS.black },
});

// ─── Chip styles ──────────────────────────────────────────────────────────────
const chipStyles = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip:  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, gap: 4 },
  icon:  { fontSize: 18 },
  label: { fontSize: 9, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 12, paddingHorizontal: 20, maxHeight: '92%' },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header:      { marginBottom: 20 },
  title:       { fontSize: 26, fontFamily: FONTS.black, marginBottom: 4 },
  sub:         { fontSize: 14, fontFamily: FONTS.semiBold },
  methodCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: RADIUS.xl, padding: 18, marginBottom: 12 },
  methodIconWrap:  { width: 40, alignItems: 'center', justifyContent: 'center' },
  methodIcon:      { fontSize: 32 },
  methodText:      { flex: 1 },
  methodLabel:     { fontSize: 18, fontFamily: FONTS.black, marginBottom: 3 },
  methodSub:       { fontSize: 12, fontFamily: FONTS.semiBold },
  methodArrow:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  methodArrowText: { fontSize: 24, lineHeight: 30, fontFamily: FONTS.black },
  splitToggle:     { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: RADIUS.xl, padding: 18, marginBottom: 12 },
  splitIcon:       { fontSize: 28 },
  splitSection:    { borderWidth: 1, borderRadius: RADIUS.xl, padding: 16, marginBottom: 12 },
  splitSectionLabel: { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1, marginBottom: 12 },
  amountRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
  amountLabel:     { fontSize: 13, fontFamily: FONTS.bold },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  amountCurrency:  { fontSize: 18, fontFamily: FONTS.black },
  amountInput:     { fontSize: 22, fontFamily: FONTS.black, minWidth: 60, textAlign: 'right' },
  confirmSplitBtn: { borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  confirmSplitText:{ fontSize: 15, fontFamily: FONTS.black, color: '#000' },
  cancelBtn:       { marginTop: 4, paddingVertical: 16, borderWidth: 1, borderRadius: RADIUS.xl, alignItems: 'center', marginBottom: 4 },
  cancelText:      { fontSize: 14, fontFamily: FONTS.extraBold },
});
