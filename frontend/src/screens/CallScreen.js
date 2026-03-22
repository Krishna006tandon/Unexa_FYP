import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { PhoneOff, MicOff, VideoOff, Camera, Mic, Video as VideoIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { AuthContext } from '../context/AuthContext';
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
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.1)',
  }
};

const CallScreen = ({ route, navigation }) => {
  const { chatId, type, name } = route.params || {};
  const { user, token: userToken } = useContext(AuthContext);

  const [permission, requestPermission] = useCameraPermissions();
  const [agoraToken, setAgoraToken] = useState(null);
  const [appId, setAppId] = useState(null);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [loading, setLoading] = useState(true);
  
  const webViewRef = useRef(null);
  const callTimer = useRef(null);

  const channelName = useMemo(() => `unexa_${chatId || 'test'}`, [chatId]);
  const uid = useMemo(() => Math.floor(Math.random() * 100000), []);

  useEffect(() => {
    fetchAgoraToken();
    if (!permission?.granted) {
      requestPermission();
    }
    return () => {
      if (callTimer.current) clearInterval(callTimer.current);
    };
  }, [permission]);

  const fetchAgoraToken = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${ENVIRONMENT.API_URL}/api/webrtc/token`, {
        channelName,
        uid
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (response.data.success) {
        setAgoraToken(response.data.token);
        setAppId(response.data.appId);
        setLoading(false);
      }
    } catch (e) {
      console.error('Failed to get Agora Token', e);
      Alert.alert('Call Error', 'Could not connect to secure calling server.');
      setLoading(false);
      navigation.goBack();
    }
  };

  const startCallTimer = () => {
    if (callTimer.current) return;
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const endCall = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.leaveCall(); true;`);
    }
    setCallStatus('Call Ended');
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.toggleAudio(); true;`);
    }
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.toggleVideo(); true;`);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'joined') {
        setCallStatus('Ongoing');
        startCallTimer();
      }
      if (data.type === 'left') {
        endCall();
      }
    } catch (e) {
      console.log('WebView Message Error', e);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={{ color: '#FFF', marginTop: 20 }}>Starting Secure Call...</Text>
      </View>
    );
  }

  // AGORA WEB SDK BRIDGE WITH TOKEN
  const agoraHtmlString = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.18.2.js"></script>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; width: 100%; background: #0F0F1A; }
          #remote-video-container { width: 100%; height: 100%; background: #000; position: absolute; z-index: 1; }
          #local-video-container { 
            width: 120px; height: 180px; position: absolute; top: 20px; right: 20px; 
            z-index: 10; border-radius: 12px; overflow: hidden; border: 2px solid #7B61FF; background: #222;
          }
        </style>
    </head>
    <body>
        <div id="remote-video-container"></div>
        <div id="local-video-container"></div>

        <script>
            let client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            let localTracks = { videoTrack: null, audioTrack: null };

            async function join() {
                try {
                    if ("${type}" === "video") {
                        [localTracks.audioTrack, localTracks.videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                        localTracks.videoTrack.play("local-video-container");
                    } else {
                        localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                    }

                    // Use Safe Token from Backend
                    await client.join("${appId}", "${channelName}", "${agoraToken}", ${uid});
                    await client.publish(Object.values(localTracks).filter(track => track !== null));

                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'joined' }));

                    client.on("user-published", async (user, mediaType) => {
                        await client.subscribe(user, mediaType);
                        if (mediaType === "video") {
                            user.videoTrack.play("remote-video-container");
                        }
                        if (mediaType === "audio") {
                            user.audioTrack.play();
                        }
                    });

                    client.on("user-left", () => {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'left' }));
                    });

                } catch (e) {
                    console.error("Agora Failed", e);
                }
            }

            window.leaveCall = async () => {
                for (let track in localTracks) { if (localTracks[track]) { localTracks[track].stop(); localTracks[track].close(); } }
                await client.leave();
            };

            window.toggleAudio = () => localTracks.audioTrack && localTracks.audioTrack.setEnabled(!localTracks.audioTrack.enabled);
            window.toggleVideo = () => localTracks.videoTrack && localTracks.videoTrack.setEnabled(!localTracks.videoTrack.enabled);

            join();
        </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: agoraHtmlString }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        onMessage={handleWebViewMessage}
      />

      <View style={styles.topInfoBar} pointerEvents="box-none">
        <View style={styles.badge}>
          <View style={[styles.statusDot, callStatus === 'Ongoing' && { backgroundColor: THEME.colors.success }]} />
          <Text style={styles.callStatusText}>{callStatus === 'Ongoing' ? formatTime(callDuration) : callStatus}</Text>
        </View>
        <Text style={styles.encryptionText}>Agora Secure • ${name || 'User'}</Text>
      </View>

      <View style={styles.controlsContainer} pointerEvents="box-none">
        <LinearGradient colors={['transparent', 'rgba(15, 15, 26, 0.9)', '#0F0F1A']} style={StyleSheet.absoluteFill} />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={toggleMute}>
            {isMuted ? <MicOff color="#000" size={26} /> : <Mic color="#FFF" size={26} />}
          </TouchableOpacity>
          {type === 'video' && (
            <TouchableOpacity style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]} onPress={toggleVideo}>
              {isVideoOff ? <VideoOff color="#000" size={26} /> : <VideoIcon color="#FFF" size={26} />}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
            <PhoneOff color="#FFF" size={32} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  webview: { flex: 1, backgroundColor: 'transparent' },
  topInfoBar: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.secondary, marginRight: 8 },
  callStatusText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  encryptionText: { color: THEME.colors.secondary, fontSize: 11, marginTop: 8 },
  controlsContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40, zIndex: 10 },
  buttonRow: { flexDirection: 'row', gap: 24, zIndex: 2 },
  controlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  controlBtnActive: { backgroundColor: '#FFF' },
  endCallBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: THEME.colors.danger, justifyContent: 'center', alignItems: 'center' },
});

export default CallScreen;
