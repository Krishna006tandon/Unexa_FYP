let Expo;
let expoInstance;

exports.sendPushNotification = async (pushToken, title, body, data = {}) => {
  // Lazy load ESM module in CommonJS
  if (!Expo) {
    const sdk = await import('expo-server-sdk');
    Expo = sdk.Expo;
    expoInstance = new Expo();
  }

  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  }

  const messages = [{
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  }];

  try {
    let chunks = expoInstance.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expoInstance.sendPushNotificationsAsync(chunk);
        console.log('✅ [NOTIFIER] Notification Ticket:', ticketChunk);
      } catch (error) {
        console.error('❌ [NOTIFIER] Ticket Error:', error);
      }
    }
  } catch (error) {
    console.error('❌ [NOTIFIER] Batch Error:', error);
  }
};
