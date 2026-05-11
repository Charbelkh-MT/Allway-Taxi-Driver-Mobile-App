import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, TextInput, Alert, ScrollView,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

const WISH_NUMBER   = '+961 78 999 240';
const WALLET_NUMBER = '+961 78 999 240';

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

// Official Whish Money logo from whish.money
const WHISH_SVG = `<svg viewBox="0 0 123.91 27.58" xmlns="http://www.w3.org/2000/svg">
  <path fill="#FF003E" d="M67.96,5.4c-0.15-1.49-1.34-2.68-2.88-2.89c-1.49-0.2-2.72,0.58-3.26,2.06c-0.52,1.45-0.98,2.95-1.42,4.4c-0.19,0.61-0.37,1.23-0.56,1.84c-0.29,0.91-0.57,1.82-0.85,2.73l-0.24,0.76l-0.03,0l-0.31-0.86c-0.27-0.76-0.54-1.52-0.82-2.27c-0.22-0.6-0.44-1.2-0.66-1.8c-0.62-1.69-1.26-3.44-1.95-5.14c-0.46-1.13-1.44-1.75-2.79-1.75c-1.34,0.01-2.3,0.62-2.85,1.83c-0.27,0.59-0.49,1.12-0.67,1.62c-0.77,2.14-1.54,4.28-2.3,6.42l-0.7,1.96l-0.07,0l-0.1-0.3c-0.12-0.35-0.24-0.71-0.36-1.07c-0.28-0.86-0.56-1.73-0.84-2.6c-0.59-1.84-1.21-3.74-1.84-5.6c-0.48-1.41-1.54-2.26-2.84-2.26c-0.02,0-0.04,0-0.06,0c-0.02,0-0.03-0.02-0.05-0.02H25.61c-0.1,0-0.18,0.07-0.19,0.16c-0.01,0.09,0.04,0.18,0.13,0.21l10.7,3.18H8.82c-0.1,0-0.18,0.08-0.19,0.18C8.63,6.32,8.7,6.4,8.8,6.42l27.9,3.71H1.74c-0.1,0-0.18,0.08-0.19,0.18c-0.01,0.1,0.06,0.19,0.16,0.2l37.1,5.54H16.16c-0.1,0-0.18,0.07-0.19,0.17c-0.01,0.1,0.06,0.19,0.15,0.21l24.9,4.63H26.26c-0.1,0-0.18,0.07-0.19,0.17c-0.01,0.09,0.05,0.19,0.14,0.21l18.33,4.53c0.09,0.03,0.18,0.05,0.27,0.07L45,26.08c0.02,0,0.03,0.01,0.05,0.01c0,0,0,0,0.01,0c0.17,0.02,0.34,0.04,0.52,0.04c1.38,0,2.34-0.64,2.84-1.91c0.56-1.41,1.11-2.82,1.66-4.23l0.33-0.85c0.38-0.98,0.76-1.96,1.18-3.02l0.58-1.49c0.04,0.08,0.07,0.16,0.1,0.23c0.15,0.33,0.25,0.57,0.35,0.81c0.36,0.9,0.72,1.8,1.07,2.7c0.75,1.91,1.53,3.88,2.34,5.81c0.53,1.26,1.6,2.01,2.88,2.01c0.38,0,0.76-0.07,1.13-0.21c1.26-0.46,1.75-1.58,2.1-2.58c1.7-4.83,3.46-9.94,5.55-16.09C67.85,6.81,68.03,6.09,67.96,5.4z"/>
  <path fill="#606060" d="M80.07,15.55h-1.2c-0.1,0-0.19-0.06-0.22-0.16l-1.82-5.5l-1.79,5.5c-0.03,0.1-0.12,0.16-0.22,0.16h-1.2c-0.1,0-0.19-0.06-0.22-0.16l-2.39-7.56C71,7.76,71.01,7.68,71.06,7.62c0.04-0.06,0.11-0.09,0.19-0.09h1.18c0.1,0,0.19,0.07,0.22,0.17l1.63,5.49l1.82-5.49c0.03-0.09,0.12-0.16,0.22-0.16h1.07c0.1,0,0.19,0.06,0.22,0.16l1.85,5.5l1.62-5.49c0.03-0.1,0.12-0.17,0.22-0.17h1.16c0.07,0,0.14,0.03,0.19,0.09c0.04,0.06,0.06,0.14,0.03,0.21l-2.39,7.56C80.26,15.49,80.17,15.55,80.07,15.55z"/>
  <path fill="#606060" d="M93.5,15.55h-1.1c-0.13,0-0.23-0.1-0.23-0.23v-4.19c0-0.38-0.03-0.73-0.09-1.04c-0.06-0.29-0.16-0.54-0.3-0.75c-0.14-0.2-0.31-0.35-0.54-0.46c-0.4-0.19-1.07-0.26-1.65-0.01c-0.24,0.1-0.46,0.27-0.65,0.48c-0.19,0.22-0.35,0.5-0.47,0.84c-0.12,0.35-0.18,0.76-0.18,1.24v3.88c0,0.13-0.1,0.23-0.23,0.23h-1.1c-0.13,0-0.23-0.1-0.23-0.23V3.1c0-0.13,0.1-0.23,0.23-0.23h1.1c0.13,0,0.23,0.1,0.23,0.23v5.19C88.48,8.08,88.72,7.9,89,7.75c0.5-0.28,1.05-0.42,1.63-0.42c1.03,0,1.81,0.31,2.34,0.94c0.51,0.61,0.77,1.42,0.77,2.41v4.64C93.74,15.45,93.63,15.55,93.5,15.55z"/>
  <path fill="#606060" d="M100.05,15.55h-1.1c-0.13,0-0.23-0.1-0.23-0.23V7.76c0-0.13,0.1-0.23,0.23-0.23h1.1c0.13,0,0.23,0.1,0.23,0.23v7.56C100.28,15.45,100.18,15.55,100.05,15.55z M99.5,5.85c-0.25,0-0.48-0.09-0.69-0.28c-0.21-0.19-0.32-0.44-0.32-0.73c0-0.29,0.11-0.54,0.32-0.73c0.41-0.37,0.97-0.37,1.38,0c0.21,0.19,0.32,0.44,0.32,0.73c0,0.29-0.11,0.54-0.32,0.73C99.99,5.76,99.76,5.85,99.5,5.85z"/>
  <path fill="#606060" d="M107.71,15.75c-0.6,0-1.19-0.13-1.76-0.37c-0.58-0.25-1.06-0.66-1.42-1.2c-0.07-0.1-0.05-0.24,0.05-0.32l0.87-0.65c0.05-0.04,0.12-0.05,0.19-0.04c0.06,0.01,0.12,0.05,0.15,0.11c0.17,0.3,0.43,0.55,0.77,0.76c0.52,0.31,1.2,0.36,1.76,0.25c0.19-0.04,0.35-0.1,0.48-0.19c0.13-0.09,0.24-0.2,0.32-0.33c0.08-0.13,0.11-0.3,0.11-0.51c0-0.31-0.14-0.53-0.45-0.69c-0.37-0.19-0.91-0.37-1.6-0.54c-0.23-0.06-0.48-0.12-0.74-0.21c-0.28-0.09-0.54-0.22-0.77-0.39c-0.24-0.17-0.44-0.4-0.6-0.66c-0.16-0.27-0.24-0.61-0.24-1.01c0-0.43,0.09-0.8,0.26-1.11c0.17-0.31,0.4-0.56,0.68-0.76c0.27-0.19,0.59-0.34,0.94-0.43c0.88-0.23,1.83-0.17,2.7,0.24c0.54,0.26,0.95,0.62,1.22,1.09c0.06,0.1,0.03,0.23-0.06,0.3l-0.84,0.63c-0.05,0.04-0.13,0.06-0.19,0.04c-0.07-0.01-0.12-0.06-0.15-0.12c-0.14-0.27-0.36-0.5-0.65-0.68c-0.43-0.26-0.96-0.33-1.54-0.21c-0.17,0.04-0.31,0.1-0.44,0.18c-0.12,0.08-0.22,0.18-0.29,0.3c-0.07,0.12-0.1,0.25-0.1,0.41c0,0.28,0.1,0.48,0.33,0.62c0.27,0.17,0.7,0.32,1.29,0.44c0.94,0.19,1.62,0.47,2.08,0.85c0.48,0.4,0.72,0.93,0.72,1.59c0,0.47-0.09,0.88-0.28,1.21c-0.18,0.33-0.43,0.6-0.72,0.8c-0.29,0.2-0.63,0.35-0.99,0.44C108.44,15.7,108.08,15.75,107.71,15.75z"/>
  <path fill="#606060" d="M121.91,15.55h-1.1c-0.13,0-0.23-0.1-0.23-0.23v-4.19c0-0.38-0.03-0.73-0.09-1.04c-0.06-0.29-0.16-0.54-0.3-0.75c-0.13-0.2-0.32-0.35-0.54-0.46c-0.4-0.2-1.05-0.27-1.65-0.01c-0.24,0.1-0.46,0.27-0.65,0.48c-0.19,0.22-0.35,0.5-0.47,0.84c-0.12,0.35-0.18,0.76-0.18,1.24v3.88c0,0.13-0.1,0.23-0.23,0.23h-1.1c-0.13,0-0.23-0.1-0.23-0.23V3.1c0-0.13,0.1-0.23,0.23-0.23h1.1c0.13,0,0.23,0.1,0.23,0.23v5.19c0.19-0.21,0.43-0.39,0.71-0.54c0.51-0.28,1.06-0.42,1.63-0.42c1.03,0,1.81,0.31,2.34,0.94c0.51,0.61,0.77,1.42,0.77,2.41v4.64C122.14,15.45,122.04,15.55,121.91,15.55z"/>
</svg>`;

