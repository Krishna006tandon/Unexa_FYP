import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { PhoneOff, MicOff, VideoOff, Camera, Mic, Video as VideoIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';
import { CallContext } from '../context/CallContext';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';

// DIRECT IMPORT ONLY ON WEB
import AgoraRTC from 'agora-rtc-sdk-ng';

const { width, height } = Dimensions.get('window');

const THEME = {
  colors: {
    background: '#0F0F1A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    danger: '#FF4B4B',
  }
};

const CallScreenWeb = ({ route, navigation }) => {
  const { chatId, type, name, receiverId } = route.params || {};
  const { user } = useContext(AuthContext);
  const { socket } = useContext(ProfileContext);
  const { stopRinging } = useContext(CallContext);

  const [agoraToken, setAgoraToken] = useState(null);
  const [appId, setAppId] = useState(null);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  
  const client = useRef(null);
  const tracks = useRef({ video: null, audio: null });
  const uid = useMemo(() => Math.floor(Math.random() * 100000), []);

  useEffect(() => {
    fetchAgoraToken();
    if (socket) {
      if (receiverId) {
        const payload = {
          callerId: user._id || user.id,
          receiverId,
          callerName: user.fullName || user.username || 'Friend',
          chatId,
          type
        };
        console.log(`[FRONTEND-WEB] 📡 Emitting call-invite with payload:`, payload);
        socket.emit('call-invite', payload);
      }

      // Sync End Call
      socket.on('call-ended', (data) => {
         if (data.chatId === chatId) {
            console.log('🛑 [SOCKET-WEB] Call ended by other party');
            navigation.goBack();
         }
      });
    }

    return () => {
      if (socket) {
        if (receiverId) socket.emit('cancel-call', { receiverId, chatId });
        socket.off('call-ended');
      }
      stopRinging();
      if (tracks.current.audio) {
        tracks.current.audio.stop();
        tracks.current.audio.close();
      }
      if (tracks.current.video) {
        tracks.current.video.stop();
        tracks.current.video.close();
      }
      if (client.current) client.current.leave();
    };
  }, []);

  useEffect(() => {
    if (agoraToken && !loading) startCall();
  }, [agoraToken, loading]);

  const toggleMute = async () => {
    if (tracks.current.audio) {
      const nextMuted = !isMuted;
      await tracks.current.audio.setEnabled(!nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const toggleVideo = async () => {
    if (tracks.current.video) {
        const nextVideoOff = !isVideoOff;
        await tracks.current.video.setEnabled(!nextVideoOff);
        setIsVideoOff(nextVideoOff);
    }
  };

  const endCall = () => {
    console.log('[WEB] Ending call...');
    if (socket && receiverId) {
       socket.emit('call-ended', { receiverId, chatId });
    }
    navigation.goBack();
  };

  const fetchAgoraToken = async () => {
    try {
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/webrtc/token`, { channelName: chatId, uid }, { headers: { Authorization: `Bearer ${user.token}` }});
      setAgoraToken(data.token);
      setAppId(data.appId);
      setLoading(false);
    } catch (e) { navigation.goBack(); }
  };

  const startCall = async () => {
    try {
      client.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      
      let tracksToPublish = [];
      if (type === 'video') {
        [tracks.current.audio, tracks.current.video] = await AgoraRTC.createMicrophoneAndCameraTracks();
        tracksToPublish = [tracks.current.audio, tracks.current.video];
        tracks.current.video.play('local-video-web');
      } else {
        tracks.current.audio = await AgoraRTC.createMicrophoneAudioTrack();
        tracksToPublish = [tracks.current.audio];
      }
      
      console.log(`[AGORA-WEB] Joining as ${uid} in channel ${chatId}`);
      await client.current.join(appId, chatId, agoraToken, uid);
      await client.current.publish(tracksToPublish);
      
      setCallStatus('Ongoing');
      setInterval(() => setTimerSeconds(p => p + 1), 1000);

      client.current.on('user-published', async (user, mediaType) => {
        console.log(`[AGORA-WEB] Remote user published: ${user.uid} (${mediaType})`);
        await client.current.subscribe(user, mediaType);
        
        if (mediaType === 'video' && type === 'video') {
          user.videoTrack.play('remote-video-web');
        }
        if (mediaType === 'audio') {
          user.audioTrack.play();
          console.log(`[AGORA-WEB] Playing remote audio from ${user.uid}`);
        }
      });

      // Handle Autoplay restrictions on Web
      AgoraRTC.onAutoplayFailed = () => {
        console.warn('[AGORA-WEB] Autoplay failed - user must click');
        Alert.alert('Playback Blocked', 'Click OK to enable audio for this call.');
      };
    } catch (e) { 
      console.error('[AGORA WEB SDK ERROR]', e); 
      setCallStatus('Failed');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Connecting Secure Call...</Text>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
       <View id="remote-video-web" style={StyleSheet.absoluteFill} />
       <View id="local-video-web" style={styles.localPreview} />
       
       <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.statusText}>{callStatus}</Text>
            <Text style={styles.timerText}>{Math.floor(timerSeconds/60)}:{timerSeconds%60 < 10 ? '0'+timerSeconds%60 : timerSeconds%60}</Text>
          </View>

          <View style={styles.footer}>
             <TouchableOpacity style={styles.btn} onPress={toggleMute}>
                {isMuted ? <MicOff color="#FFF" /> : <Mic color="#FFF" />}
             </TouchableOpacity>

             <TouchableOpacity style={[styles.btn, styles.endBtn]} onPress={endCall}>
                <PhoneOff color="#FFF" size={32} />
             </TouchableOpacity>

             <TouchableOpacity style={styles.btn} onPress={toggleVideo}>
                {isVideoOff ? <VideoOff color="#FFF" /> : <VideoIcon color="#FFF" />}
             </TouchableOpacity>
          </View>
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  localPreview: { width: 150, height: 220, position: 'absolute', top: 40, right: 30, borderRadius: 16, overflow: 'hidden', border: '3px solid #7B61FF', zIndex: 10 },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', fontSize: 20, marginBottom: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingVertical: 60, alignItems: 'center', zIndex: 20 },
  header: { alignItems: 'center', marginTop: 20 },
  statusText: { color: THEME.colors.secondary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5 },
  timerText: { color: '#FFF', fontSize: 36, fontWeight: '300', marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40, marginBottom: 40 },
  btn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  endBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: THEME.colors.danger, elevation: 10, shadowColor: '#FF4B4B', shadowOpacity: 0.5, shadowRadius: 15 },
});

export default CallScreenWeb;
