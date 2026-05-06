import React from 'react';
import { Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';

/**
 * GlassView — real iOS UIVisualEffectView blur on iOS,
 * elevated dark surface on Android.
 *
 * Props:
 *   intensity   – blur intensity 0-100 (iOS only, default 85)
 *   tint        – 'dark' | 'light' | 'default' (iOS only, default 'dark')
 *   androidBg   – background color for Android fallback
 *   style       – additional styles (do NOT include backgroundColor for iOS)
 */
export default function GlassView({
  intensity = 85,
  tint = 'dark',
  androidBg = 'rgba(10,10,18,0.97)',
  style,
  children,
  ...rest
}) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint={tint} style={style} {...rest}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[{ backgroundColor: androidBg }, style]} {...rest}>
      {children}
    </View>
  );
}
