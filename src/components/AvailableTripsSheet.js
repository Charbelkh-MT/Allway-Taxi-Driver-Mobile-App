import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, FlatList, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { FONTS, RADIUS } from '../theme';

const { width: SCREEN_W }  = Dimensions.get('window');
const PAGE_W               = SCREEN_W;
const LARGE_GROUP_THRESHOLD = 6;
const ORANGE               = '#F5A623';

function TripCard({ trip, onAccept, colors, isDark }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>

      <View style={[styles.fareRow, { backgroundColor: `${colors.yellow}12`, borderColor: `${colors.yellow}30` }]}>
        <View>
          <Text style={[styles.fareVal, { color: colors.yellow }]}>{trip.fare}</Text>
          <Text style={[styles.fareLabel, { color: colors.textMuted }]}>FARE</Text>
        </View>
        {!!trip.dist && (
          <View style={[styles.distPill, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.distText, { color: colors.textSecondary }]}>📍  {trip.dist}</Text>
          </View>
        )}
      </View>

      <View style={[styles.routeCard, { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8', borderColor: colors.border }]}>
        <View style={styles.addrRow}>
          <View style={[styles.addrDot, { backgroundColor: colors.green }]} />
          <View style={styles.addrBody}>
            <Text style={[styles.addrLabel, { color: colors.textMuted }]}>PICKUP</Text>
            <Text style={[styles.addrText, { color: colors.textPrimary }]} numberOfLines={2}>{trip.pickup}</Text>
          </View>
        </View>
        <View style={[styles.addrLine, { backgroundColor: colors.border }]} />
        <View style={styles.addrRow}>
          <View style={[styles.addrDot, { backgroundColor: colors.red }]} />
          <View style={styles.addrBody}>
            <Text style={[styles.addrLabel, { color: colors.textMuted }]}>DROP-OFF</Text>
            <Text style={[styles.addrText, { color: colors.textPrimary }]} numberOfLines={2}>{trip.dropoff}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.customerCard, { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8', borderColor: colors.border }]}>
        <View style={[styles.avatarCircle, { backgroundColor: `${colors.yellow}20` }]}>
          <Text style={[styles.avatarText, { color: colors.yellow }]}>
            {(trip.customerFull || trip.customer || 'R')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.custName, { color: colors.textPrimary }]}>
            {trip.customerFull || trip.customer || 'Passenger'}
          </Text>
          {!!trip.phone && (
            <Text style={[styles.custPhone, { color: colors.textMuted }]}>{trip.phone}</Text>
          )}
        </View>
        <Text style={[styles.custLabel, { color: colors.textDisabled }]}>RIDER</Text>
      </View>

      {(trip.groupSize ?? 0) > LARGE_GROUP_THRESHOLD && (
        <View style={[styles.largeBadge, { backgroundColor: `${ORANGE}15`, borderColor: `${ORANGE}40` }]}>
          <Text style={[styles.largeBadgeText, { color: ORANGE }]}>👥  Large group — {trip.groupSize} people</Text>
        </View>
      )}

      {!!trip.notes && (
        <View style={[styles.notesBlock, { backgroundColor: `${ORANGE}10`, borderColor: `${ORANGE}35` }]}>
          <Text style={[styles.notesLabel, { color: ORANGE }]}>📋  Dispatcher Notes</Text>
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>{trip.notes}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onAccept(trip);
        }}
        style={styles.acceptWrap}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[colors.yellow, colors.yellowDark]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.acceptBtn}
        >
          <Text style={styles.acceptText}>✓  Accept This Trip</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default function AvailableTripsSheet({ trips, onAccept, onClose }) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const flatRef   = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 110, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  function close() {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.88, tension: 110, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  function goTo(index) {
    flatRef.current?.scrollToOffset({ offset: PAGE_W * index, animated: true });
    setCurrentIndex(index);
  }

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.80)' }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />

        <Animated.View style={[styles.popup, { backgroundColor: colors.bg, transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>

          <View style={styles.popupHeader}>
            <View>
              <Text style={[styles.popupTitle, { color: colors.textPrimary }]}>
                Available Trips
              </Text>
              <Text style={[styles.popupSub, { color: colors.textMuted }]}>
                {currentIndex + 1} of {trips.length} · swipe to browse
              </Text>
            </View>
            <TouchableOpacity
              onPress={close}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
            >
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {trips.length > 1 && (
            <View style={styles.dots}>
              {trips.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
                  <View style={[
                    styles.dot,
                    i === currentIndex
                      ? { backgroundColor: colors.yellow, width: 18 }
                      : { backgroundColor: colors.border, width: 7 },
                  ]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Each item is PAGE_W wide so pagingEnabled snaps correctly on Android */}
          <FlatList
            ref={flatRef}
            data={trips}
            keyExtractor={t => t.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({ length: PAGE_W, offset: PAGE_W * index, index })}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
              setCurrentIndex(Math.min(Math.max(idx, 0), trips.length - 1));
            }}
            renderItem={({ item }) => (
              <View style={{ width: PAGE_W, paddingHorizontal: 24 }}>
                <TripCard
                  trip={item}
                  onAccept={onAccept}
                  colors={colors}
                  isDark={isDark}
                />
              </View>
            )}
          />

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  popup: {
    width: SCREEN_W - 24,
    maxHeight: '85%',
    borderRadius: RADIUS.xxxl,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  popupHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: 'transparent' },
  popupTitle:   { fontSize: 22, fontFamily: FONTS.black },
  popupSub:     { fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 2 },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, fontFamily: FONTS.bold },

  dots:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 12 },
  dot:   { height: 7, borderRadius: 4 },

  card:       { borderWidth: 1, borderRadius: RADIUS.xxl, overflow: 'hidden', gap: 10, padding: 16 },

  fareRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: 14, paddingHorizontal: 16 },
  fareVal:    { fontSize: 40, fontFamily: FONTS.black, lineHeight: 46 },
  fareLabel:  { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1 },
  distPill:   { borderWidth: 1, borderRadius: RADIUS.full, paddingVertical: 6, paddingHorizontal: 14 },
  distText:   { fontSize: 13, fontFamily: FONTS.semiBold },

  routeCard:  { borderWidth: 1, borderRadius: RADIUS.xl, padding: 14, gap: 2 },
  addrRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addrDot:    { width: 11, height: 11, borderRadius: 6, marginTop: 13, flexShrink: 0 },
  addrBody:   { flex: 1 },
  addrLabel:  { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 1, marginBottom: 3 },
  addrText:   { fontSize: 15, fontFamily: FONTS.bold, lineHeight: 21 },
  addrLine:   { width: 1.5, height: 12, marginLeft: 5, marginVertical: 3, borderRadius: 1 },

  customerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: RADIUS.xl, padding: 14 },
  avatarCircle: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 18, fontFamily: FONTS.black },
  custName:     { fontSize: 15, fontFamily: FONTS.black },
  custPhone:    { fontSize: 12, fontFamily: FONTS.semiBold, marginTop: 2 },
  custLabel:    { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },

  acceptWrap:     { borderRadius: RADIUS.xl, overflow: 'hidden' },
  acceptBtn:      { paddingVertical: 17, alignItems: 'center' },
  acceptText:     { fontSize: 15, fontFamily: FONTS.black, color: '#000' },
  largeBadge:     { borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 8, paddingHorizontal: 14 },
  largeBadgeText: { fontSize: 13, fontFamily: FONTS.extraBold },
  notesBlock:     { borderWidth: 1, borderRadius: RADIUS.lg, padding: 12, gap: 4 },
  notesLabel:     { fontSize: 10, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },
  notesText:      { fontSize: 13, fontFamily: FONTS.semiBold, lineHeight: 19 },
});