// Crop the viewBox to the left wave so only the red W mark renders
const WHISH_W_ONLY = `<svg viewBox="0 0 68 27.58" xmlns="http://www.w3.org/2000/svg">
  <path fill="#FF003E" d="M67.96,5.4c-0.15-1.49-1.34-2.68-2.88-2.89c-1.49-0.2-2.72,0.58-3.26,2.06c-0.52,1.45-0.98,2.95-1.42,4.4c-0.19,0.61-0.37,1.23-0.56,1.84c-0.29,0.91-0.57,1.82-0.85,2.73l-0.24,0.76l-0.03,0l-0.31-0.86c-0.27-0.76-0.54-1.52-0.82-2.27c-0.22-0.6-0.44-1.2-0.66-1.8c-0.62-1.69-1.26-3.44-1.95-5.14c-0.46-1.13-1.44-1.75-2.79-1.75c-1.34,0.01-2.3,0.62-2.85,1.83c-0.27,0.59-0.49,1.12-0.67,1.62c-0.77,2.14-1.54,4.28-2.3,6.42l-0.7,1.96l-0.07,0l-0.1-0.3c-0.12-0.35-0.24-0.71-0.36-1.07c-0.28-0.86-0.56-1.73-0.84-2.6c-0.59-1.84-1.21-3.74-1.84-5.6c-0.48-1.41-1.54-2.26-2.84-2.26c-0.02,0-0.04,0-0.06,0c-0.02,0-0.03-0.02-0.05-0.02H25.61c-0.1,0-0.18,0.07-0.19,0.16c-0.01,0.09,0.04,0.18,0.13,0.21l10.7,3.18H8.82c-0.1,0-0.18,0.08-0.19,0.18C8.63,6.32,8.7,6.4,8.8,6.42l27.9,3.71H1.74c-0.1,0-0.18,0.08-0.19,0.18c-0.01,0.1,0.06,0.19,0.16,0.2l37.1,5.54H16.16c-0.1,0-0.18,0.07-0.19,0.17c-0.01,0.1,0.06,0.19,0.15,0.21l24.9,4.63H26.26c-0.1,0-0.18,0.07-0.19,0.17c-0.01,0.09,0.05,0.19,0.14,0.21l18.33,4.53c0.09,0.03,0.18,0.05,0.27,0.07L45,26.08c0.02,0,0.03,0.01,0.05,0.01c0,0,0,0,0.01,0c0.17,0.02,0.34,0.04,0.52,0.04c1.38,0,2.34-0.64,2.84-1.91c0.56-1.41,1.11-2.82,1.66-4.23l0.33-0.85c0.38-0.98,0.76-1.96,1.18-3.02l0.58-1.49c0.04,0.08,0.07,0.16,0.1,0.23c0.15,0.33,0.25,0.57,0.35,0.81c0.36,0.9,0.72,1.8,1.07,2.7c0.75,1.91,1.53,3.88,2.34,5.81c0.53,1.26,1.6,2.01,2.88,2.01c0.38,0,0.76-0.07,1.13-0.21c1.26-0.46,1.75-1.58,2.1-2.58c1.7-4.83,3.46-9.94,5.55-16.09C67.85,6.81,68.03,6.09,67.96,5.4z"/>
</svg>`;

