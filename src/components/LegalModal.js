import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

const TERMS_EN = `Effective Date: January 1, 2025

1. ACCEPTANCE
By using the Allway Taxi Driver App, you agree to these Terms of Service. If you do not agree, you must not use the app.

2. DRIVER OBLIGATIONS
You must hold a valid driver's licence and maintain your vehicle in a roadworthy, clean condition at all times. You are solely responsible for complying with all applicable traffic laws, regulations, and insurance requirements while operating.

3. USE OF THE APP
The app is provided exclusively for accepting and managing passenger trip requests dispatched by Allway Taxi. You may not share your account credentials or permit another person to use your account. Misuse of the app, including falsifying trip data or location information, will result in immediate suspension.

4. GPS & LOCATION DATA
The app collects your GPS location, heading, and speed while you are on shift. This data is used to dispatch trips to the nearest available driver and to display fleet positions on the operations dashboard. Location tracking stops automatically when you end your shift.

5. PAYMENTS & FARES
All fares are set by Allway Taxi. You must record the correct payment method at the end of each trip. Payment disputes must be reported to your dispatcher within 24 hours of the trip.

6. INCIDENT REPORTS
You are required to report any accident, passenger complaint, vehicle damage, or road hazard through the in-app reporting feature as promptly as possible. Submitting false or misleading reports may result in account suspension.

7. ACCOUNT TERMINATION
Allway Taxi reserves the right to suspend or permanently terminate your account for violations of these Terms, sustained poor ratings, or misconduct reported by passengers or operations staff.

8. LIMITATION OF LIABILITY
The app is provided on an "as is" basis. Allway Taxi is not liable for any interruption of service, loss of earnings, or other losses arising from technical failures, connectivity issues, or force majeure events.

9. CHANGES TO TERMS
Allway Taxi may update these Terms at any time. Continued use of the app after any update constitutes acceptance of the revised Terms.

10. CONTACT
For questions about these Terms, contact your dispatcher or reach the Allway Taxi Operations team directly.`;

const PRIVACY_EN = `Effective Date: January 1, 2025

1. INFORMATION WE COLLECT
• Account Data: Your full name, phone number, vehicle model, licence plate, and profile photo.
• Location Data: GPS coordinates, speed, and heading while you are on shift.
• Trip Data: Trip history, routes, fares, distances, and payment methods.
• Incident Reports: Voice recordings and descriptions you submit through the report feature.
• Device Data: Expo push notification token used to send trip dispatch alerts.

2. HOW WE USE YOUR DATA
• To dispatch and manage trip requests in real time.
• To display your position on the Allway Taxi operations dashboard.
• To calculate shift duration, trip counts, and earnings.
• To review incident and safety reports submitted to operations.
• To send push notification alerts for new trip requests.
• To maintain accurate driver records for payroll and compliance.

3. DATA SHARING
Your personal data is never sold to third parties. Location and trip data is accessible to authorised Allway Taxi operations staff for fleet management and quality assurance. Trip records may be shared with passengers for receipt and dispute resolution purposes.

4. DATA RETENTION
Trip history, shift logs, and incident reports are retained for a minimum of two years for accounting, legal compliance, and safety review purposes. Profile data is retained for the duration of your employment and may be archived thereafter.

5. SECURITY
All data is transmitted over encrypted HTTPS connections and stored on Supabase cloud infrastructure with row-level security controls. Access is restricted to authorised personnel only.

6. YOUR RIGHTS
You have the right to request access to, correction of, or deletion of your personal data. To exercise these rights, contact your dispatcher or the Allway Taxi administration team directly.

7. COOKIES & ANALYTICS
The driver app does not use browser cookies or third-party analytics trackers. Anonymous crash and performance data may be collected by Expo to improve app stability.

8. CHANGES TO THIS POLICY
Allway Taxi may update this Privacy Policy at any time. Significant changes will be communicated through the app or via your dispatcher.

9. CONTACT
For data privacy enquiries, contact Allway Taxi Operations through your dispatcher.`;

const TERMS_AR = `تاريخ السريان: ١ يناير ٢٠٢٥

باستخدامك تطبيق سائق Allway Taxi، فإنك توافق على شروط الخدمة هذه.

للاطلاع على النص الكامل لشروط الخدمة يرجى التواصل مع المرسل أو إدارة Allway Taxi.

النقاط الرئيسية:
• يجب أن تمتلك رخصة قيادة سارية المفعول
• لا يجوز مشاركة بيانات حسابك مع أي شخص آخر
• يجب الإبلاغ عن أي حادث عبر التطبيق فور وقوعه
• جميع الأجور محددة من قِبل Allway Taxi
• يحق لـ Allway Taxi تعليق الحساب في حال مخالفة الشروط`;

const PRIVACY_AR = `تاريخ السريان: ١ يناير ٢٠٢٥

للاطلاع على النص الكامل لسياسة الخصوصية يرجى التواصل مع المرسل أو إدارة Allway Taxi.

البيانات التي نجمعها:
• بيانات الحساب: الاسم، رقم الهاتف، بيانات السيارة، الصورة الشخصية
• بيانات الموقع: إحداثيات GPS أثناء المناوبة
• بيانات الرحلات: السجل، الأجور، طرق الدفع
• التقارير الصوتية: التسجيلات المرسلة عبر ميزة الإبلاغ

كيف نستخدم بياناتك:
• لإرسال طلبات الرحلات في الوقت الفعلي
• لعرض موقعك على لوحة التحكم التشغيلية
• لحساب الأرباح وعدد الرحلات
• لمراجعة تقارير الحوادث

بياناتك لا تُباع لأي طرف ثالث.`;

export default function LegalModal({ type, visible, onClose }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(600);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  function close() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  }

  const isAr    = language === 'ar';
  const title   = type === 'terms' ? t('termsOfService') : t('privacyPolicy');
  const content = type === 'terms'
    ? (isAr ? TERMS_AR   : TERMS_EN)
    : (isAr ? PRIVACY_AR : PRIVACY_EN);

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
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <Text style={[styles.content, { color: colors.textSecondary }]}>{content}</Text>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet:        { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 14, paddingHorizontal: 22, maxHeight: '88%' },
  handle:       { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:        { fontSize: 20, fontFamily: FONTS.black, flex: 1, marginRight: 12 },
  closeBtn:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  closeBtnText: { fontSize: 13, fontFamily: FONTS.bold },
  body:         { paddingBottom: 16 },
  content:      { fontSize: 13, fontFamily: FONTS.semiBold, lineHeight: 22 },
});
