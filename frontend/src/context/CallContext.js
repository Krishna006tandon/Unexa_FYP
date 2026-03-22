import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Phone, PhoneOff, User, Video } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import ProfileContext from './ProfileContext';
import { AuthContext } from './AuthContext';
import * as NavigationService from '../services/NavigationService'; // We'll need this for redirect

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
      console.log('📡 INCOMING CALL SIGNAL:', data.callerName);
      setIncomingCall(data);
      startRinging();
    });

    socket.on('call-cancelled', () => {
      stopRinging();
      setIncomingCall(null);
    });

    return () => {
      socket.off('call-invite');
      socket.off('call-cancelled');
      stopRinging();
    };
  }, [socket]);

  const startRinging = async () => {
    setIsRinging(true);
    
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
    stopRinging();
    setIncomingCall(null);
    
    // Navigate to Call Screen
    NavigationService.navigate('CallScreen', {
      chatId: callData.chatId,
      type: callData.type,
      name: callData.callerName,
      isIncoming: true
    });
  };

  const declineCall = () => {
    socket.emit('call-decline', { 
        callerId: incomingCall.callerId, 
        chatId: incomingCall.chatId 
    });
    stopRinging();
    setIncomingCall(null);
  };

  return (
    <CallContext.Provider value={{ setIncomingCall, incomingCall, stopRinging }}>
      {children}
      
      {/* GLOBAL INCOMING CALL MODAL */}
      <Modal visible={isRinging} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={StyleSheet.absoluteFill} />
          
          <View style={styles.content}>
            <View style={styles.callerInfo}>
              <View style={styles.avatarGlow}>
                <View style={[styles.avatarCircle, { backgroundColor: '#7B61FF' }]}>
                  <Text style={styles.avatarInitial}>{incomingCall?.callerName?.[0] || 'U'}</Text>
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
  avatarCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 48, fontWeight: 'bold' },
  callerName: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  callTypeText: { color: '#3DDCFF', fontSize: 18, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 60, marginTop: 100 },
  callBtn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  acceptBtn: { backgroundColor: '#00C853' },
  declineBtn: { backgroundColor: '#FF4B4B' },
  btnLabel: { color: '#FFF', marginTop: 10, fontSize: 14, fontWeight: 'bold' }
});
