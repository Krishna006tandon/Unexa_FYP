import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, NativeModules } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MonitorUp, StopCircle, Radio } from 'lucide-react-native';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function ScreenShareBroadcastScreen({ route, navigation }) {
  const { provider, rtmpUrl, streamKey, title } = route.params || {};
  const [granted, setGranted] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);

  const outputUrl = useMemo(() => {
    if (!rtmpUrl || !streamKey) return null;
    if (provider === 'mux') return `${rtmpUrl.replace(/\/$/, '')}/${streamKey}`;
    return rtmpUrl;
  }, [provider, rtmpUrl, streamKey]);

  const api = NativeModules?.ScreenShareRtmp;

  if (Platform.OS !== 'android') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg, padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: THEME.text, fontWeight: '900', fontSize: 18, textAlign: 'center' }}>
          In-app Screen Share RTMP is currently Android-only.
        </Text>
        <Text style={{ color: THEME.textDim, marginTop: 10, textAlign: 'center' }}>
          iOS needs a ReplayKit Broadcast Extension to stream screen via RTMP.
        </Text>
      </SafeAreaView>
    );
  }

  if (!api) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg, padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: THEME.text, fontWeight: '900', fontSize: 18, textAlign: 'center' }}>
          Screen Share module not available.
        </Text>
        <Text style={{ color: THEME.textDim, marginTop: 10, textAlign: 'center' }}>
          Build an Expo Dev Client (Expo Go won’t load native modules).
        </Text>
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
          <Text style={styles.hTitle} numberOfLines={1}>{title || 'Screen Share'}</Text>
          <Text style={styles.hSub} numberOfLines={1}>{outputUrl || ''}</Text>
        </View>
        <View style={[styles.badge, streaming ? styles.badgeLive : styles.badgeIdle]}>
          <View style={[styles.dot, { backgroundColor: streaming ? THEME.accent : THEME.textDim }]} />
          <Text style={styles.badgeText}>{streaming ? 'LIVE' : 'OFF'}</Text>
        </View>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        <Text style={styles.cardTitle}>Step 1: Permission</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={async () => {
            setError(null);
            try {
              await api.requestPermission();
              setGranted(true);
            } catch (e) {
              setError(e?.message || 'Permission denied');
            }
          }}
        >
          <MonitorUp color="#fff" size={18} />
          <Text style={styles.btnText}>{granted ? 'Permission Granted' : 'Request Screen Capture'}</Text>
        </TouchableOpacity>

        <Text style={styles.cardTitle}>Step 2: Start</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: streaming ? THEME.accent : THEME.primary }]}
          onPress={async () => {
            setError(null);
            if (!outputUrl) return setError('Missing RTMP outputUrl');
            try {
              if (!streaming) {
                await api.start(outputUrl, 720, 1280, 30, 1200000);
                setStreaming(true);
              } else {
                await api.stop();
                setStreaming(false);
              }
            } catch (e) {
              setError(e?.message || 'Start/Stop failed');
            }
          }}
        >
          {streaming ? <StopCircle color="#fff" size={18} /> : <Radio color="#fff" size={18} />}
          <Text style={styles.btnText}>{streaming ? 'Stop Screen Share' : 'Start Screen Share'}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Keep the app in foreground while screen streaming. This uses RTMP ingestion and HLS playback (no WebRTC).
        </Text>
        {error ? <Text style={{ color: THEME.accent, fontWeight: '900' }}>{error}</Text> : null}
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
  cardTitle: { color: THEME.text, fontWeight: '900', marginTop: 8 },
  btn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '900' },
  hint: { color: THEME.textDim, fontSize: 12, lineHeight: 18, marginTop: 6 },
});

