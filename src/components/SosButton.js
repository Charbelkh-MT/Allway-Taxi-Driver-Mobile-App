import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, RADIUS } from '../theme';
import { DISPATCHER_PHONE } from '../config';

export default function SosButton() {
  const { colors } = useTheme();
  const { t }      = useLanguage();

  async function handlePress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('sosConfirmTitle'),
      t('sosConfirmMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('sosCall'),
          style: 'destructive',
          onPress: async () => {
            const url = `tel:${DISPATCHER_PHONE}`;
            const canCall = await Linking.canOpenURL(url);
            if (canCall) await Linking.openURL(url);
            else Alert.alert(t('sosConfirmTitle'), DISPATCHER_PHONE);
          },
        },
      ]
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.btn, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}40` }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${colors.red}20` }]}>
        <Text style={styles.icon}>🚨</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: colors.red }]}>{t('sosButton')}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{t('sosButtonSub')}</Text>
      </View>
      <Text style={[styles.arrow, { color: colors.red }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn:        { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 18, marginTop: 14, borderWidth: 1.5, borderRadius: RADIUS.xl, padding: 18 },
  iconCircle: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:       { fontSize: 24 },
  textWrap:   { flex: 1 },
  label:      { fontSize: 16, fontFamily: FONTS.extraBold },
  sub:        { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 2 },
  arrow:      { fontSize: 26, lineHeight: 30 },
});
