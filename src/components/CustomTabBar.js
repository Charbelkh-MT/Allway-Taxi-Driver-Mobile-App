import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { FONTS } from '../theme';

function HomeIcon({ active, color }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {active
        ? <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-5H9v5H4a1 1 0 01-1-1V10.5z" fill={color} />
        : <>
            <Path d="M3 10.5L12 3l9 7.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M5 8.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V8.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </>
      }
    </Svg>
  );
}

function TripsIcon({ active, color }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill={active ? `${color}22` : 'none'} stroke={color} strokeWidth={active ? 2 : 1.8} />
      <Polyline points="12 7 12 12 15.5 14" stroke={color} strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AccountIcon({ active, color }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.5" fill={active ? `${color}22` : 'none'} stroke={color} strokeWidth={active ? 2 : 1.8} />
      <Path d="M4 20c0-3.5 3.6-6.5 8-6.5s8 3 8 6.5" stroke={color} strokeWidth={active ? 2 : 1.8} strokeLinecap="round" />
    </Svg>
  );
}

const TAB_ICONS = { Home: HomeIcon, Trips: TripsIcon, Account: AccountIcon };

function TabItem({ route, index, isFocused, navigation, colors }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dotAnim   = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(dotAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [isFocused]);

  function onPress() {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      Haptics.selectionAsync();
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 0.82, useNativeDriver: true, tension: 200, friction: 8 }),
        Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 120, friction: 6 }),
      ]).start();
      navigation.navigate(route.name);
    }
  }

  const Icon  = TAB_ICONS[route.name];
  const color = isFocused ? colors.yellow : colors.textMuted;

  const dotScale   = dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const dotOpacity = dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <TouchableOpacity onPress={onPress} style={styles.tab} activeOpacity={1}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Icon active={isFocused} color={color} />
        <Text style={[styles.label, { color }]}>{route.name}</Text>
      </Animated.View>
      <Animated.View style={[
        styles.activeDot,
        { backgroundColor: colors.yellow, transform: [{ scale: dotScale }], opacity: dotOpacity },
      ]} />
    </TouchableOpacity>
  );
}

export default function CustomTabBar({ state, navigation }) {
  const insets         = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const tabItems = state.routes.map((route, index) => (
    <TabItem
      key={route.key}
      route={route}
      index={index}
      isFocused={state.index === index}
      navigation={navigation}
      colors={colors}
    />
  ));

  if (Platform.OS === 'ios') {
    if (isDark) {
      return (
        <View style={[styles.iosDark, { paddingBottom: insets.bottom }]}>
          <BlurView intensity={95} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)' }]} pointerEvents="none" />
          <View style={styles.row}>{tabItems}</View>
        </View>
      );
    }
    return (
      <View style={[styles.iosLight, { paddingBottom: insets.bottom }]}>
        <View style={styles.row}>{tabItems}</View>
      </View>
    );
  }

  return (
    <View style={[styles.androidBar, { backgroundColor: '#FFFFFF', paddingBottom: insets.bottom + 4 }]}>
      <View style={styles.row}>{tabItems}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  iosDark:    { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  iosLight:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF' },
  androidBar: { backgroundColor: '#FFFFFF' },
  row:        { flexDirection: 'row', paddingTop: 10, paddingBottom: 4 },
  tab:        { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 },
  label:      { fontSize: 10, fontFamily: FONTS.semiBold, marginTop: 1 },
  activeDot:  { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
