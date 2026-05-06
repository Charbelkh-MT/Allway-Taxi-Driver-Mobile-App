import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { FONTS } from '../theme';

export default function PageHeader({ title, subtitle }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.appBar }}>
      <View style={[
        styles.bar,
        { backgroundColor: colors.appBar, borderBottomColor: colors.border },
        Platform.OS === 'android' && styles.android,
      ]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar:      { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  android:  { elevation: 4 },
  title:    { fontSize: 22, fontFamily: FONTS.black },
  subtitle: { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 2 },
});
