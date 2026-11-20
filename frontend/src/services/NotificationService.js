import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as NavigationService from './NavigationService';
import { showAlertGlobal } from '../context/UIContext';

// Global notification configuration for when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Configure Android notification channels immediately on startup.
 * Android 8+ requires channels for notifications to display with sound, vibration, and heads-up banner.
 */
export const initNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B61FF',
      enableVibrate: true,
      sound: 'default',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Chat Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3DDCFF',
      enableVibrate: true,
      sound: 'default',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Calls & Direct Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#00C853',
      enableVibrate: true,
      sound: 'default',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    console.log('✅ [Notifications] Android channels configured');
  } catch (channelErr) {
    console.warn('⚠️ [Notifications] Error creating channels:', channelErr?.message);
  }
};

// Initialize channels immediately on module evaluation
if (Platform.OS === 'android') {
  initNotificationChannels().catch(() => {});
}

/**
 * Request notification permissions from user
 */
export const requestPermissions = async () => {
  if (Platform.OS === 'web') return false;

  console.log('🔔 [Notifications] Requesting permissions...');
  let finalStatus;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  } catch (err) {
    console.warn('⚠️ [Notifications] Permission check error:', err?.message);
    return false;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ [Notifications] Permission NOT granted');
    return false;
  }

  // Ensure Android channels are configured
  await initNotificationChannels();

  return true;
};

/**
 * Retrieve the Expo Push Token to register with backend
 */
export const getPushToken = async () => {
  if (Platform.OS === 'web') return null;
  
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      status = res.status;
    }
    if (status !== 'granted') {
      console.log('⚠️ [Notifications] Cannot obtain push token without permission');
      return null;
    }

    // Ensure channels exist
    await initNotificationChannels();

    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId ?? 
      '2f5c4478-8850-473b-9b46-cd5121d02f24';

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data;
    if (token) {
      console.log('📲 [Notifications] Push token obtained successfully:', `${token.slice(0, 25)}...`);
    }
    return token;
  } catch (error) {
    console.error('❌ [Notifications] Error getting push token:', error?.message || error);
    if (
      error?.message?.includes('Firebase') || 
      error?.message?.includes('FIS_AUTH_ERROR') || 
      error?.message?.includes('Default FirebaseApp')
    ) {
      console.warn('⚠️ [Notifications] Standalone Android builds require google-services.json for remote push notifications.');
    }
    return null;
  }
};

/**
 * Schedule a local notification (used when socket receives an event in foreground/minimized state)
 */
export const scheduleLocalNotification = async (title, body, data = {}, channelId = 'default') => {
  try {
    const validChannel = channelId || 'default';
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        channelId: Platform.OS === 'android' ? validChannel : undefined,
      },
      trigger: null, // show immediately
    });
  } catch (error) {
    console.error('❌ [Notifications] Error scheduling notification:', error?.message || error);
  }
};

/**
 * Handle notification tap when app is launched from killed/cold-start state
 */
export const handleInitialNotification = async () => {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response?.notification?.request?.content?.data;
      console.log('📬 [Notifications] App opened via initial notification tap:', data);
      if (data && data.route) {
        setTimeout(() => {
          if (data.params) {
            NavigationService.navigate(data.route, data.params);
          } else {
            NavigationService.navigate(data.route);
          }
        }, 800);
      }
    }
  } catch (err) {
    console.warn('⚠️ [Notifications] Error checking initial notification response:', err?.message);
  }
};

/**
 * Listener setup for when a notification is clicked while app is active or in background
 */
export const setupNotificationClickListeners = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response?.notification?.request?.content?.data;
    console.log('📬 [Notifications] Notification clicked:', data);
    if (data && data.route) {
      if (data.params) {
        NavigationService.navigate(data.route, data.params);
      } else {
        NavigationService.navigate(data.route);
      }
    }
  });

  return () => subscription.remove();
};
