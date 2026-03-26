import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { PhoneOff, MicOff, VideoOff, Camera, Mic, Video as VideoIcon, Volume2, VolumeX } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';
import { CallContext } from '../context/CallContext';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';

// DIRECT IMPORT ONLY ON WEB
import AgoraRTC from 'agora-rtc-sdk-ng';

// Set Agora log level for debugging
AgoraRTC.setLogLevel(0);

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
  const { chatId, type, name, receivers, receiverId: passedReceiverId, isIncoming } = route.params || {};
  const receiverId = passedReceiverId || (receivers && receivers.length > 0 ? receivers[0] : null);
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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  const client = useRef(null);
  const tracks = useRef({ video: null, audio: null });
  const callJoined = useRef(false); // Track if we've officially joined
  const uid = useMemo(() => Math.floor(Math.random() * 100000) + 1, []);

  const toggleSpeaker = () => setIsSpeakerOn(!isSpeakerOn);

  useEffect(() => {
    fetchAgoraToken();
    if (socket) {
      if (!isIncoming && (receivers || receiverId)) {
        const targetIds = receivers || [receiverId];
        targetIds.forEach(rid => {
          if (!rid) return;
          const payload = {
            callerId: user._id || user.id,
            receiverId: rid,
            callerName: user.fullName || user.username || 'Friend',
            callerAvatar: user.profilePhoto || user.avatar,
            chatId,
            type
          };
          console.log(`[FRONTEND-WEB] 📡 Emitting call-invite to ${rid}`);
          socket.emit('call-invite', payload);
        });
      }

      // Sync End Call
      socket.on('call-ended', (data) => {
         if (data.chatId === chatId) {
            const isGroupCall = (receivers && receivers.length > 1);
            if (!isGroupCall) {
              console.log('🛑 [SOCKET-WEB] 1-on-1 Call was ended via socket');
              navigation.goBack();
            } else {
              console.log('ℹ️ [SOCKET-WEB] A member left the group call.');
            }
         }
      });
    }

    return () => {
      if (socket) {
        // ONLY Caller can cancel a ringing call
        if (!isIncoming && !callJoined.current && (receivers || receiverId)) {
          const targetIds = receivers || [receiverId];
          targetIds.forEach(rid => {
            if (rid) {
              console.log('🚫 [CLEANUP-WEB] Sending cancel-call for:', rid);
              socket.emit('cancel-call', { receiverId: rid, chatId });
            }
          });
        }
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
    if (socket && (receivers || receiverId)) {
       const targetIds = receivers || [receiverId];
       const isGroupCall = targetIds.length > 1;
       targetIds.forEach(rid => {
         if (rid) socket.emit('call-ended', { receiverId: rid, chatId, isGroupCall });
       });
    }
    navigation.goBack();
  };

  const fetchAgoraToken = async () => {
    try {
      console.log(`📡 [FRONTEND-WEB] Requesting token from: ${ENVIRONMENT.API_URL}/api/webrtc/token`);
      console.log(`   - Channel: ${chatId}, UID: ${uid}`);
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/webrtc/token`, 
        { channelName: chatId, uid }, 
        { headers: { Authorization: `Bearer ${user.token}` }}
      );
      console.log(`✅ [FRONTEND-WEB] Token received (length: ${data.token?.length})`);
      setAgoraToken(data.token);
      setAppId(data.appId);
      setLoading(false);
    } catch (e) { 
      console.error('❌ [FRONTEND-WEB] Token Fetch Error:', e.response?.data || e.message);
      navigation.goBack(); 
    }
  };

  const startCall = async () => {
    try {
      console.log('🚀 [AGORA-WEB] Initializing AgoraRTC Client...');
      client.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      
      let tracksToPublish = [];
      try {
        if (type === 'video') {
          console.log('📷 [AGORA-WEB] Creating Mic and Cam Tracks...');
          [tracks.current.audio, tracks.current.video] = await AgoraRTC.createMicrophoneAndCameraTracks();
          tracksToPublish = [tracks.current.audio, tracks.current.video];
          tracks.current.video.play('local-video-web');
          console.log('✅ [AGORA-WEB] Local tracks created and playing');
        } else {
          console.log('🎙️ [AGORA-WEB] Creating Mic Only track...');
          tracks.current.audio = await AgoraRTC.createMicrophoneAudioTrack();
          tracksToPublish = [tracks.current.audio];
          console.log('✅ [AGORA-WEB] Local audio track created');
        }
      } catch (trackError) {
        console.warn("[AGORA-WEB] Camera/Mic access failed, trying audio-only fallback...", trackError);
        // Fallback to audio only if video fails (usually due to hardware occupancy)
        if (type === 'video') {
            try {
                tracks.current.audio = await AgoraRTC.createMicrophoneAudioTrack();
                tracksToPublish = [tracks.current.audio];
                setIsVideoOff(true); 
                setCallStatus('Ongoing (Voice Only)');
                Alert.alert('Camera Hint', 'Your camera is occupied by another app. Switching to Voice Call.');
            } catch (audioError) {
                throw audioError; // If even audio fails, we have a real problem
            }
        } else {
            throw trackError;
        }
      }
      
      console.log(`[AGORA-WEB] Joining as ${uid} in channel ${chatId}`);
      await client.current.join(appId, chatId, agoraToken, uid);
      callJoined.current = true;
      await client.current.publish(tracksToPublish);
      
      setCallStatus('Ongoing');
      setInterval(() => setTimerSeconds(p => p + 1), 1000);

      client.current.on('user-published', async (user, mediaType) => {
        console.log(`📡 [AGORA-WEB] Remote user published: ${user.uid} (${mediaType})`);
        try {
          await client.current.subscribe(user, mediaType);
          console.log(`✅ [AGORA-WEB] Subscribed to ${user.uid} - ${mediaType}`);
          
          if (mediaType === 'video' && type === 'video') {
            const container = document.getElementById('remote-video-web');
            if (container) {
              let div = document.getElementById('player-' + user.uid);
              if (!div) {
                div = document.createElement('div');
                div.id = 'player-' + user.uid;
                div.className = 'remote-player';
                container.appendChild(div);
              }
              user.videoTrack.play(div.id);
            }
          }
          if (mediaType === 'audio') {
            console.log(`🎙️ [AGORA-WEB] Attempting to play audio from ${user.uid}`);
            try {
              await user.audioTrack.play();
              console.log(`🔊 [AGORA-WEB] Audio playing success for ${user.uid}`);
            } catch (playError) {
              console.warn(`⏳ [AGORA-WEB] Autoplay blocked for ${user.uid}. Clicking anywhere on screen will enable audio.`);
              const resumeAudio = () => {
                user.audioTrack.play().then(() => {
                  console.log(`🔊 [AGORA-WEB] Audio resumed for ${user.uid} after click`);
                  document.removeEventListener('click', resumeAudio);
                }).catch(e => console.error("Resume failed:", e));
              };
              document.addEventListener('click', resumeAudio);
            }
          }
        } catch (subError) {
           console.error(`❌ [AGORA-WEB] Subscription failed for ${user.uid}`, subError);
        }
      });

      client.current.on('user-left', (user) => {
         console.log(`🔌 [AGORA-WEB] User left: ${user.uid}`);
         const div = document.getElementById('player-' + user.uid);
         if (div) div.remove();
      });

      client.current.on('user-unpublished', (user, mediaType) => {
         if (mediaType === 'video') {
            const div = document.getElementById('player-' + user.uid);
            if (div) div.remove();
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
                <View style={styles.iconCircle}>
                  {isMuted ? <MicOff color="#FFF" /> : <Mic color="#FFF" />}
                </View>
                <Text style={styles.btnLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
             </TouchableOpacity>

             <TouchableOpacity style={styles.btn} onPress={toggleSpeaker}>
                <View style={styles.iconCircle}>
                  {isSpeakerOn ? <Mic color="#FFF" /> : <MicOff color="#FFF" />}
                </View>
                <Text style={styles.btnLabel}>{isSpeakerOn ? 'Speaker' : 'Ear'}</Text>
             </TouchableOpacity>

             <TouchableOpacity style={[styles.btn, styles.endBtn]} onPress={endCall}>
                <PhoneOff color="#FFF" size={28} />
             </TouchableOpacity>

              {type === 'video' && (
                <TouchableOpacity style={styles.btn} onPress={toggleVideo}>
                    <View style={styles.iconCircle}>
                      {isVideoOff ? <VideoOff color="#FFF" /> : <VideoIcon color="#FFF" />}
                    </View>
                    <Text style={styles.btnLabel}>{isVideoOff ? 'Cam On' : 'Cam Off'}</Text>
                </TouchableOpacity>
              )}
          </View>
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20, zIndex: 100, pointerEvents: 'none' },
  localPreview: { width: 120, height: 160, position: 'absolute', top: 30, right: 20, zIndex: 999, borderRadius: 12, overflow: 'hidden', border: '2px solid #7B61FF', backgroundColor: '#111' },
  header: { alignItems: 'center', marginTop: 30, pointerEvents: 'auto' },
  statusText: { color: THEME.colors.secondary, fontSize: 16, fontWeight: 'bold' },
  timerText: { color: '#FFF', fontSize: 32, fontWeight: '300', marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', padding: 20, width: '100%', maxWidth: 500, alignSelf: 'center', pointerEvents: 'auto' },
  btn: { alignItems: 'center', minWidth: 70 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  btnLabel: { color: '#FFF', fontSize: 11, opacity: 0.8 },
  endBtn: { backgroundColor: THEME.colors.danger, width: 68, height: 68, borderRadius: 34, justifyContent: 'center' },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginBottom: 20, fontSize: 18 }
});

// Add Web-Specific Global Styles for Grid
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.innerHTML = `
    #remote-video-web {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      padding: 10px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      background: #000;
      z-index: 1;
    }
    .remote-player {
      position: relative;
      background: #111;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .remote-player video {
      object-fit: cover !important;
      width: 100% !important;
      height: 100% !important;
    }
  `;
  document.head.appendChild(style);
}

export default CallScreenWeb;
