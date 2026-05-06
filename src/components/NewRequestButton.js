import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { FONTS } from '../theme';

export default function NewRequestButton({ onPress }) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance: spring in from zero
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 7,
    }).start();

    // Continuous subtle pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  async function handlePress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.spring(scaleAnim, { toValue: 1,   useNativeDriver: true, tension: 120, friction: 6 }),
    ]).start();
    onPress();
  }

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }]}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.yellow, shadowColor: colors.yellow }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Text style={styles.icon}>＋</Text>
        <Text style={styles.text}>New Request</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 120, alignSelf: 'center', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  btn:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 28, paddingVertical: 12, paddingHorizontal: 22, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  icon: { fontSize: 16, color: '#000', lineHeight: 20 },
  text: { fontSize: 13, fontFamily: FONTS.black, color: '#000' },
});
