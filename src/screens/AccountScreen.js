import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, RefreshControl, Switch, Linking, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useDriver } from '../context/DriverContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';
import { startOfDay, daysAgo } from '../utils/dateUtils';
import { supabase } from '../utils/supabase';
import AppHeader from '../components/AppHeader';
import { SkeletonEarningsRow } from '../components/Skeleton';
import ReportIssueModal from '../components/ReportIssueModal';
import ChangePinModal from '../components/ChangePinModal';
import LegalModal from '../components/LegalModal';
import { TABLE_TRIPS, TRIP_COLS } from '../config';

function sumRows(rows, fareCol) {
  const total = rows.reduce((s, r) => s + (Number(r[fareCol]) || 0), 0);
  return { value: `$${total.toFixed(0)}`, trips: rows.length };
}

function StatPill({ icon, label, value, color }) {
  const { colors } = useTheme();
  return (
    <View style={[statStyles.pill, { backgroundColor: `${color}12`, borderColor: `${color}30` }]}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  pill:  { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 14, gap: 4 },
  icon:  { fontSize: 20 },
  value: { fontSize: 18, fontFamily: FONTS.black },
  label: { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 0.5, textTransform: 'uppercase' },
});

function InfoRow({ label, value, last }) {
  const { colors } = useTheme();
  return (
    <View style={[infoStyles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[infoStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.textPrimary }]}>{value || '—'}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold },
  value: { fontSize: 14, fontFamily: FONTS.bold, textAlign: 'right', flex: 1, marginLeft: 16 },
});


