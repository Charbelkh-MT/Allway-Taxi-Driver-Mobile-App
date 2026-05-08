import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const BAR_COUNT    = 40;
const POLL_MS      = 80;   // metering poll interval
const MIN_DB       = -55;  // anything below this = silence
const MAX_DB       = -5;   // anything above = max bar

function dbToLevel(db) {
  if (db == null || db < MIN_DB) return 0;
  if (db > MAX_DB) return 1;
  return (db - MIN_DB) / (MAX_DB - MIN_DB);
}

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

// ─── Waveform bar display ─────────────────────────────────────────────────────
function Waveform({ levels, color, dim }) {
  return (
    <View style={waveStyles.container}>
      {levels.map((lvl, i) => (
        <View
          key={i}
          style={[
            waveStyles.bar,
            {
              height:          Math.max(3, lvl * 46),
              backgroundColor: color,
              opacity:         dim ? 0.35 : 0.9,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReportIssueModal({ visible, onClose }) {
  const { colors } = useTheme();
  const { t }      = useLanguage();
  const insets     = useSafeAreaInsets();

  const [isRecording,  setIsRecording]  = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [duration,     setDuration]     = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [sent,         setSent]         = useState(false);
  const [levels,       setLevels]       = useState(Array(BAR_COUNT).fill(0));
  const [savedLevels,  setSavedLevels]  = useState(Array(BAR_COUNT).fill(0));
  const [playProgress, setPlayProgress] = useState(0); // 0-1

  const recRef      = useRef(null);
  const soundRef    = useRef(null);
  const timerRef    = useRef(null);
  const meterRef    = useRef(null);
  const levelsRef   = useRef(Array(BAR_COUNT).fill(0));
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
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isRecording]);

  // ─── Recording ───────────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone Access', 'Please allow microphone access to record an issue.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:   true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        }
      );

      recRef.current     = recording;
      levelsRef.current  = Array(BAR_COUNT).fill(0);
      setLevels(Array(BAR_COUNT).fill(0));
      setRecordingUri(null);
      setDuration(0);
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 120) { stopRecording(); return prev; }
          return prev + 1;
        });
      }, 1000);

      // Metering poll — reads real mic levels and feeds the waveform
      meterRef.current = setInterval(async () => {
        if (!recRef.current) return;
        try {
          const status = await recRef.current.getStatusAsync();
          const level  = dbToLevel(status.metering ?? MIN_DB);
          // Add small random jitter so bars feel alive even at constant volume
          const jitter = (Math.random() - 0.5) * 0.06;
          const bar    = Math.max(0, Math.min(1, level + jitter));
          levelsRef.current = [...levelsRef.current.slice(1), bar];
          setLevels([...levelsRef.current]);
        } catch {}
      }, POLL_MS);

    } catch (e) { console.warn('[Record] start:', e.message); }
  }

  async function stopRecording() {
    clearInterval(timerRef.current);
    clearInterval(meterRef.current);
    if (!recRef.current) return;
    try {
      await recRef.current.stopAndUnloadAsync();
      const uri = recRef.current.getURI();
      recRef.current = null;
      setIsRecording(false);
      setRecordingUri(uri);
      // Save the waveform snapshot for playback display
      setSavedLevels([...levelsRef.current]);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.warn('[Record] stop:', e.message); }
  }

  // ─── Playback ─────────────────────────────────────────────────────────────────
  async function playBack() {
    if (!recordingUri) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:   false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true, progressUpdateIntervalMillis: 100 }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      setPlayProgress(0);

      sound.setOnPlaybackStatusUpdate(status => {
        if (!status.isLoaded) return;
        if (status.durationMillis) {
          setPlayProgress(status.positionMillis / status.durationMillis);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlayProgress(0);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (e) { console.warn('[Playback]:', e.message); }
  }

  async function stopPlayback() {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPlayProgress(0);
  }

  function reset() {
    setRecordingUri(null);
    setDuration(0);
    setLevels(Array(BAR_COUNT).fill(0));
    setSavedLevels(Array(BAR_COUNT).fill(0));
    setPlayProgress(0);
    levelsRef.current = Array(BAR_COUNT).fill(0);
  }

  // ─── Send ─────────────────────────────────────────────────────────────────────
  async function handleSend() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSent(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && recordingUri) {
        const base64 = await FileSystem.readAsStringAsync(recordingUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes    = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const fileName = `${user.id}/${Date.now()}.m4a`;
        const { error } = await supabase.storage
          .from('voice-reports')
          .upload(fileName, bytes, { contentType: 'audio/m4a', upsert: false });
        if (!error) {
          await supabase.from('support_tickets').insert({
            driver_id:    user.id,
            audio_path:   fileName,
            submitted_at: new Date().toISOString(),
            status:       'open',
          });
        }
      }
    } catch (e) { console.warn('[ReportIssue] upload:', e.message); }
    setTimeout(() => { setSent(false); reset(); close(); }, 2500);
  }

  function close() {
    if (isRecording) stopRecording();
    if (soundRef.current) { soundRef.current.unloadAsync(); soundRef.current = null; }
    clearInterval(timerRef.current);
    clearInterval(meterRef.current);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => { reset(); setSent(false); onClose(); });
  }

  // ─── Waveform to show during playback (progress-aware) ────────────────────────
  const playbackLevels = savedLevels.map((lvl, i) => {
    const barProgress = i / BAR_COUNT;
    return barProgress <= playProgress ? lvl : lvl * 0.35;
  });

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
          <View style={styles.header}>
            <View>
              <Text style={[styles.title,    { color: colors.textPrimary }]}>{t('reportIssueTitle')}</Text>
              <Text style={[styles.titleSub, { color: colors.textMuted }]}>{t('reportIssueSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {!sent ? (
            <>
              <Text style={[styles.instructions, { color: colors.textMuted }]}>{t('reportIssueDesc')}</Text>

              {/* ── Waveform display ── */}
              <View style={[styles.waveContainer, {
                backgroundColor: isRecording
                  ? `${colors.red}12`
                  : recordingUri
                  ? `${colors.green}12`
                  : colors.bgCard,
                borderColor: isRecording
                  ? `${colors.red}40`
                  : recordingUri
                  ? `${colors.green}40`
                  : colors.border,
              }]}>
                {/* Timer */}
                <Text style={[styles.timer, {
                  color: isRecording ? colors.red : recordingUri ? colors.green : colors.textDisabled,
                }]}>
                  {fmt(duration)}
                </Text>

                {/* Waveform bars */}
                <Waveform
                  levels={recordingUri ? playbackLevels : levels}
                  color={isRecording ? colors.red : recordingUri ? colors.green : colors.border}
                  dim={!isRecording && !recordingUri}
                />

                {/* Status label */}
                <Text style={[styles.waveLabel, {
                  color: isRecording ? colors.red : recordingUri ? colors.green : colors.textDisabled,
                }]}>
                  {isRecording
                    ? t('recordingLabel')
                    : isPlaying
                    ? '▶  Playing…'
                    : recordingUri
                    ? t('recordedLabel')
                    : ''}
                </Text>
              </View>

              {/* ── Record button ── */}
              {!recordingUri && (
                <Animated.View style={[styles.btnWrap, { transform: [{ scale: pulseAnim }] }]}>
                  <TouchableOpacity
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    activeOpacity={0.85}
                    style={[styles.recordBtn, {
                      backgroundColor: isRecording ? colors.red : colors.yellow,
                      shadowColor:     isRecording ? colors.red : colors.yellow,
                    }]}
                  >
                    <Text style={styles.recordBtnIcon}>{isRecording ? '⏹' : '🎙'}</Text>
                    <Text style={styles.recordBtnText}>
                      {isRecording ? t('releaseToStop') : t('holdToRecord')}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* ── Playback + send actions ── */}
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
                      onPress={() => { stopPlayback(); reset(); }}
                      activeOpacity={0.8}
                      style={[styles.actionBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>{t('reRecord')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={handleSend}
                    activeOpacity={0.85}
                    style={[styles.sendBtn, { backgroundColor: colors.yellow }]}
                  >
                    <Text style={styles.sendBtnText}>{t('sendVoiceReport')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={styles.sentWrap}>
              <Text style={styles.sentIcon}>✅</Text>
              <Text style={[styles.sentTitle, { color: colors.textPrimary }]}>{t('reportSent')}</Text>
              <Text style={[styles.sentSub,   { color: colors.textMuted }]}>{t('reportSentSub')}</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Waveform styles ──────────────────────────────────────────────────────────
const waveStyles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    height:         56,
    paddingHorizontal: 4,
  },
  bar: {
    width:        3,
    borderRadius: 2,
    minHeight:    3,
  },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet:         { borderTopLeftRadius: RADIUS.xxxl, borderTopRightRadius: RADIUS.xxxl, paddingTop: 14, paddingHorizontal: 22 },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  title:         { fontSize: 24, fontFamily: FONTS.black },
  titleSub:      { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 3 },
  closeBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:  { fontSize: 13, fontFamily: FONTS.bold },
  instructions:  { fontSize: 14, fontFamily: FONTS.semiBold, lineHeight: 22, marginBottom: 20 },

  waveContainer: {
    borderWidth:   1,
    borderRadius:  RADIUS.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom:  24,
    gap:           8,
  },
  timer:         { fontSize: 20, fontFamily: FONTS.black, textAlign: 'center', fontVariant: ['tabular-nums'] },
  waveLabel:     { fontSize: 11, fontFamily: FONTS.extraBold, textAlign: 'center', letterSpacing: 0.5 },

  btnWrap:       { alignItems: 'center', marginBottom: 8 },
  recordBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 30, paddingVertical: 20, paddingHorizontal: 36, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
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
