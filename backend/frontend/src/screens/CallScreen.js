import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { PhoneOff, MicOff, VideoOff, RefreshCcw, Volume2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const THEME = {
  colors: {
    background: '#0F0F1A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    danger: '#FF4B4B',
    success: '#00C853',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.1)',
  }
};

const CallScreen = ({ route, navigation }) => {
  const { chatId, type, name, profilePhoto } = route.params || {};
  
  const [callStatus, setCallStatus] = useState('Calling...');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(type === 'video');
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission && type === 'video') {
      requestPermission();
    }
  }, [permission, type]);

  // Simulate ringing then connecting
  useEffect(() => {
    const ringingTimer = setTimeout(() => {
      setCallStatus('Connected');
    }, 4000); // Connects after 4 seconds

    return () => clearTimeout(ringingTimer);
  }, []);

  // Timer logic
  useEffect(() => {
    let timer;
    if (callStatus === 'Connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const endCall = () => {
    setCallStatus('Call Ended');
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a103c', '#000000']} style={StyleSheet.absoluteFill} />

      {/* Actual Live Camera Background (If Video Call is Active) */}
      {!isVideoOff && permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing={facing} mute={isMuted} />
      ) : null}

      {/* Dim Overlay when Camera is active for better UI visibility */}
      {!isVideoOff && permission?.granted && (
         <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      )}

      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.encryptionText}>End-to-End Encrypted</Text>
      </View>

      {/* Center Profile Info (Always visible on Audio Call, but stays active during connecting phase of Video Call) */}
      {(isVideoOff || callStatus !== 'Connected') ? (
        <View style={styles.profileContainer}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: profilePhoto || 'https://i.pravatar.cc/300' }} 
              style={styles.avatar} 
            />
          </View>
          <Text style={styles.nameText}>{name || 'User'}</Text>
          <Text style={[
            styles.statusText, 
            callStatus === 'Connected' && { color: THEME.colors.success },
            callStatus === 'Call Ended' && { color: THEME.colors.danger }
          ]}>
            {callStatus === 'Connected' ? formatTime(callDuration) : callStatus}
          </Text>
        </View>
      ) : (
        /* Minimal Top-Left Name if Camera is Full Screen */
        <View style={styles.minimalProfile}>
           <Image source={{ uri: profilePhoto || 'https://i.pravatar.cc/300' }} style={styles.minimalAvatar} />
           <View>
              <Text style={styles.minimalName}>{name || 'User'}</Text>
              <Text style={styles.minimalStatus}>{formatTime(callDuration)}</Text>
           </View>
        </View>
      )}

      {/* Background visual if video call is active but permission denied */}
      {!isVideoOff && !permission?.granted && callStatus === 'Connected' && (
        <View style={styles.pipView}>
          <LinearGradient colors={['#3DDCFF', '#7B61FF']} style={styles.pipAvatarPlaceholder}>
            <Text style={{color: '#FFF', fontWeight: 'bold'}}>No Camera Access</Text>
          </LinearGradient>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.buttonRow}>
          
          <TouchableOpacity 
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]} 
            onPress={() => setIsMuted(!isMuted)}>
            <MicOff color={isMuted ? '#000' : '#FFF'} size={26} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]} 
            onPress={() => setIsVideoOff(!isVideoOff)}>
            <VideoOff color={isVideoOff ? '#000' : '#FFF'} size={26} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]} 
            onPress={() => setIsSpeaker(!isSpeaker)}>
            <Volume2 color={isSpeaker ? '#000' : '#FFF'} size={26} />
          </TouchableOpacity>

          {!isVideoOff && (
            <TouchableOpacity 
              style={styles.controlBtn}
              onPress={toggleCameraFacing}>
              <RefreshCcw color="#FFF" size={26} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
          <PhoneOff color="#FFF" size={32} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingTop: Platform.OS === 'android' ? 40 : 0
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    zIndex: 10
  },
  encryptionText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  profileContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -50,
    zIndex: 10
  },
  minimalProfile: {
    position: 'absolute',
    top: 90,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingRight: 15,
    borderRadius: 30,
    zIndex: 10
  },
  minimalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },
  minimalName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  minimalStatus: {
    color: THEME.colors.success,
    fontSize: 12
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: THEME.colors.primary,
    padding: 4,
    marginBottom: 20,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
    backgroundColor: '#1E1E1E'
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8
  },
  statusText: {
    fontSize: 18,
    color: THEME.colors.textDim
  },
  controlsContainer: {
    paddingBottom: 50,
    paddingHorizontal: 30,
    alignItems: 'center',
    zIndex: 10,
    marginTop: 'auto'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 40
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#FFF'
  },
  endCallBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: THEME.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4B4B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8
  },
  pipView: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.colors.glass,
    zIndex: 10
  },
  pipAvatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default CallScreen;
