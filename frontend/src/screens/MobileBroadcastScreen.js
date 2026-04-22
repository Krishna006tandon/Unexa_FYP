import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radio, Video as VideoIcon, Repeat2, MicOff, Mic, StopCircle } from 'lucide-react-native';

// Native RTMP publisher (requires Dev Client / prebuild; not supported in Expo Go).
// Docs: https://github.com/NodeMedia/react-native-nodemediaclient
let NodeCameraView = null;
try {
  // eslint-disable-next-line global-require
  NodeCameraView = require('react-native-nodemediaclient').NodeCameraView;
} catch (_) {
  NodeCameraView = null;
}

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function MobileBroadcastScreen({ route, navigation }) {
  const { provider, rtmpUrl, streamKey, title } = route.params || {};
  const cameraRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraId, setCameraId] = useState(1); // 0 back, 1 front

  const outputUrl = useMemo(() => {
    if (!rtmpUrl || !streamKey) return null;
    if (provider === 'mux') {
      const base = rtmpUrl.replace(/\/$/, '');
      return `${base}/${streamKey}`;
    }
    // local provider already returns full rtmpUrl including /live/<key>
    return rtmpUrl;
  }, [provider, rtmpUrl, streamKey]);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg, justifyContent: 'center', padding: 16 }}>
        <Text style={{ color: THEME.text, fontWeight: '900', fontSize: 18, textAlign: 'center' }}>
          Mobile RTMP broadcasting is not available on Web.
        </Text>
      </SafeAreaView>
    );
  }

  if (!NodeCameraView) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
        <LinearGradient colors={['#0A0A0A', '#120F24']} style={StyleSheet.absoluteFillObject} />
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: THEME.text, fontWeight: '900', fontSize: 20 }}>Mobile Camera Broadcast</Text>
          <Text style={{ color: THEME.textDim, lineHeight: 18, fontSize: 12 }}>
            This requires a Dev Client build (Expo Go won’t load native RTMP modules).
          </Text>
          <Text style={{ color: THEME.textDim, fontSize: 12 }}>
            Build steps are in docs. After building, this screen will show the camera preview + “Start”.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => Alert.alert('Build required', 'Please build and install an Expo Dev Client, then retry.')}
          >
            <Text style={styles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#0A0A0A', '#120F24']} style={styles.gradient} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: THEME.text, fontWeight: '900' }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle} numberOfLines={1}>{title || 'Live'}</Text>
          <Text style={styles.hSub} numberOfLines={1}>{outputUrl || ''}</Text>
        </View>
        <View style={[styles.badge, isStreaming ? styles.badgeLive : styles.badgeIdle]}>
          <View style={[styles.dot, { backgroundColor: isStreaming ? THEME.accent : THEME.textDim }]} />
          <Text style={styles.badgeText}>{isStreaming ? 'LIVE' : 'OFF'}</Text>
        </View>
      </View>

      <View style={styles.previewWrap}>
        <NodeCameraView
          style={styles.preview}
          ref={cameraRef}
          outputUrl={outputUrl}
          camera={{ cameraId, cameraFrontMirror: cameraId === 1 }}
          audio={{ bitrate: 64000, profile: 1, samplerate: 44100 }}
          video={{ preset: 12, bitrate: 800000, profile: 0, fps: 24, videoFrontMirror: false }}
          autopreview
        />

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.ctrl, { backgroundColor: THEME.card }]}
            onPress={() => setCameraId((c) => (c === 1 ? 0 : 1))}
          >
            <Repeat2 color={THEME.text} size={18} />
            <Text style={styles.ctrlText}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrl, { backgroundColor: THEME.card }]}
            onPress={() => setIsMuted((m) => !m)}
          >
            {isMuted ? <MicOff color={THEME.text} size={18} /> : <Mic color={THEME.text} size={18} />}
            <Text style={styles.ctrlText}>{isMuted ? 'Muted' : 'Mic'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlPrimary, { backgroundColor: isStreaming ? THEME.accent : THEME.primary }]}
            onPress={() => {
              if (!outputUrl) return Alert.alert('Missing RTMP', 'No outputUrl/streamKey provided.');
              try {
                if (!isStreaming) {
                  cameraRef.current?.start();
                  setIsStreaming(true);
                } else {
                  cameraRef.current?.stop();
                  setIsStreaming(false);
                }
              } catch (e) {
                Alert.alert('Broadcast error', e?.message || 'Failed');
              }
            }}
          >
            {isStreaming ? <StopCircle color="#fff" size={18} /> : <Radio color="#fff" size={18} />}
            <Text style={styles.ctrlPrimaryText}>{isStreaming ? 'Stop' : 'Start'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.note}>
          <VideoIcon color={THEME.textDim} size={16} />
          <Text style={styles.noteText}>
            Camera RTMP broadcast (no WebRTC). Screen-share RTMP needs native MediaProjection/ReplayKit support.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  gradient: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  hTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  hSub: { color: THEME.textDim, fontSize: 12, marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeLive: { backgroundColor: 'rgba(255,59,92,0.12)', borderColor: 'rgba(255,59,92,0.25)' },
  badgeIdle: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' },
  dot: { width: 8, height: 8, borderRadius: 999 },
  badgeText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  previewWrap: { flex: 1, padding: 14 },
  preview: { width: '100%', flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
  controls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ctrl: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctrlText: { color: THEME.text, fontWeight: '900' },
  ctrlPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctrlPrimaryText: { color: '#fff', fontWeight: '900' },
  note: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  noteText: { color: THEME.textDim, fontSize: 12, lineHeight: 18, flex: 1 },
  btn: { height: 44, borderRadius: 16, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
});

