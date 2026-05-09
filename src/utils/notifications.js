import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function sendTripNotification(trip) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚕 New Trip Request',
        body: `${trip.pickup} → ${trip.dropoff}  ·  ${trip.fare}`,
        data: { tripId: trip.id },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'trip-alerts-v2' }),
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[Notification] sendTripNotification:', e.message);
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trip-alerts-v2', {
      name:             'Trip Alerts',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor:       '#F5B800',
      sound:            'default',
      enableLights:     true,
      enableVibrate:    true,
      showBadge:        true,
    });
    await Notifications.setNotificationChannelAsync('general-v2', {
      name:       'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound:      'default',
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) { console.warn('[Push] No projectId found in app config'); return null; }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('[Push] Token registered:', token);
    return token;
  } catch (e) {
    console.warn('[Push] getExpoPushTokenAsync failed:', e.message);
    return null;
  }
}

export async function sendDemoTripNotification(trip) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚕 New Trip Request',
      body: `${trip.pickup} → ${trip.dropoff} · ${trip.fare}`,
      data: { tripId: trip.id },
      sound: true,
    },
    trigger: null,
  });
}
