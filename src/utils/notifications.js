import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function sendTripNotification(trip) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚕 New Trip Request',
        body: `${trip.pickup} → ${trip.dropoff}  ·  ${trip.fare}`,
        data: { tripId: trip.id },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'trip-requests' }),
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
    Notifications.setNotificationChannelAsync('trip-requests', {
      name: 'Trip Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F5B800',
      sound: true,
    });
    Notifications.setNotificationChannelAsync('general', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Push tokens require a valid EAS projectId and a real device build.
  // In Expo Go this will always fail — we swallow the error silently.
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch {
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
