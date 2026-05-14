import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS } from '../theme';

export default function SplashScreen() {
  const navigation   = useNavigation();
  const { colors }   = useTheme();
  const { t }        = useLanguage();
  const opacity      = useRef(new Animated.Value(0)).current;
  const scale        = useRef(new Animated.Value(0.88)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,      { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale,        { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
      Animated.timing(progressAnim, { toValue: 1, duration: 1800, delay: 300, useNativeDriver: false }),
    ]).start();

    const timer = setTimeout(() => navigation.replace('Login'), 2400);
    return () => clearTimeout(timer);
  }, []);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        <Image
          source={require('../../assets/allway-main-logo.jpg')}
          style={styles.logo}
          resizeMode="cover"
        />
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('driverPortal')}</Text>
      </Animated.View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.fill, { width: progressWidth, backgroundColor: colors.yellow }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  logo:      { width: 300, height: 150, borderRadius: 36 },
  subtitle:  { marginTop: 20, fontSize: 16, fontFamily: FONTS.semiBold, letterSpacing: 1.5, textTransform: 'uppercase' },
  track:     { width: 200, height: 3, borderRadius: 999, overflow: 'hidden' },
  fill:      { height: '100%', borderRadius: 999 },
});
