import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
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
  
  const client = useRef(null);
  const tracks = useRef({ video: null, audio: null });
  const uid = useMemo(() => Math.floor(Math.random() * 100000), []);

  useEffect(() => {
    fetchAgoraToken();
    if (socket && receiverId) {
      socket.emit('call-invite', {
        callerId: user._id || user.id,
        receiverId,
        callerName: user.fullName || user.username || 'Friend',
        chatId,
        type
      });
    }
    return () => {
      if (socket && receiverId) {
        socket.emit('cancel-call', { receiverId, chatId });
      }
      stopRinging();
      if (client.current) {
        Object.values(tracks.current).forEach(t => { if(t) { t.stop(); t.close(); } });
        client.current.leave();
      }
    };
  }, []);

  useEffect(() => {
    if (agoraToken && !loading) startCall();
  }, [agoraToken, loading]);

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
      [tracks.current.audio, tracks.current.video] = await AgoraRTC.createMicrophoneAndCameraTracks();
      
      await client.current.join(appId, chatId, agoraToken, uid);
      await client.current.publish(Object.values(tracks.current));
      
      tracks.current.video.play('local-video-web');
      setCallStatus('Ongoing');
      setInterval(() => setTimerSeconds(p => p + 1), 1000);

      client.current.on('user-published', async (user, mediaType) => {
        await client.current.subscribe(user, mediaType);
        if (mediaType === 'video') user.videoTrack.play('remote-video-web');
        if (mediaType === 'audio') user.audioTrack.play();
      });
    } catch (e) { console.error(e); }
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
       <View nativeID="remote-video-web" style={StyleSheet.absoluteFill} />
       <View nativeID="local-video-web" style={styles.localPreview} />
       
       <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.statusText}>{callStatus}</Text>
            <Text style={styles.timerText}>{Math.floor(timerSeconds/60)}:{timerSeconds%60 < 10 ? '0'+timerSeconds%60 : timerSeconds%60}</Text>
          </View>

          <View style={styles.footer}>
             <TouchableOpacity style={[styles.btn, styles.endBtn]} onPress={() => navigation.goBack()}>
                <PhoneOff color="#FFF" size={32} />
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
  statusText: { color: THEME.colors.secondary, fontWeight: 'bold' },
  timerText: { color: '#FFF', fontSize: 32, fontWeight: '300' },
  btn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  endBtn: { backgroundColor: THEME.colors.danger },
});

export default CallScreenWeb;
