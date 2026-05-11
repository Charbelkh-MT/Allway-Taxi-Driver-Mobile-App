import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, ScrollView, Linking, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

// Replace with real numbers before go-live
const SUPPORT_PHONE    = '+9611234567';
const WHATSAPP_NUMBER  = '+9611234567';

const FAQS = [
  {
    q: 'How do I start receiving trips?',
    a: 'Tap "Start Shift" on the home screen. You will go online and start receiving trip requests immediately.',
  },
  {
    q: 'How do I accept a trip?',
    a: 'When a trip request appears, tap "✓ Accept Trip" within 84 seconds. If you don\'t respond in time, the request expires automatically.',
  },
  {
    q: 'What do I do if the customer doesn\'t show up?',
    a: 'Tap the "No Show" button on the active trip screen, then confirm. The trip will be marked accordingly and you will return to scanning.',
  },
  {
    q: 'How do I cancel a trip?',
    a: 'Use the "Cancel Trip" link at the bottom of the active trip screen. Only use this in emergency situations — the dispatcher will be notified.',
  },
  {
    q: 'How do I collect payment?',
    a: 'When you arrive at the drop-off, tap "End Trip & Collect Payment" and select the payment method: Cash, Card, Wish, Wallet, or Account.',
  },
  {
    q: 'I ended my shift by mistake. What do I do?',
    a: 'When the shift summary appears, tap "Continue Working" to resume your shift. Your GPS and trip queue will continue as normal.',
  },
  {
    q: 'How do I report an incident?',
    a: 'Go to Account → Report an Issue. Record a short voice message describing the incident and tap Send. The operations team will follow up.',
  },
  {
    q: 'How do I change my PIN?',
    a: 'Go to Account → Change PIN, enter your new PIN twice, and tap Save. Your PIN must be 4 to 6 digits.',
  },
  {
    q: 'The app is not responding. What do I do?',
    a: 'Close the app completely and reopen it. If the problem continues, call the dispatcher directly using the button above.',
  },
  {
    q: 'My GPS is not working. What do I do?',
    a: 'Make sure location permissions are enabled for this app in your phone\'s Settings. Then end and restart your shift.',
  },
];

function FaqItem({ item, colors }) {
  const [open, setOpen] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpen(v => !v); }}
      activeOpacity={0.75}
      style={[styles.faqItem, { borderBottomColor: colors.border }]}
    >
      <View style={styles.faqRow}>
        <Text style={[styles.faqQ, { color: colors.textPrimary, flex: 1 }]}>{item.q}</Text>
        <Text style={[styles.faqChevron, { color: colors.yellow }]}>{open ? '▾' : '›'}</Text>
      </View>
      {open && (
        <Text style={[styles.faqA, { color: colors.textSecondary }]}>{item.a}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpSupportModal({ visible, onClose }) {
  const { colors, isDark } = useTheme();
  const { t }              = useLanguage();
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

  function close() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 700, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  }

  async function handleCall() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `tel:${SUPPORT_PHONE}`;
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
    else Alert.alert('Call Support', SUPPORT_PHONE);
  }

  async function handleWhatsApp() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `whatsapp://send?phone=${WHATSAPP_NUMBER.replace(/\s|\+/g, '')}`;
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
    else Alert.alert('WhatsApp', `Send a message to ${WHATSAPP_NUMBER}`);
  }

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />

        <Animated.View style={[
          styles.sheet,
          { backgroundColor: colors.bg, paddingBottom: insets.bottom + 24 },
          { transform: [{ translateY: slideAnim }] },
        ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Help & Support</Text>
              <Text style={[styles.titleSub, { color: colors.textMuted }]}>Contact us or find answers below</Text>
            </View>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Contact buttons */}
          <View style={styles.contactRow}>
            <TouchableOpacity
              onPress={handleCall}
              activeOpacity={0.85}
              style={[styles.contactBtn, { backgroundColor: `${colors.green}15`, borderColor: `${colors.green}40` }]}
            >
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={[styles.contactLabel, { color: colors.green }]}>Call Support</Text>
              <Text style={[styles.contactSub, { color: colors.textMuted }]}>{SUPPORT_PHONE}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsApp}
              activeOpacity={0.85}
              style={[styles.contactBtn, { backgroundColor: `${colors.yellow}15`, borderColor: `${colors.yellow}40` }]}
            >
              <Text style={styles.contactIcon}>💬</Text>
              <Text style={[styles.contactLabel, { color: colors.yellow }]}>WhatsApp</Text>
              <Text style={[styles.contactSub, { color: colors.textMuted }]}>{WHATSAPP_NUMBER}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.faqHeading, { color: colors.textMuted }]}>FREQUENTLY ASKED QUESTIONS</Text>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={[styles.faqCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
              {FAQS.map((item, i) => (
                <FaqItem
                  key={i}
                  item={item}
                  colors={colors}
                />
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet:         { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 14, paddingHorizontal: 22, maxHeight: '92%' },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  title:         { fontSize: 24, fontFamily: FONTS.black },
  titleSub:      { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 3 },
  closeBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:  { fontSize: 13, fontFamily: FONTS.bold },

  contactRow:    { flexDirection: 'row', gap: 12, marginBottom: 24 },
  contactBtn:    { flex: 1, borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', gap: 6 },
  contactIcon:   { fontSize: 26 },
  contactLabel:  { fontSize: 14, fontFamily: FONTS.extraBold },
  contactSub:    { fontSize: 11, fontFamily: FONTS.semiBold },

  faqHeading:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  faqCard:       { borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 8 },
  shadow:        { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  faqItem:       { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16, paddingHorizontal: 16 },
  faqRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqQ:          { fontSize: 14, fontFamily: FONTS.bold, lineHeight: 20 },
  faqChevron:    { fontSize: 20, lineHeight: 24, flexShrink: 0 },
  faqA:          { fontSize: 13, fontFamily: FONTS.semiBold, lineHeight: 20, marginTop: 10 },
});
