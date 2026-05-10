import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Animated, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

export default function ChangePinModal({ visible, onClose }) {
  const { colors } = useTheme();
  const { t }      = useLanguage();
  const insets     = useSafeAreaInsets();

  const [newPin,     setNewPin]     = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [done,       setDone]       = useState(false);

  const confirmRef = useRef(null);
  const slideAnim  = useRef(new Animated.Value(500)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(500);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  async function handleSave() {
    setError('');
    if (newPin.length < 4 || newPin.length > 6) {
      setError(t('pinTooShort'));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (newPin !== confirmPin) {
      setError(t('pinMismatch'));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(t('pinNotAvailableDemo'));
        setLoading(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPin });
      if (updateError) throw updateError;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      setTimeout(close, 2500);
    } catch (e) {
      setError(t('pinChangeError'));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
    }
  }

  function resetForm() {
    setNewPin('');
    setConfirmPin('');
    setError('');
    setDone(false);
    setLoading(false);
  }

  function close() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => { resetForm(); onClose(); });
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

          {!done ? (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>{t('changePIN')}</Text>
                  <Text style={[styles.titleSub, { color: colors.textMuted }]}>{t('changePINModalSub')}</Text>
                </View>
                <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.bgCard }]}>
                  <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>{t('newPIN')}</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderStrong }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={newPin}
                  onChangeText={v => { setNewPin(v.replace(/[^0-9]/g, '')); setError(''); }}
                  placeholder="••••"
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry
                  maxLength={6}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  selectionColor={colors.yellow}
                />
              </View>

              <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>{t('confirmPIN')}</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderStrong }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  ref={confirmRef}
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={confirmPin}
                  onChangeText={v => { setConfirmPin(v.replace(/[^0-9]/g, '')); setError(''); }}
                  placeholder="••••"
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry
                  maxLength={6}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  selectionColor={colors.yellow}
                />
              </View>

              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: colors.redFaint, borderColor: 'rgba(240,149,149,0.2)' }]}>
                  <Text style={[styles.errorText, { color: colors.red }]}>⚠  {error}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={loading}
                style={[styles.saveBtn, { backgroundColor: loading ? colors.border : colors.yellow }]}
              >
                {loading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.saveBtnText}>{t('savePIN')}</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.doneWrap}>
              <Text style={styles.doneIcon}>✅</Text>
              <Text style={[styles.doneTitle, { color: colors.textPrimary }]}>{t('pinUpdated')}</Text>
              <Text style={[styles.doneSub,  { color: colors.textMuted   }]}>{t('pinUpdatedSub')}</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet:        { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 14, paddingHorizontal: 22 },
  handle:       { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  title:        { fontSize: 24, fontFamily: FONTS.black },
  titleSub:     { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 3 },
  closeBtn:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, fontFamily: FONTS.bold },
  label:        { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1, marginBottom: 10 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.md, paddingLeft: 12, paddingRight: 8, height: 52 },
  inputIcon:    { fontSize: 15, marginRight: 6, lineHeight: 22 },
  input:        { flex: 1, fontFamily: FONTS.bold, fontSize: 18, letterSpacing: 6, padding: 0, margin: 0 },
  errorBox:     { marginTop: 14, padding: 12, borderWidth: 1, borderRadius: RADIUS.md },
  errorText:    { fontSize: 12, fontFamily: FONTS.bold },
  saveBtn:      { marginTop: 24, borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center' },
  saveBtnText:  { fontSize: 15, fontFamily: FONTS.black, color: '#000' },
  doneWrap:     { alignItems: 'center', paddingVertical: 32, gap: 14 },
  doneIcon:     { fontSize: 52 },
  doneTitle:    { fontSize: 24, fontFamily: FONTS.black },
  doneSub:      { fontSize: 14, fontFamily: FONTS.semiBold, textAlign: 'center', lineHeight: 22, opacity: 0.7 },
});
