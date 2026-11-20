# 🔔 Background & Killed State Notifications Fix Guide (UNEXA)

## 📌 Problem Analysis (Killed/Background Me Notification Na Aane Ka Karan)

App jab foreground ya minimized (background) hoti thi, tab Socket.IO connected rehta tha aur local notifications (`scheduleLocalNotification`) kaam kar rahe the.
Lekin jaise hi app ko **close/kill (swipe away)** kiya jaata tha:
1. **Socket.IO Disconnect Ho Jaata Tha:** Killed state me koi background socket process run nahi kar sakti.
2. **Push Token Register Nahi Ho Raha Tha:** Expo SDK 54 aur Android standalone builds (APK/AAB) me push notifications ke liye **Firebase Cloud Messaging (FCM)** aur `google-services.json` anivarya (mandatory) hota hai. Iske bina `getExpoPushTokenAsync()` error throw kar raha tha aur backend me user ka `pushToken` null save tha.
3. **Backend Se Push Notification Trigger Missing Thi:** Jab token hi nahi tha, backend push notification nahi bhej paata tha. Sath hi media-share aur forward messages me push notification ka code missing tha.
4. **Android 8+ Notification Channels Configuration:** Background push delivery ke liye channels ka `sound`, `priority`, aur `lockscreenVisibility` explicitly MAX hona chahiye tha.
5. **Cold Start Deep Linking:** Killed state me notification tap karne par app open hone ke baad navigation trigger nahi ho raha tha (`getLastNotificationResponseAsync` missing tha).

---

## 🛠️ Code Fixes Implemented (Kiye Gaye Sudhar)

### 1. Backend Improvements
- **`backend/utils/notifier.js`:**
  - `sendPushNotification` ko upgrade kiya gaya: ab yeh channel-specific (`messages`, `calls`, `default`), high priority, system sound, vibration pattern aur badge handle karta hai.
  - `sendPushNotifications` (batching) function add kiya gaya group chats ke liye.
  - Missing token aur delivery failure logs add kiye gaye.
- **`backend/controllers/messageController.js`:**
  - Messages ke liye channel `messages` set kiya gaya aur push token na hone par diagnostic warning add ki gayi.
- **`backend/routes/webrtc.js`:**
  - Incoming audio/video call ke liye push notification ko `channelId: 'calls'` aur high priority ke saath configure kiya gaya.
- **`backend/routes/mediaShare.js`:**
  - View-once media receive hone par pehle sirf socket event jaata tha. Ab recipient ko push notification bhi jaayegi (`New Photo/Video 📸`).
- **`backend/controllers/advancedChatController.js`:**
  - Forwarded messages ke recipients ko bhi background push notifications trigger hogi.

### 2. Frontend Improvements
- **`frontend/src/services/NotificationService.js`:**
  - `initNotificationChannels()` function banaya jo app startup par turant teeno Android channels (`default`, `messages`, `calls`) create karta hai with `MAX` importance, sound, vibration, aur public lockscreen visibility.
  - `handleInitialNotification()` add kiya gaya jo `Notifications.getLastNotificationResponseAsync()` use karke killed state se app open hone par user ko direct chat/call screen par navigate karta hai.
  - `getPushToken()` me robust error handling aur detailed warnings add kiye gaye.
- **`frontend/src/context/AuthContext.js`:**
  - `AppState` listener add kiya: jab bhi user app me wapas aayega (e.g., settings se notification permission grant karke), token automatically backend par update ho jayega.
  - Push token sync me retry mechanism lagaya gaya.
- **`frontend/App.js`:**
  - App start hone par `initNotificationChannels()` call hota hai.
  - `NavigationContainer` ke `onReady` hook me `handleInitialNotification()` link kiya gaya.
- **`frontend/app.config.js`:**
  - Permissions me `RECEIVE_BOOT_COMPLETED` aur `WAKE_LOCK` add kiya gaya.
  - `googleServicesFile` detection configure kiya gaya (`./google-services.json` ya `GOOGLE_SERVICES_JSON` env variable).
  - `expo-notifications` plugin config configure ki gayi with icon and color.

---

## 🚀 Firebase Setup Steps (Apne Build Me Push Notifications Activate Karne Ke Liye)

Apne Android build me push notifications receive karne ke liye Firebase Console se `google-services.json` download karke add karein:

1. [Firebase Console](https://console.firebase.google.com/) par jaayein aur apna project kholein (ya create karein).
2. **Add App** -> **Android** select karein.
3. Package Name me exact daalein:
   ```
   com.unexa.application
   ```
4. `google-services.json` file download karein.
5. Us file ko `frontend/` folder ke andar paste karein:
   ```
   frontend/google-services.json
   ```
6. **EAS Credentials Setup (FCM v1):**
   - Firebase Console me Project Settings -> **Service accounts** me jaayein.
   - **Generate new private key** par click karke JSON file download karein.
   - Terminal me run karein:
     ```bash
     cd frontend
     npx eas credentials
     ```
   - Android -> Select Profile -> **Google Service Account** upload karein (FCM V1 key).
7. Naya APK/Build banayein:
   ```bash
   cd frontend
   npx eas build --platform android --profile preview
   ```

Ab app band (killed/terminated) hone ke baad bhi notification heads-up banner ke saath sound aur vibration ke saath aayegi!
