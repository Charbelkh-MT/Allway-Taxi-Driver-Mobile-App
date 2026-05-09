import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FONTS } from '../theme';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  const { colors }   = useTheme();
  const opacity      = useRef(new Animated.Value(0)).current;
  const scale        = useRef(new Animated.Value(0.92)).current;
  const dot1         = useRef(new Animated.Value(0.3)).current;
  const dot2         = useRef(new Animated.Value(0.3)).current;
  const dot3         = useRef(new Animated.Value(0.3)).current;
  const barAnim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade + scale in
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
    ]).start();

    // Infinite shimmer bar
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(barAnim, { toValue: 0, duration: 0,   useNativeDriver: false }),
      ])
    );
    shimmer.start();

    // Bouncing dots
    function pulse(anim, delay) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1,   duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      );
    }
    const d1 = pulse(dot1, 0);
    const d2 = pulse(dot2, 150);
    const d3 = pulse(dot3, 300);
    d1.start(); d2.start(); d3.start();

    return () => { shimmer.stop(); d1.stop(); d2.stop(); d3.stop(); };
  }, []);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <Image
          source={require('../../assets/allway-main-logo.jpg')}
          style={styles.logo}
          resizeMode="cover"
        />
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Driver Portal</Text>

        {/* Shimmer progress bar */}
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: colors.yellow }]} />
        </View>

        {/* Bouncing dots */}
        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { backgroundColor: colors.yellow, opacity: dot }]}
            />
          ))}
        </View>

        <Text style={[styles.loadingText, { color: colors.textDisabled }]}>
          Getting your dashboard ready…
        </Text>
      </Animated.View>
    </View>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:     { alignItems: 'center', gap: 16 },
  logo:        { width: 300, height: 150, borderRadius: 36 },
  subtitle:    { fontSize: 16, fontFamily: FONTS.semiBold, letterSpacing: 1.5, textTransform: 'uppercase' },
  track:       { width: 200, height: 3, borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  fill:        { height: '100%', borderRadius: 999 },
  dotsRow:     { flexDirection: 'row', gap: 8, marginTop: 4 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  loadingText: { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 4 },
});
