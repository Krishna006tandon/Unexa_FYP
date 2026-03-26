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
  const { chatId, type, name, receivers, receiverId: passedReceiverId, isIncoming, avatar } = route.params || {};
  const receiverId = passedReceiverId || (receivers && receivers.length > 0 ? receivers[0] : null);
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
  const ringingSound = useRef(null); // Caller-side ringing sound

  useEffect(() => {
    const init = async () => {
      // Run permissions and token fetch IN PARALLEL for faster connection
      await Promise.all([
        !permission?.granted ? requestPermission() : Promise.resolve(),
        !micPermission?.granted ? requestMicPermission() : Promise.resolve(),
      ]);
      
      // Initialize audio mode at the start
      try {
        console.log(`📡 [MOBILE] Initializing audio mode for ${type} call...`);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldRouteThroughEarpieceIOS: type === 'audio',
          interruptionModeIOS: 1, // mixWithOthers
          interruptionModeAndroid: 1, // duckOthers
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: type === 'audio',
        });
        console.log('✅ [MOBILE] Audio mode successfully configured');
      } catch (e) {
        console.error('❌ [MOBILE] Failed to init audio mode:', e);
      }
      
      await fetchAgoraToken();
    };
    init();

    if (socket) {
      // Send call invite to ALL receivers if it's a group call initiation
      if (!isIncoming && (receivers || receiverId)) {
        const targetIds = receivers || [receiverId];
        targetIds.forEach(rid => {
          if (!rid) return;
          const payload = {
            callerId: user._id || user.id,
            receiverId: rid,
            callerName: user.fullName || user.username || 'Friend',
            callerAvatar: user.profilePhoto,
            chatId,
            type
          };
          console.log(`[FRONTEND-MOBILE] 📡 Emitting call-invite to ${rid} with payload:`, payload);
          socket.emit('call-invite', payload);
        });
      }

      // Listen for call ended from other party
      socket.on('call-ended', (data) => {
        if (data.chatId === chatId) {
          // In group calls, we don't end the call just because ONE person left
          // The Agora 'user-left' event handles individual exits from the stream
          const isGroupCall = (receivers && receivers.length > 1);
          if (!isGroupCall) {
            console.log('🛑 [SOCKET-MOBILE] 1-on-1 Call was ended via socket');
            endCall();
          } else {
            console.log('ℹ️ [SOCKET-MOBILE] A member left the group call, staying in conversation.');
          }
        }
      });

      socket.on('call-cancelled', (data) => {
        if (data.chatId === chatId) {
          console.log('🚫 [SOCKET-MOBILE] Call was cancelled/declined');
          endCall();
        }
      });
    }

    return () => {
      console.log('🚮 [CLEANUP] Unmounting CallScreen...');
      if (callTimer.current) clearInterval(callTimer.current);
      if (socket) {
        // ONLY Caller can cancel a ringing call
        if (!callConnected.current && !isIncoming && (receivers || receiverId)) {
          const targetIds = receivers || [receiverId];
          targetIds.forEach(rid => {
            if (rid) {
               console.log(`🚫 [CLEANUP] Cancelling call for receiver: ${rid}`);
               socket.emit('cancel-call', { receiverId: rid, chatId });
            }
          });
        }
        socket.off('call-ended');
        socket.off('call-cancelled');
      }
      stopRinging();
      stopRingingSound(); 
    };
  }, []);

  const playRingingSound = async () => {
    try {
      if (!isIncoming) {
        // Standard "Ringing" sound for caller
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
          { shouldPlay: true, isLooping: true }
        );
        ringingSound.current = sound;
        setCallStatus('Ringing...');
      }
    } catch (e) { console.log("Error playing ringing sound", e); }
  };

  const stopRingingSound = async () => {
    if (ringingSound.current) {
      await ringingSound.current.stopAsync();
      await ringingSound.current.unloadAsync();
      ringingSound.current = null;
    }
  };

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
      
      // Start ringing sound for the caller
      if (!isIncoming) playRingingSound();
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
    stopRingingSound(); // Stop ringing if caller ends before connection
    if (socket && (receivers || receiverId)) {
      const targetIds = receivers || [receiverId];
      const isGroupCall = targetIds.length > 1;
      
      targetIds.forEach(rid => {
         if (rid) {
           socket.emit('call-ended', { 
             receiverId: rid, 
             chatId,
             isGroupCall 
           });
         }
      });
    }
    if (callTimer.current) clearInterval(callTimer.current);
    navigation.goBack();
  };

  const toggleSpeaker = async () => {
    try {
      const nextSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(nextSpeakerState);
      
      console.log(`🔊 [MOBILE] Toggling speaker: ${nextSpeakerState ? 'ON (Speaker)' : 'OFF (Earpiece)'}`);
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
      console.log('✅ [MOBILE] Speaker hardware state updated');
    } catch (e) {
      console.error('❌ [MOBILE] Failed to toggle speaker:', e);
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
          body, html { margin: 0; padding: 0; height: 100%; width: 100%; background: #000; overflow: hidden; font-family: sans-serif; }
          #remote-video-container { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); 
            grid-auto-rows: 1fr;
            gap: 10px; 
            width: 100%; 
            height: 100%; 
            position: absolute; 
            z-index: 1; 
            padding: 10px;
            box-sizing: border-box;
            background: #000;
          }
          /* When only one remote user, make it full screen */
          #remote-video-container:has(> .video-block:nth-child(1):nth-last-child(1)) {
            display: block;
            padding: 0;
          }
          .video-block { 
            position: relative; 
            background: #111; 
            border-radius: 12px; 
            overflow: hidden; 
            aspect-ratio: 1 / 1;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }
           #remote-video-container:has(> .video-block:nth-child(1):nth-last-child(1)) .video-block {
             aspect-ratio: unset;
             height: 100%;
             border-radius: 0;
           }
          #local-video-container { 
            width: 90px; height: 130px; position: absolute; top: 10px; right: 10px; 
            z-index: 999; border-radius: 12px; overflow: hidden; border: 2px solid #7B61FF; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            background: #1A1A2E;
          }
          video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
          .uid-label { 
            position: absolute; bottom: 8px; left: 8px; color: #FFF; font-size: 10px; 
            background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; z-index: 10;
          }
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

            const client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });
            AgoraRTC.setLogLevel(4); // 4 = ERROR only, reduces overhead
            let localTracks = { videoTrack: null, audioTrack: null };
            let remoteUsers = {};

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
                            // Use 480p for mobile - much better performance than default
                            [localTracks.audioTrack, localTracks.videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
                              { AEC: true, ANS: true, AGC: true }, // Audio enhancement
                              { 
                                encoderConfig: {
                                  width: 640, height: 480,
                                  frameRate: 20, // 20fps is smooth enough on mobile
                                  bitrateMin: 200, bitrateMax: 600
                                },
                                facingMode: 'user'
                              }
                            );
                            await localTracks.videoTrack.play("local-video-container");
                            tracksToPublish = [localTracks.audioTrack, localTracks.videoTrack];
                        } catch (e) {
                            console.warn("[CAMERA FAILED] Falling back to audio only:", e.message);
                            localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
                            tracksToPublish = [localTracks.audioTrack];
                        }
                    } else {
                        localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
                        tracksToPublish = [localTracks.audioTrack];
                    }
                    
                    // EVENT LISTENERS MUST BE BEFORE JOINING
                    client.on("user-published", async (user, mediaType) => {
                        console.log("📡 [STREAM] New publication: " + user.uid + " - " + mediaType);
                        try {
                            await client.subscribe(user, mediaType);
                            remoteUsers[user.uid] = user; 
                            
                            // NOTIFY NATIVE: Remote user is actually here!
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'remote-joined', uid: user.uid }));

                            if (mediaType === "video") {
                                // Create specific container for this user
                                let div = document.getElementById("player-" + user.uid);
                                if (!div) {
                                    div = document.createElement("div");
                                    div.id = "player-" + user.uid;
                                    div.className = "video-block";
                                    document.getElementById("remote-video-container").appendChild(div);
                                }
                                user.videoTrack.play(div.id);
                            }
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

                    client.on("user-unpublished", (user, mediaType) => {
                        console.log("🔌 [STREAM] User unpublished:", user.uid, mediaType);
                        if (mediaType === "video") {
                            const div = document.getElementById("player-" + user.uid);
                            if (div) div.remove();
                        }
                    });

                    client.on("user-left", (user) => {
                        console.log("[AGORA] User left:", user.uid);
                        delete remoteUsers[user.uid];
                        const div = document.getElementById("player-" + user.uid);
                        if (div) div.remove();
                    });
                    
                    await client.join("${appId}", "${chatId}", "${agoraToken}", ${uid});
                    await client.publish(tracksToPublish);
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'joined' }));

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
      {type === 'audio' ? (
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.audioCallInterface} 
          onPress={() => {
            console.log('👆 [NATIVE] Manual tap relay to WebView...');
            webViewRef.current?.injectJavaScript('document.body.click()');
          }}
        >
           <LinearGradient colors={['#0F0F1A', '#1A1A2E']} style={StyleSheet.absoluteFill} />
           <View style={styles.audioContent}>
              <View style={styles.audioAvatarWrapper}>
                 <View style={styles.pulsingCircle1} />
                 <View style={styles.pulsingCircle2} />
                 <LinearGradient colors={[THEME.colors.primary, THEME.colors.secondary]} style={styles.audioAvatarCircle}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={styles.audioAvatarInitial}>{name?.[0] || 'U'}</Text>
                    )}
                 </LinearGradient>
              </View>
              <Text style={styles.audioNameText}>{name}</Text>
              <Text style={styles.audioStatusText}>{callStatus === 'Ongoing' ? 'In Conversation' : callStatus}</Text>
           </View>
        </TouchableOpacity>
      ) : (
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
              return; 
            }
  
            console.log(`[WebView Response] Type: ${data.type}`, data);
  
            if (data.type === 'joined') {
              callConnected.current = true; 
            }
            if (data.type === 'remote-joined') {
              setCallStatus('Ongoing');
              startTimer();
              stopRingingSound(); // STOP CALLER RINGING
            }
            if (data.type === 'autoplay-failed') {
              setCallStatus('Tap to Unmute');
              Alert.alert('Audio Blocked', 'Click OK to enable audio.');
            }
            if (data.type === 'error') {
              setCallStatus('Failed');
              Alert.alert('Call Error', data.msg);
            }
          }}
        />
      )}

      {/* For Audio calls we still need WebView but keep it full screen and transparent to prevent OS muting */}
      {type === 'audio' && (
        <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0, zIndex: -1 }}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: agoraHtmlString, baseUrl: ENVIRONMENT.API_URL }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantingEnabled={true}
            allowsInlineMediaPlayback={true}
            onMessage={(e) => {
              const data = JSON.parse(e.nativeEvent.data);
              if (data.type === 'joined') {
                // Local user joined, but stay in "Ringing..." or "Calling..." until remote joins
                callConnected.current = true;
              }
              if (data.type === 'remote-joined') {
                setCallStatus('Ongoing');
                startTimer();
                stopRingingSound(); // STOP CALLER RINGING
                console.log('🟢 [NATIVE] Remote user joined, call ongoing');
              }
              if (data.type === 'autoplay-failed') {
                setCallStatus('Audio Blocked');
                Alert.alert('Audio Issue', 'Tap the screen to enable call audio.');
              }
            }}
          />
        </View>
      )}

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
  audioCallInterface: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  audioContent: { alignItems: 'center' },
  audioAvatarWrapper: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center' },
  audioAvatarCircle: { width: 160, height: 160, borderRadius: 80, overflow: 'hidden', elevation: 15, shadowColor: THEME.colors.primary, shadowRadius: 20, shadowOpacity: 0.6 },
  audioAvatarInitial: { color: '#FFF', fontSize: 60, fontWeight: 'bold', textAlign: 'center', marginTop: 40 },
  audioNameText: { color: '#FFF', fontSize: 32, fontWeight: '700', marginTop: 30 },
  audioStatusText: { color: THEME.colors.secondary, fontSize: 18, fontWeight: '500', marginTop: 10, letterSpacing: 1 },
  pulsingCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: THEME.colors.primary, opacity: 0.3 },
  pulsingCircle2: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: THEME.colors.primary, opacity: 0.15 },
});

export default CallScreen;
