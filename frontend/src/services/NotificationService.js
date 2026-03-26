import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as NavigationService from './NavigationService';
import { showAlertGlobal } from '../context/UIContext';


// Global notification configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestPermissions = async () => {
  if (Platform.OS === 'web') return false;

  console.log('🔔 [Notifications] Requesting permissions...');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ [Notifications] Permission NOT granted');
    showAlertGlobal(
      'Notifications Disabled',
      'Please enable notifications in your settings to receive alerts for calls and messages.',
      'warning'
    );
    return false;
  }


  console.log('✅ [Notifications] Permission granted');

  // Android specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B61FF',
    });
    
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Incoming Calls',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default', // Ideally use a ringtone
      vibrationPattern: [0, 500, 500, 500],
      lightColor: '#7B61FF',
      enableVibration: true,
    });
  }

  return true;
};

export const scheduleLocalNotification = async (title, body, data = {}, channelId = 'default') => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // show immediately
    });
  } catch (error) {
    console.error('❌ [Notifications] Error scheduling notification:', error);
  }
};

// Listener setup for when a notification is clicked
export const setupNotificationClickListeners = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
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
