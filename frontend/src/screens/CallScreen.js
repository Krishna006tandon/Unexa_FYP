import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, Alert } from 'react-native';
import { PhoneOff, MicOff, VideoOff, RefreshCcw, Volume2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCView, mediaDevices } from 'react-native-webrtc';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';

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
  const { user } = useContext(AuthContext);
  
  // WebRTC States
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  
  // WebRTC References
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimer = useRef(null);
  
  // WebRTC Configuration
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ]
  };
  
  useEffect(() => {
    if (!permission && type === 'video') {
      requestPermission();
    }
  }, [permission, type]);

  useEffect(() => {
    initializeCall();
    
    return () => {
      endCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Initialize Socket.IO for signaling
      socket.current = io('https://unexa-fyp.onrender.com');
      socket.current.emit('join-call', { chatId, userId: user._id });
      
      // Setup WebRTC
      await setupWebRTC();
      
      // Start call timer
      startCallTimer();
      
      setCallStatus('Connected');
      console.log('✅ WebRTC call initialized');
      
    } catch (error) {
      console.error('❌ WebRTC initialization error:', error);
      setCallStatus('Failed to connect');
      Alert.alert('Error', 'Failed to initialize call');
    }
  };

  const setupWebRTC = async () => {
    try {
      // Create peer connection
      peerConnection.current = new RTCPeerConnection(configuration);
      
      // Get local media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? {
          facingMode: facing,
          width: 1280,
          height: 720
        } : false
      });
      
      setLocalStream(stream);
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });
      
      // Handle remote stream
      peerConnection.current.onaddstream = (event) => {
        setRemoteStream(event.stream);
        console.log('✅ Remote stream received');
      };
      
      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current.emit('ice-candidate', {
            candidate: event.candidate,
            chatId,
            userId: user._id
          });
        }
      };
      
      // Setup socket listeners
      socket.current.on('offer', async (data) => {
        await handleOffer(data);
      });
      
      socket.current.on('answer', async (data) => {
        await handleAnswer(data);
      });
      
      socket.current.on('ice-candidate', async (data) => {
        await handleIceCandidate(data);
      });
      
      // Create and send offer (caller)
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      socket.current.emit('offer', {
        offer: offer,
        chatId,
        userId: user._id
      });
      
    } catch (error) {
      console.error('❌ WebRTC setup error:', error);
      throw error;
    }
  };

  const handleOffer = async (data) => {
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      socket.current.emit('answer', {
        answer: answer,
        chatId,
        userId: user._id
      });
    } catch (error) {
      console.error('❌ Handle offer error:', error);
    }
  };

  const handleAnswer = async (data) => {
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('❌ Handle answer error:', error);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('❌ Handle ICE candidate error:', error);
    }
  };

  const startCallTimer = () => {
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const endCall = () => {
    try {
      // Clear timer
      if (callTimer.current) {
        clearInterval(callTimer.current);
      }
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close peer connection
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      
      // Disconnect socket
      if (socket.current) {
        socket.current.disconnect();
      }
      
      setCallStatus('Call Ended');
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
      
    } catch (error) {
      console.error('❌ End call error:', error);
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a103c', '#000000']} style={StyleSheet.absoluteFill} />

      {/* Remote Video (Full Screen) */}
      {remoteStream && type === 'video' && (
        <View style={StyleSheet.absoluteFill}>
          <RTCView
            streamURL={remoteStream.toURL()}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
        </View>
      )}

      {/* Local Video (Picture in Picture) */}
      {localStream && type === 'video' && !isVideoOff && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={facing === 'front'}
          />
        </View>
      )}

      {/* Profile Info for Audio Call or when video is off */}
      {(type === 'audio' || !remoteStream || isVideoOff) && (
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
      )}

      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.encryptionText}>End-to-End Encrypted</Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.buttonRow}>
          
          <TouchableOpacity 
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]} 
            onPress={toggleMute}>
            <MicOff color={isMuted ? '#000' : '#FFF'} size={26} />
          </TouchableOpacity>
          
          {type === 'video' && (
            <TouchableOpacity 
              style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]} 
              onPress={toggleVideo}>
              <VideoOff color={isVideoOff ? '#000' : '#FFF'} size={26} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]} 
            onPress={toggleSpeaker}>
            <Volume2 color={isSpeaker ? '#000' : '#FFF'} size={26} />
          </TouchableOpacity>

          {type === 'video' && !isVideoOff && (
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: '600',
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
    color: THEME.colors.text,
    marginBottom: 8
  },
  statusText: {
    fontSize: 16,
    color: THEME.colors.textDim,
    marginBottom: 30
  },
  localVideoContainer: {
    position: 'absolute',
    top: 90,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    zIndex: 10
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 20,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controlBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  endCallBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: THEME.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,75,75,0.3)',
  },
});

export default CallScreen;
