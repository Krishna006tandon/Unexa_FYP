import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { Phone, PhoneOff, User, Video } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import ProfileContext from './ProfileContext';
import { AuthContext } from './AuthContext';
import * as NavigationService from '../services/NavigationService'; 
import * as NotificationService from '../services/NotificationService';
import * as Notifications from 'expo-notifications';




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
    
    // Trigger Local Notification for incoming call
    NotificationService.scheduleLocalNotification(
      `Incoming ${callData.type === 'video' ? 'Video' : 'Voice'} Call`,
      `${callData.callerName || 'Someone'} is calling you...`,
      { 
        route: 'CallScreen', 
        params: { 
          chatId: callData.chatId, 
          type: callData.type, 
          name: callData.callerName, 
          isIncoming: true, 
          receiverId: callData.callerId 
        } 
      },
      'calls'
    );


    // Start Vibration Loop
    vibrationInterval.current = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);

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
              <View style={styles.btnContainer}>
                <TouchableOpacity style={[styles.callBtn, styles.declineBtn]} onPress={declineCall}>
                  <PhoneOff color="#FFF" size={32} />
                </TouchableOpacity>
                <Text style={styles.btnLabel}>Decline</Text>
              </View>
              
              <View style={styles.btnContainer}>
                <TouchableOpacity style={[styles.callBtn, styles.acceptBtn]} onPress={acceptCall}>
                  <Phone color="#FFF" size={32} />
                </TouchableOpacity>
                <Text style={styles.btnLabel}>Accept</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </CallContext.Provider>
  );
};

const { width } = Dimensions.get('window');
const scale = width / 375;
const normalize = (size) => Math.round(size * scale);

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, width: '100%', justifyContent: 'center', paddingVertical: normalize(40), alignItems: 'center' },
  callerInfo: { alignItems: 'center', marginBottom: normalize(60) },
  avatarGlow: { width: normalize(130), height: normalize(130), borderRadius: normalize(65), backgroundColor: 'rgba(123, 97, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: normalize(20) },
  avatarCircle: { width: normalize(100), height: normalize(100), borderRadius: normalize(50), justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: normalize(100), height: normalize(100), borderRadius: normalize(50) },
  avatarInitial: { color: '#FFF', fontSize: normalize(40), fontWeight: 'bold' },
  callerName: { color: '#FFF', fontSize: normalize(28), fontWeight: 'bold', marginBottom: normalize(10), textAlign: 'center', paddingHorizontal: normalize(20) },
  callTypeText: { color: '#3DDCFF', fontSize: normalize(16), fontWeight: '600' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', marginTop: normalize(20), width: '100%' },
  btnContainer: { alignItems: 'center', marginHorizontal: normalize(25) },
  callBtn: { width: normalize(70), height: normalize(70), borderRadius: normalize(35), justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  acceptBtn: { backgroundColor: '#00C853' },
  declineBtn: { backgroundColor: '#FF4B4B' },
  btnLabel: { color: '#FFF', marginTop: normalize(10), fontSize: normalize(13), fontWeight: 'bold' }
});
