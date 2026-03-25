import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Phone, PhoneOff, User, Video } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import ProfileContext from './ProfileContext';
import { AuthContext } from './AuthContext';
import * as NavigationService from '../services/NavigationService'; // We'll need this for redirect
import * as Notifications from 'expo-notifications';

// Handle notifications in foreground
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { socket } = useContext(ProfileContext);
  const { user } = useContext(AuthContext);

  const [incomingCall, setIncomingCall] = useState(null);
  const [isRinging, setIsRinging] = useState(false);
  const soundRef = useRef(null);
  const vibrationInterval = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for Incoming Call Signals
    socket.on('call-invite', (data) => {
      // GUARD: If already on CallScreen, don't show another invitation
      const currentRoute = NavigationService.getCurrentRouteName?.();
      if (currentRoute === 'CallScreen') {
        console.log('📱 [CallContext] Already in a call, ignoring invite');
        return;
      }

      console.log(' [FRONTEND] 🚨 INCOMING SIGNAL RECEIVED:', data);
      setIncomingCall(data);
      startRinging(data);
    });

    socket.on('call-cancelled', () => {
      stopRinging();
      setIncomingCall(null);
      Notifications.dismissAllNotificationsAsync();
    });

    return () => {
      socket.off('call-invite');
      socket.off('call-cancelled');
      stopRinging();
    };
  }, [socket]);

  const startRinging = async (callData) => {
    setIsRinging(true);
    
    // Trigger Push Notification
    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Incoming ${callData.type === 'video' ? 'Video' : 'Voice'} Call`,
          body: `${callData.callerName || 'Someone'} is calling you...`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // show immediately
      });
    }

    // Start Vibration Loop
    if (Platform.OS !== 'web') {
      vibrationInterval.current = setInterval(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 1000);
    }

    // Play Ringtone
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' }, // Placeholder ringtone
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
    } catch (e) {
      console.log('Error playing ringtone', e);
    }
  };

  const stopRinging = async () => {
    setIsRinging(false);
    if (vibrationInterval.current) clearInterval(vibrationInterval.current);
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const acceptCall = () => {
    const callData = incomingCall;
    console.log('✅ [CallContext] Accepting call from:', callData.callerName);
    stopRinging();
    setIncomingCall(null);
    Notifications.dismissAllNotificationsAsync();
    
    // Navigate to Call Screen
    NavigationService.navigate('CallScreen', {
      chatId: callData.chatId,
      type: callData.type,
      name: callData.callerName,
      isIncoming: true,
      receiverId: callData.callerId,
      avatar: callData.callerAvatar // PASS AVATAR
    });
  };

  const declineCall = () => {
    socket.emit('call-decline', { 
        callerId: incomingCall.callerId, 
        chatId: incomingCall.chatId 
    });
    stopRinging();
    setIncomingCall(null);
    Notifications.dismissAllNotificationsAsync();
  };

  return (
    <CallContext.Provider value={{ setIncomingCall, incomingCall, stopRinging, acceptCall, declineCall }}>
      {children}
      
      {/* GLOBAL INCOMING CALL MODAL */}
      <Modal visible={isRinging} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={StyleSheet.absoluteFill} />
          
          <View style={styles.content}>
            <View style={styles.callerInfo}>
              <View style={styles.avatarGlow}>
                <View style={styles.avatarCircle}>
                   {incomingCall?.callerAvatar ? (
                     <Image source={{ uri: incomingCall.callerAvatar }} style={styles.avatarImg} />
                   ) : (
                     <View style={[styles.avatarCircle, { backgroundColor: '#7B61FF', width: '100%', height: '100%' }]}>
                        <Text style={styles.avatarInitial}>{incomingCall?.callerName?.[0] || 'U'}</Text>
                     </View>
                   )}
                </View>
              </View>
              <Text style={styles.callerName}>{incomingCall?.callerName || 'Unknown Caller'}</Text>
              <Text style={styles.callTypeText}>Incoming {incomingCall?.type === 'video' ? 'Video' : 'Voice'} Call...</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.callBtn, styles.declineBtn]} onPress={declineCall}>
                <PhoneOff color="#FFF" size={32} />
                <Text style={styles.btnLabel}>Decline</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.callBtn, styles.acceptBtn]} onPress={acceptCall}>
                <Phone color="#FFF" size={32} />
                <Text style={styles.btnLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CallContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, width: '100%', justifyContent: 'space-between', paddingVertical: 100, alignItems: 'center' },
  callerInfo: { alignItems: 'center' },
  avatarGlow: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(123, 97, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  avatarCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 110, height: 110, borderRadius: 55 },
  avatarInitial: { color: '#FFF', fontSize: 48, fontWeight: 'bold' },
  callerName: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  callTypeText: { color: '#3DDCFF', fontSize: 18, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 60, marginTop: 100 },
  callBtn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  acceptBtn: { backgroundColor: '#00C853' },
  declineBtn: { backgroundColor: '#FF4B4B' },
  btnLabel: { color: '#FFF', marginTop: 10, fontSize: 14, fontWeight: 'bold' }
});
