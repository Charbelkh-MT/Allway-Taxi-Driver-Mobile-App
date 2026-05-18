import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated, KeyboardAvoidingView,
  Platform, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';
import {
  isBiometricAvailable, isBiometricEnabled, enableBiometric,
  authenticateWithBiometric, getBiometricCredentials, getBiometricType,
} from '../utils/biometric';

function mapLoginError(message, t) {
  const msg = (message ?? '').toLowerCase();
  if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('not found'))
    return t('loginWrongCredentials');
  if (msg.includes('too many') || msg.includes('rate limit') || msg.includes('quota'))
    return t('loginTooManyAttempts');
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect'))
    return t('loginNetworkError');
  return t('loginFailed');
}

export default function LoginScreen() {
  const { login }            = useAuth();
  const { colors }           = useTheme();
  const { t, isRTL }         = useLanguage();
  const [phone, setPhone]        = useState('');
  const [pin, setPin]            = useState('');
  const [error, setError]        = useState('');
  const [loading, setLoading]    = useState(false);
  const [success, setSuccess]    = useState(false);
  const [showBiometric,  setShowBiometric]  = useState(false);
  const [biometricType,  setBiometricType]  = useState('fingerprint'); // 'face' | 'fingerprint'

  const shakeAnim      = useRef(new Animated.Value(0)).current;
  const logoScale      = useRef(new Animated.Value(0.6)).current;
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const formSlide      = useRef(new Animated.Value(40)).current;
  const formOpacity    = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayScale   = useRef(new Animated.Value(0.92)).current;
  const pinRef         = useRef(null);

  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      const enabled   = await isBiometricEnabled();
      if (available) setBiometricType(await getBiometricType());
      setShowBiometric(available && enabled);
    }
    checkBiometric();
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formSlide,   { toValue: 0, duration: 380, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!phone || pin.length < 4) {
      setError(t('loginError'));
      triggerShake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(phone, pin);
      // Offer biometric setup after first successful manual login
      const available = await isBiometricAvailable();
      const enabled   = await isBiometricEnabled();
      if (available && !enabled) {
        const isFace = biometricType === 'face';
        Alert.alert(
          isFace ? t('enableFaceIdQ')  : t('enableBiometricQ'),
          isFace ? t('enableFaceIdMsg') : t('enableBiometricMsg'),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('enableBiometricYes'), onPress: () => enableBiometric(phone, pin) },
          ]
        );
      }
      setSuccess(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(overlayScale,   { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      setError(mapLoginError(e.message, t));
      triggerShake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    setError('');
    setLoading(true);
    try {
      const isFace  = biometricType === 'face';
      const prompt  = isFace ? t('faceIdPrompt') : t('biometricPrompt');
      const result  = await authenticateWithBiometric(prompt);

      if (!result.success) {
        // User pressed Cancel — do nothing, let them type their PIN
        const cancelled = result.error === 'user_cancel' || result.error === 'system_cancel';
        if (!cancelled) {
          setError(isFace ? t('faceIdFailed') : t('biometricFailed'));
          triggerShake();
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }

      const creds = await getBiometricCredentials();
      if (!creds) {
        setError(isFace ? t('faceIdFailed') : t('biometricFailed'));
        return;
      }
      await login(creds.phone, creds.pin);
      setSuccess(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(overlayScale,   { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      setError(mapLoginError(e.message, t));
      triggerShake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  function triggerShake() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.outer, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ alignItems: 'center', opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image
            source={require('../../assets/allway-main-logo.jpg')}
            style={styles.logo}
            resizeMode="cover"
          />

          <View style={[styles.portalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.portalLine, { backgroundColor: colors.yellow }]} />
            <View style={[styles.portalBadge, { backgroundColor: colors.yellowFaint, borderColor: `${colors.yellow}35` }]}>
              <Text style={[styles.portalText, { color: colors.yellow }]}>{t('driverPortal')}</Text>
            </View>
            <View style={[styles.portalLine, { backgroundColor: colors.yellow }]} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.cardWrap, { opacity: formOpacity, transform: [{ translateX: shakeAnim }, { translateY: formSlide }] }]}>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>

            <Text style={[styles.label, { color: colors.textMuted }]}>{t('phoneNumber')}</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderStrong }]}>
              <Text style={styles.inputIcon}>📞</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="70123456"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => pinRef.current?.focus()}
                selectionColor={colors.yellow}
                autoCapitalize="none"
              />
            </View>

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>{t('pinCode')}</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderStrong }]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                ref={pinRef}
                style={[styles.input, styles.pinInput, { color: colors.textPrimary }]}
                value={pin}
                onChangeText={setPin}
                placeholder="••••"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry
                maxLength={6}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                selectionColor={colors.yellow}
              />
            </View>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: colors.redFaint, borderColor: 'rgba(240,149,149,0.2)' }]}>
                <Text style={[styles.errorText, { color: colors.red }]}>⚠  {error}</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85} style={styles.btnWrap}>
              <LinearGradient
                colors={[colors.yellow, colors.yellowDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btn}
              >
                {loading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.btnText}>{t('signIn')}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert(t('forgotPinTitle'), t('forgotPinMsg'))}
              activeOpacity={0.7}
              style={styles.forgotPin}
            >
              <Text style={[styles.forgotPinText, { color: colors.textDisabled }]}>{t('forgotPin')}</Text>
            </TouchableOpacity>

            {showBiometric && (
              <TouchableOpacity
                onPress={handleBiometricLogin}
                disabled={loading}
                activeOpacity={0.75}
                style={[styles.biometricBtn, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
              >
                <Text style={styles.biometricIcon}>
                  {biometricType === 'face' ? '🪪' : '👆'}
                </Text>
                <Text style={[styles.biometricText, { color: colors.textSecondary }]}>
                  {biometricType === 'face' ? t('faceIdLogin') : t('biometricLogin')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

      </ScrollView>

      {success && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.overlay,
            { backgroundColor: colors.bg, opacity: overlayOpacity },
          ]}
          pointerEvents="none"
        >
          <Animated.View style={[styles.overlayInner, { transform: [{ scale: overlayScale }] }]}>
            <Image
              source={require('../../assets/allway-main-logo.jpg')}
              style={styles.overlayLogo}
              resizeMode="cover"
            />
            <ActivityIndicator color={colors.yellow} size="large" style={{ marginTop: 36 }} />
            <Text style={[styles.overlayTitle, { color: colors.textPrimary }]}>{t('welcomeBack')}</Text>
            <Text style={[styles.overlaySub,   { color: colors.textMuted   }]}>{t('gettingDashboard')}</Text>
          </Animated.View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer:  { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },

  // Logo
  logo: { width: 300, height: 150, borderRadius: 36 },

  portalRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 36 },
  portalLine:  { flex: 1, height: 1, opacity: 0.5 },
  portalBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 14, borderRadius: RADIUS.full, borderWidth: 1 },
  portalText:  { fontSize: 12, fontFamily: FONTS.extraBold, letterSpacing: 1.6 },

  cardWrap: { width: '100%' },
  card:     { width: '100%', borderWidth: 1, borderRadius: RADIUS.xxxl, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },

  label:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 0.8, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.md, paddingLeft: 12, paddingRight: 8, height: 52 },
  inputIcon:{ fontSize: 15, marginRight: 6, lineHeight: 22 },
  input:    { flex: 1, fontFamily: FONTS.bold, fontSize: 15, padding: 0, margin: 0, letterSpacing: 0 },
  pinInput: { letterSpacing: 6, fontSize: 18 },

  errorBox:  { marginTop: 14, padding: 12, borderWidth: 1, borderRadius: RADIUS.md },
  errorText: { fontSize: 12, fontFamily: FONTS.bold },

  btnWrap:       { marginTop: 20, borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn:           { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  btnText:       { fontSize: 15, fontFamily: FONTS.black, color: '#000', letterSpacing: 0.3 },
  forgotPin:     { marginTop: 14, alignItems: 'center' },
  forgotPinText: { fontSize: 12, fontFamily: FONTS.semiBold },
  biometricBtn:  { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1 },
  biometricIcon: { fontSize: 20 },
  biometricText: { fontSize: 14, fontFamily: FONTS.bold },

  overlay:      { alignItems: 'center', justifyContent: 'center' },
  overlayInner: { alignItems: 'center', paddingHorizontal: 40 },
  overlayLogo:  { width: 240, height: 120, borderRadius: 28 },
  overlayTitle: { fontSize: 26, fontFamily: FONTS.black, marginTop: 20 },
  overlaySub:   { fontSize: 13, fontFamily: FONTS.semiBold, marginTop: 8, textAlign: 'center' },
});
