import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import ProfileContext from '../context/ProfileContext';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function WatchLiveScreen({ route, navigation }) {
  const { playbackId, title } = route.params || {};
  const { socket } = useContext(ProfileContext);

  const [status, setStatus] = useState('idle'); // idle | live | ended
  const [viewerCount] = useState(() => Math.floor(20 + Math.random() * 120)); // mock

  const hlsUrl = useMemo(() => (playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null), [playbackId]);

  useEffect(() => {
    if (!socket || !playbackId) return;

    const onStatus = (p) => {
      if (p?.playbackId === playbackId) setStatus(p.status || 'idle');
    };

    socket.on('live:status', onStatus);
    return () => socket.off('live:status', onStatus);
  }, [socket, playbackId]);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#0A0A0A', '#120F24']} style={styles.gradient} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: THEME.text, fontWeight: '900' }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle} numberOfLines={1}>{title || 'Live'}</Text>
          <Text style={styles.hSub}>{viewerCount} watching • status: {status}</Text>
        </View>
        <View style={[styles.badge, status === 'live' ? styles.badgeLive : styles.badgeIdle]}>
          <View style={[styles.dot, { backgroundColor: status === 'live' ? THEME.accent : THEME.textDim }]} />
          <Text style={styles.badgeText}>{status === 'live' ? 'LIVE' : 'OFF'}</Text>
        </View>
      </View>

      <View style={styles.playerWrap}>
        {hlsUrl ? (
          <Video
            style={styles.video}
            source={{ uri: hlsUrl }}
            shouldPlay
            useNativeControls
            resizeMode="contain"
            onError={(e) => console.warn('Mux playback error', e)}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={{ color: THEME.textDim }}>Missing playbackId</Text>
          </View>
        )}

        <View style={styles.chatPlaceholder}>
          <Text style={styles.chatText}>Chat overlay (placeholder)</Text>
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
  playerWrap: { flex: 1, padding: 14 },
  video: { width: '100%', height: '100%', backgroundColor: '#000', borderRadius: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chatPlaceholder: {
    position: 'absolute',
    left: 24,
    bottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  chatText: { color: THEME.textDim, fontSize: 12, fontWeight: '700' },
});

