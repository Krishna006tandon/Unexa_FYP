import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { PhoneOff, MicOff, VideoOff, Camera, Mic, Video as VideoIcon } from 'lucide-react-native';
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

const CallScreen = ({ route, navigation }) => {
  const { chatId, type, name, receiverId } = route.params || {};
  const { user } = useContext(AuthContext);
  const { socket } = useContext(ProfileContext);
  const { stopRinging } = useContext(CallContext);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [agoraToken, setAgoraToken] = useState(null);
  const [appId, setAppId] = useState(null);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');

  const webViewRef = useRef(null);
  const callTimer = useRef(null);
  const callConnected = useRef(false); // Track if Agora channel was joined
  const uid = useMemo(() => Math.floor(Math.random() * 100000), []);

  useEffect(() => {
    const init = async () => {
      if (!permission?.granted) await requestPermission();
      if (!micPermission?.granted) await requestMicPermission();
      await fetchAgoraToken();
    };
    init();

    if (socket) {
      // Send call invite (only if we are the caller, not receiver)
      if (receiverId) {
        const payload = {
          callerId: user._id || user.id,
          receiverId,
          callerName: user.fullName || user.username || 'Friend',
          chatId,
          type
        };
        console.log(`[FRONTEND-MOBILE] 📡 Emitting call-invite with payload:`, payload);
        socket.emit('call-invite', payload);
      }

      // Listen for call ended from other party
      socket.on('call-ended', (data) => {
         if (data.chatId === chatId) {
            console.log('🛑 [SOCKET] Call ended by other party');
            endCall();
         }
      });
    }

    return () => {
      if (callTimer.current) clearInterval(callTimer.current);
      if (socket) {
        if (!callConnected.current && receiverId) {
          // Still ringing — cancel the invite
          socket.emit('cancel-call', { receiverId, chatId });
        }
        socket.off('call-ended');
      }
      stopRinging();
    };
  }, []);

  const fetchAgoraToken = async () => {
    try {
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/webrtc/token`, 
        { channelName: chatId, uid }, 
        { headers: { Authorization: `Bearer ${user.token}` }}
      );
      setAgoraToken(data.token);
      setAppId(data.appId);
      setLoading(false);
    } catch (e) {
      console.log('Token Fetch Failed', e);
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

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'toggle-audio', isMuted: nextMuted }));
  };

  const toggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'toggle-video', isVideoOff: nextVideoOff }));
  };

  const agoraHtmlString = `
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

            let client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            let localTracks = { videoTrack: null, audioTrack: null };

            // Listen for Native Control Messages
            window.addEventListener('message', async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'toggle-audio') {
                        if (localTracks.audioTrack) {
                            await localTracks.audioTrack.setEnabled(!data.isMuted);
                            console.log("[AGORA] Audio enabled:", !data.isMuted);
                        }
                    }
                    if (data.type === 'toggle-video') {
                        if (localTracks.videoTrack) {
                            await localTracks.videoTrack.setEnabled(!data.isVideoOff);
                            console.log("[AGORA] Video enabled:", !data.isVideoOff);
                        }
                    }
                } catch (e) { console.error("Control Error:", e); }
            });

            async function join() {
                try {
                    console.log("[AGORA] Initializing tracks for type: ${type}");
                    await new Promise(r => setTimeout(r, 1000));
                    
                    let tracksToPublish = [];
                    if ("${type}" === "video") {
                        [localTracks.audioTrack, localTracks.videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                        await localTracks.videoTrack.play("local-video-container");
                        tracksToPublish = [localTracks.audioTrack, localTracks.videoTrack];
                    } else {
                        localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                        tracksToPublish = [localTracks.audioTrack];
                    }
                    
                    console.log("[AGORA] Joining channel: ${chatId}");
                    await client.join("${appId}", "${chatId}", "${agoraToken}", ${uid});
                    
                    console.log("[AGORA] Publishing tracks...");
                    await client.publish(tracksToPublish);
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'joined' }));

                    client.on("user-published", async (user, mediaType) => {
                        console.log("[AGORA] User published:", user.uid, mediaType);
                        await client.subscribe(user, mediaType);
                        console.log("[AGORA] Subscribed to:", user.uid, mediaType);
                        
                        if (mediaType === "video" && "${type}" === "video") {
                            user.videoTrack.play("remote-video-container");
                        }
                        if (mediaType === "audio") {
                            user.audioTrack.play();
                            console.log("[AGORA] Playing remote audio track");
                        }
                    });

                    client.on("user-unpublished", (user) => {
                        console.log("[AGORA] User unpublished:", user.uid);
                    });

                } catch (e) { 
                    console.error("[AGORA ERROR]", e);
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: e.message || String(e) })); 
                }
            }

            // Handle Autoplay restrictions
            AgoraRTC.onAutoplayFailed = () => {
                console.warn("[AGORA] Autoplay blocked - user interaction required");
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'autoplay-failed' }));
            };
        </script>
    </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingOverlay}>
          <View style={styles.avatarContainer}>
             <LinearGradient colors={[THEME.colors.primary, THEME.colors.secondary]} style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{name?.[0] || 'U'}</Text>
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
        source={{ html: agoraHtmlString, baseUrl: ENVIRONMENT.API_URL }}
        style={styles.webview}
        mediaCapturePermissionGrantingEnabled={true}
        allowsInlineMediaPlayback={true}
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
            {isMuted ? <MicOff color="#FFF" /> : <Mic color="#FFF" />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={endCall}>
            <PhoneOff color="#FFF" size={32} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={toggleVideo}>
            {isVideoOff ? <VideoOff color="#FFF" /> : <VideoIcon color="#FFF" />}
          </TouchableOpacity>
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
  avatarCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: THEME.colors.primary, shadowOpacity: 0.5, shadowRadius: 15 },
  avatarInitial: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  callingPulse: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: THEME.colors.primary, opacity: 0.2 },
  hudOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 40, zIndex: 100 },
  headerHUD: { alignItems: 'center', marginTop: 20 },
  statusText: { color: THEME.colors.secondary, fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
  timerText: { color: '#FFF', fontSize: 32, fontWeight: '300', marginTop: 10 },
  bottomHUD: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  controlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  endCallBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: THEME.colors.danger, justifyContent: 'center', alignItems: 'center' },
});

export default CallScreen;
