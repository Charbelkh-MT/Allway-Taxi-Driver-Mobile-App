import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FONTS, RADIUS } from '../theme';

const RADAR_SIZE = 96;

export default function ScanningRadar() {
  const { colors } = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;
  const blip1    = useRef(new Animated.Value(1)).current;
  const blip2    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 2800, useNativeDriver: true })
    );

    const pulse1 = Animated.loop(
      Animated.sequence([
        Animated.timing(blip1, { toValue: 0.2, duration: 700,  useNativeDriver: true }),
        Animated.timing(blip1, { toValue: 1,   duration: 700,  useNativeDriver: true }),
        Animated.delay(600),
      ])
    );

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(blip2, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(blip2, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.delay(200),
      ])
    );

    spin.start();
    pulse1.start();
    pulse2.start();
    return () => { spin.stop(); pulse1.stop(); pulse2.stop(); };
  }, []);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: `${colors.green}0F`, borderColor: `${colors.green}2E` }]}>
        <View style={styles.radarWrap}>
          <View style={[styles.ring, styles.ring1, { borderColor: `${colors.green}47` }]} />
          <View style={[styles.ring, styles.ring2, { borderColor: `${colors.green}33` }]} />
          <View style={[styles.ring, styles.ring3, { borderColor: `${colors.green}1F` }]} />
          <Animated.View style={[styles.sweepWrap, { transform: [{ rotate: spin }] }]}>
            <View style={[styles.sweepGradient, { backgroundColor: `${colors.green}59` }]} />
          </Animated.View>
          <Animated.View style={[styles.blip, styles.blip1, { backgroundColor: colors.green, opacity: blip1 }]} />
          <Animated.View style={[styles.blip, styles.blip2, { backgroundColor: colors.green, opacity: blip2 }]} />
          <View style={[styles.centerDot, { backgroundColor: colors.green }]} />
        </View>
        <Text style={[styles.title, { color: colors.textSecondary }]}>Scanning for trips…</Text>
        <Text style={[styles.sub,   { color: `${colors.green}80` }]}>Live matching in your area</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { paddingHorizontal: 18, paddingTop: 18 },
  card:         { borderWidth: 1, borderRadius: RADIUS.xxl, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center' },
  radarWrap:    { width: RADAR_SIZE, height: RADAR_SIZE, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  ring:         { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  ring1:        { width: RADAR_SIZE,      height: RADAR_SIZE      },
  ring2:        { width: RADAR_SIZE - 28, height: RADAR_SIZE - 28 },
  ring3:        { width: RADAR_SIZE - 56, height: RADAR_SIZE - 56 },
  sweepWrap:    { position: 'absolute', width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2, overflow: 'hidden' },
  sweepGradient:{ position: 'absolute', right: 0, top: 0, width: RADAR_SIZE / 2, height: RADAR_SIZE, borderTopRightRadius: RADAR_SIZE / 2, borderBottomRightRadius: RADAR_SIZE / 2 },
  blip:         { position: 'absolute', borderRadius: 999 },
  blip1:        { width: 5, height: 5, top: '22%', left: '62%' },
  blip2:        { width: 4, height: 4, top: '62%', left: '25%' },
  centerDot:    { width: 8, height: 8, borderRadius: 4 },
  title:        { fontSize: 14, fontFamily: FONTS.extraBold, letterSpacing: 0.3 },
  sub:          { fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 5 },
});
