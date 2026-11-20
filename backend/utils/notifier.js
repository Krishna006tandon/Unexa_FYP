let Expo;
let expoInstance;

const initExpo = async () => {
  if (!Expo) {
    const sdk = await import('expo-server-sdk');
    Expo = sdk.Expo;
    expoInstance = new Expo();
  }
  return { Expo, expoInstance };
};

exports.sendPushNotification = async (pushToken, title, body, data = {}, options = {}) => {
  try {
    const { Expo, expoInstance } = await initExpo();

    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      console.warn(`⚠️ [NOTIFIER] Push token is invalid or missing: ${pushToken}`);
      return;
    }

    const channelId = options.channelId || data.channelId || 'default';
    const priority = options.priority || 'high';

    const message = {
      to: pushToken,
      sound: options.sound || 'default',
      title: title,
      body: body,
      data: data,
      priority: priority,
      channelId: channelId,
      badge: options.badge,
      android: {
        channelId: channelId,
        sound: options.sound || 'default',
        priority: priority,
        vibrate: [0, 250, 250, 250],
      }
    };

    const chunks = expoInstance.chunkPushNotifications([message]);
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expoInstance.sendPushNotificationsAsync(chunk);
        console.log('✅ [NOTIFIER] Notification Ticket:', ticketChunk);
      } catch (error) {
        console.error('❌ [NOTIFIER] Ticket Error:', error?.message || error);
      }
    }
  } catch (error) {
    console.error('❌ [NOTIFIER] Batch Error:', error?.message || error);
  }
};

exports.sendPushNotifications = async (pushTokens, title, body, data = {}, options = {}) => {
  try {
    const { Expo, expoInstance } = await initExpo();
    if (!Array.isArray(pushTokens) || pushTokens.length === 0) return;

    const validTokens = pushTokens.filter(t => t && Expo.isExpoPushToken(t));
    if (validTokens.length === 0) {
      console.warn('⚠️ [NOTIFIER] No valid push tokens provided in batch');
      return;
    }

    const channelId = options.channelId || data.channelId || 'default';
    const priority = options.priority || 'high';

    const messages = validTokens.map(token => ({
      to: token,
      sound: options.sound || 'default',
      title: title,
      body: body,
      data: data,
      priority: priority,
      channelId: channelId,
      badge: options.badge,
      android: {
        channelId: channelId,
        sound: options.sound || 'default',
        priority: priority,
        vibrate: [0, 250, 250, 250],
      }
    }));

    const chunks = expoInstance.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expoInstance.sendPushNotificationsAsync(chunk);
        console.log('✅ [NOTIFIER] Batch Tickets:', ticketChunk);
      } catch (error) {
        console.error('❌ [NOTIFIER] Batch Ticket Error:', error?.message || error);
      }
    }
  } catch (error) {
    console.error('❌ [NOTIFIER] Batch Error:', error?.message || error);
  }
};
