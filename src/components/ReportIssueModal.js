import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { supabase } from '../utils/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function ReportIssueModal({ visible, onClose }) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const [isRecording,  setIsRecording]  = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [duration,     setDuration]     = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [sent,         setSent]         = useState(false);

  const recRef      = useRef(null);
  const soundRef    = useRef(null);
  const timerRef    = useRef(null);
  const slideAnim   = useRef(new Animated.Value(600)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(600);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  useEffect(() => {
    if (!isRecording) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isRecording]);

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone Access', 'Please allow microphone access in your settings to record an issue.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recRef.current = recording;
      setIsRecording(true);
      setDuration(0);
      setRecordingUri(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 120) { stopRecording(); return prev; }
          return prev + 1;
        });
      }, 1000);
    } catch (e) { console.warn('[Record] start:', e.message); }
  }

  async function stopRecording() {
    clearInterval(timerRef.current);
    if (!recRef.current) return;
    try {
      await recRef.current.stopAndUnloadAsync();
      const uri = recRef.current.getURI();
      setRecordingUri(uri);
      recRef.current = null;
      setIsRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.warn('[Record] stop:', e.message); }
  }

  async function playBack() {
    if (!recordingUri) return;
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri }, { shouldPlay: true });
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.didJustFinish) { setIsPlaying(false); sound.unloadAsync(); soundRef.current = null; }
      });
    } catch (e) { console.warn('[Playback]:', e.message); }
  }

  async function stopPlayback() {
    if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; }
    setIsPlaying(false);
  }

  function reset() { setRecordingUri(null); setDuration(0); }

  async function handleSend() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSent(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && recordingUri) {
        // Read recording as base64
        const base64 = await FileSystem.readAsStringAsync(recordingUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

        // Upload to Supabase Storage → voice-reports bucket
        const fileName = `${user.id}/${Date.now()}.m4a`;
        const { error: uploadError } = await supabase.storage
          .from('voice-reports')
          .upload(fileName, bytes, { contentType: 'audio/m4a', upsert: false });

        if (!uploadError) {
          // Create a support ticket row
          await supabase.from('support_tickets').insert({
            driver_id:    user.id,
            audio_path:   fileName,
            submitted_at: new Date().toISOString(),
            status:       'open',
          });
        }
      }
    } catch (e) {
      console.warn('[ReportIssue] upload error:', e.message);
    }

    setTimeout(() => { setSent(false); reset(); close(); }, 2500);
  }

  function close() {
    if (isRecording) stopRecording();
    if (soundRef.current) { soundRef.current.unloadAsync(); soundRef.current = null; }
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => { reset(); setSent(false); onClose(); });
  }

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />

        <Animated.View style={[
          styles.sheet,
          { backgroundColor: colors.bg, paddingBottom: insets.bottom + 28 },
          { transform: [{ translateY: slideAnim }] },
        ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{t('reportIssueTitle')}</Text>
              <Text style={[styles.titleSub, { color: colors.textMuted }]}>{t('reportIssueSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {!sent ? (
            <>
              {/* Instructions */}
              <Text style={[styles.instructions, { color: colors.textMuted }]}>
                {t('reportIssueDesc')}
              </Text>

              {/* Timer */}
              <Text style={[styles.timer, { color: isRecording ? colors.red : recordingUri ? colors.green : colors.textDisabled }]}>
                {fmt(duration)}
                {isRecording ? `  ${t('recordingLabel')}` : recordingUri ? `  ${t('recordedLabel')}` : ''}
              </Text>

              {/* Record button */}
              {!recordingUri && (
                <Animated.View style={[styles.btnWrap, { transform: [{ scale: pulseAnim }] }]}>
                  <TouchableOpacity
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    activeOpacity={0.85}
                    style={[styles.recordBtn, { backgroundColor: isRecording ? colors.red : colors.yellow }]}
                  >
                    <Text style={styles.recordBtnIcon}>{isRecording ? '⏹' : '🎙'}</Text>
                    <Text style={styles.recordBtnText}>{isRecording ? t('releaseToStop') : t('holdToRecord')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Post-recording actions */}
              {!!recordingUri && (
                <>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={isPlaying ? stopPlayback : playBack}
                      activeOpacity={0.8}
                      style={[styles.actionBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
                        {isPlaying ? t('stopPlay') : t('playBack')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={reset}
                      activeOpacity={0.8}
                      style={[styles.actionBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>{t('reRecord')}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleSend} activeOpacity={0.85} style={[styles.sendBtn, { backgroundColor: colors.yellow }]}>
                    <Text style={styles.sendBtnText}>{t('sendVoiceReport')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            /* Sent confirmation */
            <View style={styles.sentWrap}>
              <Text style={styles.sentIcon}>✅</Text>
              <Text style={[styles.sentTitle, { color: colors.textPrimary }]}>{t('reportSent')}</Text>
              <Text style={[styles.sentSub, { color: colors.textMuted }]}>
                {t('reportSentSub')}
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet:         { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 14, paddingHorizontal: 22 },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

  header:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  title:         { fontSize: 24, fontFamily: FONTS.black },
  titleSub:      { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 3 },
  closeBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:  { fontSize: 13, fontFamily: FONTS.bold },

  instructions:  { fontSize: 14, fontFamily: FONTS.semiBold, lineHeight: 22, marginBottom: 32 },

  timer:         { fontSize: 22, fontFamily: FONTS.black, textAlign: 'center', marginBottom: 28, fontVariant: ['tabular-nums'] },

  btnWrap:       { alignItems: 'center', marginBottom: 8 },
  recordBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 30, paddingVertical: 20, paddingHorizontal: 36, shadowColor: '#F5B800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  recordBtnIcon: { fontSize: 24 },
  recordBtnText: { fontSize: 16, fontFamily: FONTS.black, color: '#000' },

  actionsRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn:     { flex: 1, borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontFamily: FONTS.bold },

  sendBtn:       { borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center' },
  sendBtnText:   { fontSize: 15, fontFamily: FONTS.black, color: '#000' },

  sentWrap:      { alignItems: 'center', paddingVertical: 24, gap: 12 },
  sentIcon:      { fontSize: 52 },
  sentTitle:     { fontSize: 24, fontFamily: FONTS.black },
  sentSub:       { fontSize: 14, fontFamily: FONTS.semiBold, textAlign: 'center', lineHeight: 22, opacity: 0.7 },
});
