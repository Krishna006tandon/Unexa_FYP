const { Expo } = require('expo-server-sdk');
let expo = new Expo();

exports.sendPushNotification = async (pushToken, title, body, data = {}) => {
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
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('✅ [NOTIFIER] Notification Ticket:', ticketChunk);
      } catch (error) {
        console.error('❌ [NOTIFIER] Ticket Error:', error);
      }
    }
  } catch (error) {
    console.error('❌ [NOTIFIER] Batch Error:', error);
  }
};
