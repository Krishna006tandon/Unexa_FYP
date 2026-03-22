import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions, ActivityIndicator, Image } from 'react-native';
import { PhoneOff, MicOff, VideoOff, Camera, Mic, Video as VideoIcon, Volume2, VolumeX } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { AuthContext } from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';
import { CallContext } from '../context/CallContext';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';

const { width, height } = Dimensions.get('window');

const THEME = {
  colors: {
    background: '#0F0F1A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    danger: '#FF4B4B',
    success: '#00C853',
  }
};

import { Audio } from 'expo-av';

const CallScreen = ({ route, navigation }) => {
  const { chatId, type, name, receiverId, isIncoming, avatar } = route.params || {};
  const { user } = useContext(AuthContext);
  const { socket } = useContext(ProfileContext);
  const { stopRinging } = useContext(CallContext);

  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [agoraToken, setAgoraToken] = useState(null);
  const [appId, setAppId] = useState(null);
  const [callStatus, setCallStatus] = useState('Calling...');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [isSpeakerOn, setIsSpeakerOn] = useState(type === 'video'); // Default to speaker for video, earpiece for audio

  const webViewRef = useRef(null);
  const uid = useMemo(() => Math.floor(Math.random() * 100000) + 1, []);
  const callTimer = useRef(null);
  const callConnected = useRef(false); // Track if Agora channel was joined

  useEffect(() => {
    const init = async () => {
      if (!permission?.granted) await requestPermission();
      if (!micPermission?.granted) await requestMicPermission();
      
      // Initialize audio mode at the start
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldRouteThroughEarpieceIOS: type === 'audio', // Initial earpiece for audio calls
          interruptionModeIOS: 1, // DUCK_OTHERS
          interruptionModeAndroid: 1,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: type === 'audio',
        });
        console.log('🔈 [MOBILE] Initial audio mode configured');
      } catch (e) {
        console.error('Failed to init audio mode', e);
      }
      
      await fetchAgoraToken();
    };
    init();

    if (socket) {
      // Send call invite ONLY if we are the caller
      if (!isIncoming && receiverId) {
        const payload = {
          callerId: user._id || user.id,
          receiverId,
          callerName: user.fullName || user.username || 'Friend',
          callerAvatar: user.profilePhoto, // NEW
          chatId,
          type
        };
        console.log(`[FRONTEND-MOBILE] 📡 Emitting call-invite with payload:`, payload);
        socket.emit('call-invite', payload);
      }

      // Listen for call ended from other party
      socket.on('call-ended', (data) => {
        if (data.chatId === chatId) {
          console.log('🛑 [SOCKET-MOBILE] Call was ended via socket for chatId:', chatId);
          endCall();
        }
      });
    }

    return () => {
      console.log('🚮 [CLEANUP] Unmounting CallScreen...');
      if (callTimer.current) clearInterval(callTimer.current);
      if (socket) {
        // ONLY Caller can cancel a ringing call
        if (!callConnected.current && !isIncoming && receiverId) {
          console.log('🚫 [CLEANUP] Cancelling call signal as it was never joined');
          socket.emit('cancel-call', { receiverId, chatId });
        }
        socket.off('call-ended');
      }
      stopRinging();
    };
  }, []);

  const fetchAgoraToken = async () => {
    try {
      console.log(`📡 [MOBILE] Fetching token for channel: ${chatId}`);
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/webrtc/token`,
        { channelName: chatId, uid },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      console.log('✅ [MOBILE] Token received:', data.token?.substring(0, 20) + '...');
      setAgoraToken(data.token);
      setAppId(data.appId);
      setLoading(false);
    } catch (e) {
      console.error('❌ [MOBILE] Token Fetch Failed:', e.response?.data || e.message);
      Alert.alert('Call Error', 'Failed to initialize secure connection');
      navigation.goBack();
    }
  };

  const startTimer = () => {
    if (callTimer.current) return; // Prevent double timer
    callTimer.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  const endCall = () => {
    console.log('🏁 Ending call...');
    if (socket && receiverId) {
      socket.emit('call-ended', { receiverId, chatId });
    }
    if (callTimer.current) clearInterval(callTimer.current);
    navigation.goBack();
  };

  const toggleSpeaker = async () => {
    try {
      const nextSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(nextSpeakerState);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldRouteThroughEarpieceIOS: !nextSpeakerState,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !nextSpeakerState,
      });
      console.log('🔊 [NATIVE] Speaker switched to:', nextSpeakerState ? 'Loudspeaker' : 'Earpiece');
    } catch (e) {
      console.error('Failed to set audio mode', e);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    console.log('🎤 [NATIVE] Toggling mute to:', nextMuted);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'toggle-audio', isMuted: nextMuted }));
  };

  const toggleVideo = () => {
    if (type === 'audio') return;
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    console.log('📹 [NATIVE] Toggling video off to:', nextVideoOff);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'toggle-video', isVideoOff: nextVideoOff }));
  };

  const agoraHtmlString = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.18.2.js"></script>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; width: 100%; background: #000; overflow: hidden; }
          #remote-video-container { width: 100%; height: 100%; position: absolute; z-index: 1; }
          #local-video-container { 
            width: 130px; height: 190px; position: absolute; top: 30px; right: 20px; 
            z-index: 999; border-radius: 16px; overflow: hidden; border: 3px solid #7B61FF; 
          }
          video { object-fit: cover !important; width: 100%; height: 100%; }
        </style>
    </head>
    <body onload="join()">
        <div id="remote-video-container"></div>
        <div id="local-video-container"></div>
        <script>
            // Console Bridge to Metro
            (function() {
              const originalLog = console.log;
              const originalWarn = console.warn;
              const originalError = console.error;
              
              console.log = (...args) => {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', level: 'log', msg: args.join(' ') }));
                originalLog.apply(console, args);
              };
              console.warn = (...args) => {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', level: 'warn', msg: args.join(' ') }));
                originalWarn.apply(console, args);
              };
              console.error = (...args) => {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', level: 'error', msg: args.join(' ') }));
                originalError.apply(console, args);
              };
            })();

            const APP_ID = "${appId}";
            const TOKEN = "${agoraToken}";
            const CHANNEL = "${chatId}";
            const UID = ${uid};
            const TYPE = "${type}";

            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            let localTracks = { videoTrack: null, audioTrack: null };
            let remoteUsers = {}; // TRACK USERS FOR AUDIO RESUME

            // GLOBAL CLICK LISTENER TO RESUME BLOCKED AUDIO (IMPORTANT FOR MOBILE)
            document.body.addEventListener('click', () => {
                console.log("[AGORA-WEBVIEW] Screen tapped - Attempting audio resume...");
                Object.values(remoteUsers).forEach(user => {
                    if (user.audioTrack && !user.audioTrack.isPlaying) {
                        user.audioTrack.play();
                    }
                });
            });

            // Listen for Native Control Messages
            const handleNativeMessage = async (event) => {
                try {
                    const data = JSON.parse(typeof event.data === 'string' ? event.data : JSON.stringify(event.data));
                    if (data.type === 'toggle-audio' && localTracks.audioTrack) {
                        await localTracks.audioTrack.setEnabled(!data.isMuted);
                    }
                    if (data.type === 'toggle-video' && localTracks.videoTrack) {
                        await localTracks.videoTrack.setEnabled(!data.isVideoOff);
                    }
                } catch (e) { console.error("[MSG ERROR]", e); }
            };

            window.addEventListener('message', handleNativeMessage);
            document.addEventListener('message', handleNativeMessage);

            async function join() {
                try {
                    console.log("[AGORA] Initializing join...");
                    
                    let tracksToPublish = [];
                    if ("${type}" === "video") {
                        try {
                            [localTracks.audioTrack, localTracks.videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                            await localTracks.videoTrack.play("local-video-container");
                            tracksToPublish = [localTracks.audioTrack, localTracks.videoTrack];
                        } catch (e) {
                            localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                            tracksToPublish = [localTracks.audioTrack];
                        }
                    } else {
                        localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                        tracksToPublish = [localTracks.audioTrack];
                    }
                    
                    await client.join("${appId}", "${chatId}", "${agoraToken}", ${uid});
                    await client.publish(tracksToPublish);
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'joined' }));

                    client.on("user-published", async (user, mediaType) => {
                        console.log("📡 [STREAM] New publication: " + user.uid + " - " + mediaType);
                        try {
                            await client.subscribe(user, mediaType);
                            remoteUsers[user.uid] = user; 
                            
                            if (mediaType === "video") user.videoTrack.play("remote-video-container");
                            if (mediaType === "audio") {
                                user.audioTrack.setVolume(100);
                                try {
                                    await user.audioTrack.play();
                                } catch (playError) {
                                    console.warn("⏳ [PLAY BLOCKED] " + user.uid);
                                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'autoplay-failed' }));
                                }
                            }
                        } catch (e) { console.error("[SUB ERROR]", e); }
                    });

                    client.on("user-left", (user) => {
                        console.log("[AGORA] User left:", user.uid);
                        delete remoteUsers[user.uid];
                    });

                } catch (e) { 
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: e.message || String(e) })); 
                }
            }
        </script>
    </body>
    </html>
  `
  , [appId, agoraToken, chatId, uid, type]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingOverlay}>
          <View style={styles.avatarContainer}>
            <LinearGradient colors={[THEME.colors.primary, THEME.colors.secondary]} style={styles.avatarCircle}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={styles.avatarInitial}>{name?.[0] || 'U'}</Text>
              )}
            </LinearGradient>
            <View style={styles.callingPulse} />
          </View>
          <Text style={styles.callingNameText}>Calling {name}...</Text>
          <ActivityIndicator size="small" color={THEME.colors.secondary} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Establishing Secure Channel...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: agoraHtmlString, baseUrl: ENVIRONMENT.API_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantingEnabled={true}
        allowsInlineMediaPlayback={true}
        onPermissionRequest={(event) => {
          console.log('[WebView] Permission requested:', event.nativeEvent.resources);
          event.grant(event.nativeEvent.resources);
        }}
        style={styles.webview}
        onMessage={(e) => {
          const data = JSON.parse(e.nativeEvent.data);

          if (data.type === 'debug') {
            const prefix = `[WebView ${data.level?.toUpperCase() || 'LOG'}]`;
            console.log(`${prefix} ${data.msg}`);
            return; // Don't process debug logs as regular actions
          }

          console.log(`[WebView Response] Type: ${data.type}`, data);

          if (data.type === 'joined') {
            setCallStatus('Ongoing');
            startTimer();
            callConnected.current = true; // Mark call as live
          }
          if (data.type === 'autoplay-failed') {
            console.warn('[AUTOPLAY BLOCKED] User must interact with WebView');
            setCallStatus('Tap to Unmute');
            Alert.alert('Audio Blocked', 'Click OK to enable audio.');
          }
          if (data.type === 'error') {
            console.error('[AGORA WEBVIEW ERROR]', data.msg);
            setCallStatus('Failed');
            Alert.alert('Call Error', data.msg);
          }
        }}
      />

      <View style={styles.hudOverlay} pointerEvents="box-none">
        <View style={styles.headerHUD}>
          <Text style={styles.statusText}>{callStatus}</Text>
          <Text style={styles.timerText}>{formatTime(timerSeconds)}</Text>
        </View>

        <View style={styles.bottomHUD}>
          <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
            <View style={styles.iconCircle}>
              {isMuted ? <MicOff color="#FFF" /> : <Mic color="#FFF" />}
            </View>
            <Text style={styles.btnLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={toggleSpeaker}>
            <View style={styles.iconCircle}>
              {isSpeakerOn ? <Volume2 color="#FFF" /> : <VolumeX color="#FFF" />}
            </View>
            <Text style={styles.btnLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
            <PhoneOff color="#FFF" size={28} />
          </TouchableOpacity>

          {type === 'video' && (
            <TouchableOpacity style={styles.controlBtn} onPress={toggleVideo}>
               <View style={styles.iconCircle}>
                {isVideoOff ? <VideoOff color="#FFF" /> : <VideoIcon color="#FFF" />}
              </View>
              <Text style={styles.btnLabel}>{isVideoOff ? 'Video On' : 'Video Off'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: THEME.colors.secondary, marginTop: 20, fontSize: 16, fontWeight: '600' },
  callingNameText: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 30 },
  avatarContainer: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  avatarCircle: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 10, 
    shadowColor: THEME.colors.primary, 
    shadowOpacity: 0.5, 
    shadowRadius: 15,
    overflow: 'hidden'
  },
  avatarInitial: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  callingPulse: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: THEME.colors.primary, opacity: 0.2 },
  hudOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 40, zIndex: 100 },
  headerHUD: { alignItems: 'center', marginTop: 20 },
  statusText: { color: THEME.colors.secondary, fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
  timerText: { color: '#FFF', fontSize: 32, fontWeight: '300', marginTop: 10 },
  bottomHUD: { 
    flexDirection: 'row', 
    justifyContent: 'space-evenly', 
    alignItems: 'center', 
    width: '100%',
    marginBottom: Platform.OS === 'ios' ? 20 : 10
  },
  controlBtn: { 
    alignItems: 'center', 
    justifyContent: 'center',
    minWidth: 70
  },
  iconCircle: {
    width: 58, 
    height: 58, 
    borderRadius: 29, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  endCallBtn: { 
    width: 72, 
    height: 72, 
    borderRadius: 36, 
    backgroundColor: THEME.colors.danger, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  btnLabel: { 
    color: '#FFF', 
    fontSize: 11, 
    fontWeight: '500', 
    textAlign: 'center'
  },
});

export default CallScreen;
