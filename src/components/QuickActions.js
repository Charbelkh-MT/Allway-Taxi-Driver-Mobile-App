import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';
import ReportIssueModal from './ReportIssueModal';

const SUPPORT_PHONE = '+96178999240';

export default function QuickActions() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [showReport, setShowReport] = useState(false);

  async function handleCallSupport() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `tel:${SUPPORT_PHONE}`;
    const canCall = await Linking.canOpenURL(url);
    if (canCall) {
      await Linking.openURL(url);
    } else {
      Alert.alert(t('callSupport'), SUPPORT_PHONE);
    }
  }

  async function handleReportIssue() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReport(true);
  }

  const ACTIONS = [
    {
      label:     t('callSupport'),
      sub:       t('callSupportSub'),
      icon:      '📞',
      accentKey: 'green',
      onPress:   handleCallSupport,
    },
    {
      label:     t('reportIssue'),
      sub:       t('reportIssueSub'),
      icon:      '🚨',
      accentKey: 'red',
      onPress:   handleReportIssue,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: colors.textMuted }]}>{t('quickActions')}</Text>
      <View style={styles.grid}>
        {ACTIONS.map(action => {
          const accent = colors[action.accentKey];
          return (
            <TouchableOpacity
              key={action.label}
              style={[styles.card, { backgroundColor: `${accent}0D`, borderColor: `${accent}30` }]}
              onPress={action.onPress}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${accent}18` }]}>
                <Text style={styles.icon}>{action.icon}</Text>
              </View>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{action.label}</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>{action.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ReportIssueModal visible={showReport} onClose={() => setShowReport(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { paddingHorizontal: 18, paddingTop: 20 },
  heading:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1.2, marginBottom: 12, textTransform: 'uppercase' },
  grid:       { flexDirection: 'row', gap: 12 },
  card:       { flex: 1, borderWidth: 1, borderRadius: RADIUS.xl, padding: 18, paddingBottom: 20, gap: 10 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  icon:       { fontSize: 22 },
  label:      { fontSize: 14, fontFamily: FONTS.extraBold },
  sub:        { fontSize: 11, fontFamily: FONTS.semiBold },
});
