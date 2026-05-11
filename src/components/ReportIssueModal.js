import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Animated, Alert, ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { supabase } from '../utils/supabase';
import { TABLE_INCIDENTS, BUCKET_INCIDENTS } from '../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';

const BAR_COUNT = 40;
const POLL_MS   = 80;
const MIN_DB    = -55;
const MAX_DB    = -5;

const INCIDENT_TYPES = [
  { id: 'accident',       label: '🚗  Accident',        color: '#F09595' },
  { id: 'complaint',      label: '😤  Complaint',        color: '#F5B800' },
  { id: 'road_hazard',    label: '⚠️  Road Hazard',      color: '#F5B800' },
  { id: 'vehicle_damage', label: '🔧  Vehicle Damage',   color: '#F09595' },
  { id: 'other',          label: '📝  Other',            color: '#5DCAA5' },
];

const SEVERITIES = [
  { id: 'low',      label: 'Low',      color: '#5DCAA5' },
  { id: 'medium',   label: 'Medium',   color: '#F5B800' },
  { id: 'high',     label: 'High',     color: '#F09595' },
  { id: 'critical', label: 'Critical', color: '#FF003E' },
];

function dbToLevel(db) {
  if (db == null || db < MIN_DB) return 0;
  if (db > MAX_DB) return 1;
  return (db - MIN_DB) / (MAX_DB - MIN_DB);
}

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function RecordingWaveform({ levels, color }) {
  return (
    <View style={waveStyles.container}>
      {levels.map((lvl, i) => (
        <View key={i} style={[waveStyles.bar, { height: Math.max(3, lvl * 42), backgroundColor: color, opacity: 0.9 }]} />
      ))}
    </View>
  );
}

// Uses Animated.Value so progress updates bypass the React reconciler — no re-renders
function PlaybackWaveform({ levels, progressAnim, color, dimColor }) {
  const [containerW, setContainerW] = useState(300);

  const overlayWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, containerW],
  });
  const circleLeft = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [-6, containerW - 6],
  });

  return (
    <View
      style={waveStyles.container}
      onLayout={e => setContainerW(e.nativeEvent.layout.width)}
    >
      {levels.map((lvl, i) => (
        <View key={i} style={[waveStyles.bar, { height: Math.max(3, lvl * 42), backgroundColor: dimColor, opacity: 0.3 }]} />
      ))}

      {/* Colored overlay clipped to the played portion — native-driven */}
      <Animated.View style={[waveStyles.overlay, { width: overlayWidth }]}>
        <View style={[waveStyles.innerRow, { width: containerW }]}>
          {levels.map((lvl, i) => (
            <View key={i} style={[waveStyles.bar, { height: Math.max(3, lvl * 42), backgroundColor: color }]} />
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[waveStyles.playhead, { backgroundColor: color, left: circleLeft }]} />
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 0 },
  bar:       { width: 3, borderRadius: 2, minHeight: 3 },
  overlay:   { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  innerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 },
  playhead:  { width: 13, height: 13, borderRadius: 7, position: 'absolute', top: '50%', marginTop: -6 },
});

