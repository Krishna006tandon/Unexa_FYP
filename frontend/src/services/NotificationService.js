import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as NavigationService from './NavigationService';
import { showAlertGlobal } from '../context/UIContext';

// Global notification configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

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

  // Android specific channel setup (required for Android 8+)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7B61FF',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3DDCFF',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls & Direct Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#00C853',
        enableVibrate: true,
        showBadge: true,
      });
      console.log('✅ [Notifications] Android channels configured');
    } catch (channelErr) {
      console.warn('⚠️ [Notifications] Error creating channels:', channelErr?.message);
    }
  }

  return true;
};

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

    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId ?? 
      '2f5c4478-8850-473b-9b46-cd5121d02f24';

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data;
    if (token) {
      console.log('📲 [Notifications] Push token obtained successfully:', `${token.slice(0, 20)}...`);
    }
    return token;
  } catch (error) {
    console.error('❌ [Notifications] Error getting push token:', error?.message || error);
    return null;
  }
};

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

// Listener setup for when a notification is clicked
export const setupNotificationClickListeners = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response?.notification?.request?.content?.data;
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