function WishLogo({ size = 26 }) {
  const w = size * (68 / 27.58);
  return <SvgXml xml={WHISH_W_ONLY} width={w} height={size} />;
}

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

function BackArrow({ onBack, colors }) {
  return (
    <TouchableOpacity onPress={onBack} style={arrowStyles.btn} activeOpacity={0.7}>
      <Text style={[arrowStyles.arrow, { color: colors.textMuted }]}>‹</Text>
    </TouchableOpacity>
  );
}

function ConfirmationScreen({ method, fare, colors, onConfirm, onBack }) {
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
      <BackArrow onBack={onBack} colors={colors} />

      <View style={[confirmStyles.headerBox, { borderColor: `${cfg.accent}30`, backgroundColor: method === 'wish' ? '#fff' : `${cfg.accent}10` }]}>
        {method === 'wish' ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <SvgXml xml={WHISH_SVG} width={180} height={40} />
          </View>
        ) : (
          <Text style={[confirmStyles.headerText, { color: cfg.accent }]}>{cfg.header}</Text>
        )}
      </View>

      {cfg.lines.map((line, i) => (
        <Text key={i} style={[confirmStyles.instruction, { color: colors.textMuted }]}>{line}</Text>
      ))}

      {cfg.account && (
        <View style={[confirmStyles.accountBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[confirmStyles.accountNum, { color: colors.textPrimary }]}>{cfg.account}</Text>
        </View>
      )}

      <View style={[confirmStyles.fareBox, { borderColor: `${cfg.accent}40`, backgroundColor: `${cfg.accent}12` }]}>
        <Text style={[confirmStyles.fareVal, { color: cfg.accent }]}>{fare}</Text>
        <Text style={[confirmStyles.fareLabel, { color: colors.textMuted }]}>AMOUNT</Text>
      </View>

      <View style={[confirmStyles.noteBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[confirmStyles.noteText, { color: colors.textMuted }]}>ⓘ  {cfg.note}</Text>
      </View>

      <TouchableOpacity
        onPress={onConfirm}
        activeOpacity={0.85}
        style={[confirmStyles.confirmBtn, { backgroundColor: cfg.accent }]}
      >
        <Text style={[confirmStyles.confirmText, { color: method === 'wish' ? '#0A1F44' : '#000' }]}>
          {cfg.btnLabel}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

function SplitConfirmationScreen({ method1, amount1, method2, amount2, fare, colors, onConfirm, onBack }) {
  const icons = { cash: '💵', card: '💳', wish: null, wallet: '💰', debt: '📋' };
  const labels = { cash: 'Cash', card: 'Card', wish: 'Whish', wallet: 'Wallet', debt: 'Account' };

  return (
    <View style={confirmStyles.container}>
      <BackArrow onBack={onBack} colors={colors} />
      <View style={[confirmStyles.headerBox, { borderColor: `${colors.yellow}30`, backgroundColor: `${colors.yellow}10` }]}>
        <Text style={[confirmStyles.headerText, { color: colors.yellow }]}>🔀 Split Payment</Text>
      </View>

      <Text style={[confirmStyles.instruction, { color: colors.textMuted }]}>Total fare: {fare}</Text>

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

    </View>
  );
}

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
  const stepAnim = useRef(new Animated.Value(1)).current;

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

  function animateStep(nextStep, nextMethod = null) {
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(stepAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      if (nextMethod !== null) setChosenMethod(nextMethod);
      setStep(nextStep);
    }, 120);
  }

  async function selectMethod(methodId) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateStep('confirm', methodId);
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
    animateStep('splitConfirm');
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
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>

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

                {totalFare > 0 && (
                  <TouchableOpacity
                    onPress={() => animateStep('split')}
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

            {step === 'confirm' && chosenMethod && (
              <ConfirmationScreen
                method={chosenMethod}
                fare={trip?.fare ?? '$0'}
                colors={colors}
                onConfirm={confirmPayment}
                onBack={() => animateStep('select')}
              />
            )}

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
                <TouchableOpacity onPress={() => animateStep('select')} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('back')}</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'splitConfirm' && (
              <SplitConfirmationScreen
                method1={splitMethod1}
                amount1={amount1}
                method2={splitMethod2}
                amount2={amount2}
                fare={trip?.fare ?? '$0'}
                colors={colors}
                onConfirm={confirmSplitFinal}
                onBack={() => animateStep('split')}
              />
            )}

          </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const arrowStyles = StyleSheet.create({
  btn:   { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 16, marginBottom: 4 },
  arrow: { fontSize: 36, lineHeight: 36, fontFamily: FONTS.black },
});

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
  splitRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 16, paddingHorizontal: 20 },
  splitLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  splitLabel:  { fontSize: 16, fontFamily: FONTS.black },
  splitAmount: { fontSize: 22, fontFamily: FONTS.black },
});

const chipStyles = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip:  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, gap: 4 },
  icon:  { fontSize: 18 },
  label: { fontSize: 9, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 12, paddingHorizontal: 20, maxHeight: '92%' },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header:      { marginBottom: 20 },
  title:       { fontSize: 26, fontFamily: FONTS.black, marginBottom: 4 },
  sub:         { fontSize: 14, fontFamily: FONTS.semiBold },
  methodCard:      { flexDirection: 'row', alignItems: 'center', gap: 18, borderWidth: 1.5, borderRadius: RADIUS.xl, padding: 18, marginBottom: 12 },
  methodIconWrap:  { width: 52, alignItems: 'center', justifyContent: 'center' },
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