export default function AccountScreen() {
  const { driver, logout, setDriver }   = useAuth();
  const { isOnline }                    = useDriver();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const [earnings, setEarnings]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [showPinModal, setShowPinModal]     = useState(false);
  const [showReport,   setShowReport]       = useState(false);
  const [legalType,    setLegalType]        = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchEarnings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from(TABLE_TRIPS)
        .select(`${TRIP_COLS.fare}, ${TRIP_COLS.createdAt}`)
        .eq(TRIP_COLS.driverId, user.id)
        .eq(TRIP_COLS.status, 'completed')
        .gte(TRIP_COLS.createdAt, daysAgo(30))
        .not(TRIP_COLS.fare, 'is', null);
      const todayMs = new Date(startOfDay()).getTime();
      const sevenMs = new Date(daysAgo(7)).getTime();
      const rows = data ?? [];
      const todayRows = [], weekRows = [];
      rows.forEach(r => {
        const tsMs = new Date(r[TRIP_COLS.createdAt]).getTime();
        if (tsMs >= todayMs) todayRows.push(r);
        if (tsMs >= sevenMs) weekRows.push(r);
      });
      setEarnings([
        { labelKey: 'today',      ...sumRows(todayRows, TRIP_COLS.fare) },
        { labelKey: 'sevenDays',  ...sumRows(weekRows,  TRIP_COLS.fare) },
        { labelKey: 'thirtyDays', ...sumRows(rows,       TRIP_COLS.fare) },
      ]);
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  useEffect(() => {
    let channel;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel(`account-trips-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_TRIPS, filter: `${TRIP_COLS.driverId}=eq.${user.id}` }, fetchEarnings)
        .subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchEarnings]);

  async function handlePhotoUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to upload a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const uri    = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const path   = `${user.id}/profile.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('driver-photos')
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('driver-photos').getPublicUrl(path);

      await supabase.from('drivers').update({ photo_url: publicUrl }).eq('id', user.id);
      setDriver(prev => ({ ...prev, photoUrl: publicUrl }));
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleLogout() {
    Alert.alert(t('endSession'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await logout();
      }},
    ]);
  }

  const earningsData = earnings ?? [
    { labelKey: 'today',      value: '—', trips: '—' },
    { labelKey: 'sevenDays',  value: '—', trips: '—' },
    { labelKey: 'thirtyDays', value: '—', trips: '—' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.appBar }}>
        <AppHeader online={isOnline} />
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEarnings(); }} tintColor={colors.yellow} colors={[colors.yellow]} />
        }
      >
        <View style={styles.profileWrap}>
          <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
            <LinearGradient
              colors={[`${colors.yellow}18`, 'transparent']}
              style={styles.profileGlow}
              pointerEvents="none"
            />

            <View style={styles.profileRow}>
              <TouchableOpacity onPress={handlePhotoUpload} activeOpacity={0.8} style={styles.avatarWrap}>
                {driver.photoUrl ? (
                  <Image source={{ uri: driver.photoUrl }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={[colors.yellow, colors.yellowDark]} style={styles.avatar}>
                    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
                      <Circle cx="12" cy="8" r="4" fill="rgba(0,0,0,0.75)" />
                      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(0,0,0,0.75)" strokeWidth="2" strokeLinecap="round" />
                    </Svg>
                  </LinearGradient>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: colors.yellow }]}>
                  <Text style={styles.cameraIcon}>{uploadingPhoto ? '…' : '📷'}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={[styles.driverName, { color: colors.textPrimary }]} numberOfLines={1}>{driver.name}</Text>
                {!!driver.phone && (
                  <Text style={[styles.driverPhone, { color: colors.textMuted }]}>{driver.phone}</Text>
                )}
                {!!driver.vehicle && (
                  <Text style={[styles.driverVehicle, { color: colors.textMuted }]}>
                    {driver.vehicle}{driver.plate ? `  ·  ${driver.plate}` : ''}
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.profileDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statsRow}>
              <StatPill icon="⭐" label={t('rating')}                             value={Number(driver.rating).toFixed(1)} color={colors.yellow} />
              <StatPill icon="🚕" label={t('totalTrips')}                          value={String(driver.totalTrips)}        color={colors.green}  />
              <StatPill icon="✓"  label={language === 'ar' ? 'القبول' : 'Accept'} value={`${driver.acceptRate}%`}          color={colors.yellow} />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.section, { color: colors.textMuted }]}>{t('earningsSection')}</Text>
          {loading ? <SkeletonEarningsRow /> : (
            <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
              {earningsData.map((e, i) => (
                <View key={e.labelKey} style={[
                  styles.earningRow,
                  { borderBottomColor: colors.border },
                  i === earningsData.length - 1 && { borderBottomWidth: 0 },
                ]}>
                  <Text style={[styles.earningLabel, { color: colors.textMuted }]}>{t(e.labelKey)}</Text>
                  <View style={styles.earningRight}>
                    <Text style={[styles.earningVal, { color: i === 0 ? colors.yellow : colors.textPrimary }]}>{e.value}</Text>
                    <Text style={[styles.earningTrips, { color: colors.textDisabled }]}>
                      {typeof e.trips === 'number' ? `${e.trips} ${t('trips')}` : e.trips}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.section, { color: colors.textMuted }]}>{t('driverDetails')}</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
            <InfoRow label={t('phone')}       value={driver.phone}   />
            <InfoRow label={t('carModel')}    value={driver.vehicle} />
            <InfoRow label={t('plate')}       value={driver.plate}   />
            <InfoRow label="Car Type"         value={driver.carType === 'xl' ? '🚐  XL' : '🚕  Comfort'} />
            <InfoRow label={t('totalTrips')}  value={String(driver.totalTrips)} last />
          </View>

          <Text style={[styles.section, { color: colors.textMuted }]}>{t('preferences')}</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <Text style={styles.settingIcon}>{isDark ? '🌙' : '☀️'}</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{isDark ? t('darkMode') : t('lightMode')}</Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>{t('switchAppearance')}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={async () => { await Haptics.selectionAsync(); toggleTheme(); }}
                trackColor={{ false: colors.border, true: colors.yellow }}
                thumbColor="#fff"
                ios_backgroundColor={colors.border}
              />
            </View>
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomColor: colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPinModal(true); }}
              activeOpacity={0.75}
            >
              <Text style={styles.settingIcon}>🔑</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{t('changePIN')}</Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>{t('changePINSub')}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} activeOpacity={0.75}
              onPress={() => Alert.alert(
                t('selectLanguage'),
                t('selectLanguageDesc'),
                [
                  { text: t('english'), onPress: () => setLanguage('en') },
                  { text: t('arabic'),  onPress: () => setLanguage('ar') },
                  { text: t('cancel'),  style: 'cancel' },
                ]
              )}>
              <Text style={styles.settingIcon}>🌐</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{t('language')}</Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>{language === 'ar' ? t('arabic') : t('english')}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.section, { color: colors.textMuted }]}>{t('support')}</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
            <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]} activeOpacity={0.75}
              onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('tel:+9611234567'); }}>
              <Text style={styles.settingIcon}>📞</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{t('callDispatcher')}</Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>{t('callDispatcherSub')}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]} activeOpacity={0.75}
              onPress={() => Alert.alert('Help & Support', 'For help, contact your dispatcher or call the Allway Taxi operations centre.')}>
              <Text style={styles.settingIcon}>❓</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{t('helpSupport')}</Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>{t('helpSupportSub')}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} activeOpacity={0.75}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReport(true); }}>
              <Text style={styles.settingIcon}>🚨</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{t('reportIssue')}</Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>{t('reportIssueSub')}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.section, { color: colors.textMuted }]}>{t('about')}</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, !isDark && styles.shadow]}>
            <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]} activeOpacity={0.75}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLegalType('terms'); }}>
              <Text style={styles.settingIcon}>📄</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{t('termsOfService')}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]} activeOpacity={0.75}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLegalType('privacy'); }}>
              <Text style={styles.settingIcon}>🔒</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{t('privacyPolicy')}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{t('appVersion')}</Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>Version 1.0.0</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            style={[styles.logoutBtn, { backgroundColor: colors.redFaint, borderColor: 'rgba(240,149,149,0.2)' }]}
          >
            <Text style={[styles.logoutText, { color: colors.red }]}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ReportIssueModal visible={showReport}           onClose={() => setShowReport(false)} />
      <ChangePinModal   visible={showPinModal}          onClose={() => setShowPinModal(false)} />
      <LegalModal       type={legalType ?? 'terms'}     visible={!!legalType} onClose={() => setLegalType(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Profile card
  avatarWrap:     { position: 'relative' },
  cameraBadge:    { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cameraIcon:     { fontSize: 11 },
  profileWrap:    { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
  profileCard:    { borderWidth: 1, borderRadius: RADIUS.xxl, overflow: 'hidden', padding: 18 },
  profileGlow:    { position: 'absolute', top: 0, left: 0, right: 0, height: 72 },
  profileRow:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileInfo:    { flex: 1 },
  profileDivider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  avatar:         { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  driverName:     { fontSize: 20, fontFamily: FONTS.black, marginBottom: 2 },
  driverPhone:    { fontSize: 12, fontFamily: FONTS.semiBold, marginBottom: 2 },
  driverVehicle:  { fontSize: 12, fontFamily: FONTS.semiBold },
  statsRow:       { flexDirection: 'row', gap: 10 },

  body:         { padding: 18, paddingBottom: Platform.OS === 'ios' ? 140 : 32 },
  section:      { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  card:         { borderWidth: 1, borderRadius: RADIUS.xl, marginBottom: 24, overflow: 'hidden' },
  shadow:       { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },

  // Earnings
  earningRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  earningLabel: { fontSize: 14, fontFamily: FONTS.semiBold },
  earningRight: { alignItems: 'flex-end' },
  earningVal:   { fontSize: 18, fontFamily: FONTS.black },
  earningTrips: { fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 1 },

  // Settings
  settingRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  settingIcon:  { fontSize: 20, width: 28, textAlign: 'center' },
  settingText:  { flex: 1 },
  settingTitle: { fontSize: 15, fontFamily: FONTS.bold },
  settingSub:   { fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 2 },
  chevron:      { fontSize: 22, lineHeight: 26 },

  logoutBtn:    { borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 17, alignItems: 'center' },
  logoutText:   { fontSize: 14, fontFamily: FONTS.extraBold },
});