function ChipSelector({ options, selected, onSelect, colors }) {
  return (
    <View style={chipStyles.row}>
      {options.map(o => (
        <TouchableOpacity
          key={o.id}
          onPress={() => onSelect(o.id)}
          activeOpacity={0.75}
          style={[
            chipStyles.chip,
            selected === o.id
              ? { backgroundColor: `${o.color}25`, borderColor: o.color }
              : { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={[chipStyles.label, { color: selected === o.id ? o.color : colors.textMuted }]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const chipStyles = StyleSheet.create({
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:  { borderWidth: 1.5, borderRadius: RADIUS.full, paddingVertical: 7, paddingHorizontal: 14 },
  label: { fontSize: 12, fontFamily: FONTS.bold },
});

export default function ReportIssueModal({ visible, onClose, activeTripId = null }) {
  const { colors } = useTheme();
  const { t }      = useLanguage();
  const insets     = useSafeAreaInsets();

  const [title,         setTitle]         = useState('');
  const [incidentType,  setIncidentType]  = useState('other');
  const [severity,      setSeverity]      = useState('medium');
  const [isRecording,   setIsRecording]   = useState(false);
  const [recordingUri,  setRecordingUri]  = useState(null);
  const [duration,      setDuration]      = useState(0);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [sent,          setSent]          = useState(false);
  const [isSending,     setIsSending]     = useState(false);
  const [levels,        setLevels]        = useState(Array(BAR_COUNT).fill(0));
  const [savedLevels,   setSavedLevels]   = useState(Array(BAR_COUNT).fill(0));

  const recRef     = useRef(null);
  const soundRef   = useRef(null);
  const timerRef   = useRef(null);
  const meterRef   = useRef(null);
  const levelsRef  = useRef(Array(BAR_COUNT).fill(0));
  const slideAnim  = useRef(new Animated.Value(700)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(700);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Microphone Access', 'Please allow microphone access.'); return; }
      if (recRef.current) {
        try { await recRef.current.stopAndUnloadAsync(); } catch {}
        recRef.current = null;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recRef.current    = recording;
      levelsRef.current = Array(BAR_COUNT).fill(0);
      setLevels(Array(BAR_COUNT).fill(0));
      setRecordingUri(null);
      setDuration(0);
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      timerRef.current = setInterval(() => {
        setDuration(prev => { if (prev >= 120) { stopRecording(); return prev; } return prev + 1; });
      }, 1000);

      meterRef.current = setInterval(async () => {
        if (!recRef.current) return;
        try {
          const status = await recRef.current.getStatusAsync();
          const level  = dbToLevel(status.metering ?? MIN_DB);
          const bar    = Math.max(0, Math.min(1, level + (Math.random() - 0.5) * 0.06));
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
      setSavedLevels([...levelsRef.current]);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.warn('[Record] stop:', e.message); }
  }

  async function playBack() {
    if (!recordingUri) return;
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true, progressUpdateIntervalMillis: 50 }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      progressAnim.setValue(0);

      sound.setOnPlaybackStatusUpdate(status => {
        if (!status.isLoaded) return;
        if (status.durationMillis) {
          // Direct setValue bypasses React for a silky-smooth update
          progressAnim.setValue(status.positionMillis / status.durationMillis);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          progressAnim.setValue(0);
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
    progressAnim.setValue(0);
  }

  function resetRecording() {
    setRecordingUri(null);
    setDuration(0);
    progressAnim.setValue(0);
    setLevels(Array(BAR_COUNT).fill(0));
    setSavedLevels(Array(BAR_COUNT).fill(0));
    levelsRef.current = Array(BAR_COUNT).fill(0);
  }

  async function handleSend() {
    if (!recordingUri) { Alert.alert('Voice Required', 'Please record a voice message before submitting.'); return; }
    setIsSending(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const base64         = await FileSystem.readAsStringAsync(recordingUri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes          = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const fileName       = `${user.id}/${Date.now()}.m4a`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_INCIDENTS)
        .upload(fileName, bytes, { contentType: 'audio/m4a', upsert: false });
      if (uploadError) throw uploadError;

      // Store the storage path only — CRM generates signed URLs on demand via the service role
      await supabase.from(TABLE_INCIDENTS).insert({
        driver_id:     user.id,
        trip_id:       activeTripId ?? null,
        title:         title || `Incident report — ${new Date().toLocaleDateString()}`,
        incident_type: incidentType,
        severity,
        voice_path:    fileName,
        submitted_by:  'driver',
      });

      setSent(true);
    } catch (e) {
      console.warn('[ReportIssue] upload:', e.message);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSending(false);
      if (!sent) { setTimeout(() => { setSent(false); resetForm(); close(); }, 3000); }
    }
  }

  function resetForm() {
    setTitle(''); setIncidentType('other'); setSeverity('medium');
    resetRecording(); setSent(false);
  }

  function close() {
    if (isRecording) stopRecording();
    if (soundRef.current) { soundRef.current.unloadAsync(); soundRef.current = null; }
    clearInterval(timerRef.current); clearInterval(meterRef.current);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 700, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => { resetForm(); onClose(); });
  }

  const accentColor = INCIDENT_TYPES.find(t => t.id === incidentType)?.color ?? colors.yellow;

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

          {!sent ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>{t('reportIssueTitle')}</Text>
                  <Text style={[styles.titleSub, { color: colors.textMuted }]}>{t('reportIssueSubtitle')}</Text>
                </View>
                <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.bgCard }]}>
                  <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TITLE (optional)</Text>
              <TextInput
                style={[styles.titleInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgCard }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Brief description of the incident…"
                placeholderTextColor={colors.textDisabled}
                maxLength={100}
              />

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>INCIDENT TYPE</Text>
              <ChipSelector options={INCIDENT_TYPES} selected={incidentType} onSelect={setIncidentType} colors={colors} />

              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 16 }]}>SEVERITY</Text>
              <ChipSelector options={SEVERITIES} selected={severity} onSelect={setSeverity} colors={colors} />

              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 16 }]}>VOICE MESSAGE</Text>
              <View style={[styles.waveContainer, {
                backgroundColor: isRecording ? `${colors.red}12` : recordingUri ? `${accentColor}12` : colors.bgCard,
                borderColor:     isRecording ? `${colors.red}40` : recordingUri ? `${accentColor}40` : colors.border,
              }]}>
                <Text style={[styles.timer, {
                  color: isRecording ? colors.red : recordingUri ? accentColor : colors.textDisabled,
                }]}>{fmt(duration)}</Text>

                {recordingUri ? (
                  <PlaybackWaveform
                    levels={savedLevels}
                    progressAnim={progressAnim}
                    color={colors.yellow}
                    dimColor={colors.border}
                  />
                ) : (
                  <RecordingWaveform
                    levels={levels}
                    color={isRecording ? colors.red : colors.border}
                  />
                )}

                <Text style={[styles.waveLabel, {
                  color: isRecording ? colors.red : recordingUri ? colors.yellow : colors.textDisabled,
                }]}>
                  {isRecording
                    ? t('recordingLabel')
                    : isPlaying
                    ? '▶  Playing…'
                    : recordingUri ? t('recordedLabel') : ''}
                </Text>
              </View>

              {!recordingUri && (
                <View style={styles.btnWrap}>
                  <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    activeOpacity={0.85}
                    style={[styles.recordBtn, { backgroundColor: isRecording ? colors.red : colors.yellow, shadowColor: isRecording ? colors.red : colors.yellow }]}
                  >
                    <Text style={styles.recordBtnIcon}>{isRecording ? '⏹' : '🎙'}</Text>
                    <Text style={styles.recordBtnText}>{isRecording ? 'Tap to Stop' : 'Tap to Record'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!!recordingUri && (
                <>
                  <View style={styles.playbackRow}>
                    <TouchableOpacity
                      onPress={isPlaying ? stopPlayback : playBack}
                      activeOpacity={0.85}
                      style={[styles.playCircle, { backgroundColor: colors.yellow }]}
                    >
                      <Text style={styles.playCircleIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => { stopPlayback(); resetRecording(); }} activeOpacity={0.75}
                      style={[styles.reRecordBtn, { borderColor: colors.yellow, backgroundColor: `${colors.yellow}15` }]}>
                      <Text style={[styles.reRecordText, { color: colors.yellow }]}>{t('reRecord')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={handleSend} activeOpacity={0.85} disabled={isSending}
                    style={[styles.sendBtn, { backgroundColor: isSending ? colors.border : accentColor }]}>
                    <Text style={[styles.sendBtnText, { color: isSending ? colors.textMuted : '#000' }]}>
                      {isSending ? 'Sending…' : t('sendVoiceReport')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.sentWrap}>
              <Text style={styles.sentIcon}>✅</Text>
              <Text style={[styles.sentTitle, { color: colors.textPrimary }]}>{t('reportSent')}</Text>
              <Text style={[styles.sentSub, { color: colors.textMuted }]}>{t('reportSentSub')}</Text>
            </View>
          )}
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
  fieldLabel:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1, marginBottom: 10 },
  titleInput:    { borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 16, fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 20 },
  waveContainer: { borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  timer:         { fontSize: 18, fontFamily: FONTS.black, textAlign: 'center', fontVariant: ['tabular-nums'] },
  waveLabel:     { fontSize: 11, fontFamily: FONTS.extraBold, textAlign: 'center', letterSpacing: 0.5 },
  btnWrap:       { alignItems: 'center', marginBottom: 8 },
  recordBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 30, paddingVertical: 18, paddingHorizontal: 32, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  recordBtnIcon: { fontSize: 22 },
  recordBtnText: { fontSize: 15, fontFamily: FONTS.black, color: '#000' },
  playbackRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  playCircle:    { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  playCircleIcon:{ fontSize: 20, color: '#000' },
  reRecordBtn:   { flex: 1, borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 13, alignItems: 'center' },
  reRecordText:  { fontSize: 13, fontFamily: FONTS.bold },
  sendBtn:       { borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', marginBottom: 8 },
  sendBtnText:   { fontSize: 15, fontFamily: FONTS.black },
  sentWrap:      { alignItems: 'center', paddingVertical: 32, gap: 14 },
  sentIcon:      { fontSize: 52 },
  sentTitle:     { fontSize: 24, fontFamily: FONTS.black },
  sentSub:       { fontSize: 14, fontFamily: FONTS.semiBold, textAlign: 'center', lineHeight: 22, opacity: 0.7 },
});
