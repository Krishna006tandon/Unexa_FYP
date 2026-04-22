import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import ProfileContext from '../context/ProfileContext';
import { AuthContext } from '../context/AuthContext';
import liveService from '../services/liveService';
import ChatBox from '../components/video/ChatBox';
import { FloatingReaction } from '../components/video/ReactionOverlay';

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
  const { playbackId, playbackUrl: playbackUrlParam, streamId, provider, title } = route.params || {};
  const { socket } = useContext(ProfileContext);
  const { user } = useContext(AuthContext);

  const [status, setStatus] = useState('idle'); // idle | live | ended
  const [viewerCount, setViewerCount] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState(playbackUrlParam || null);
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [floating, setFloating] = useState([]);

  useEffect(() => {
    // Pull latest status/url from backend (real data)
    if (!streamId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await liveService.getById(streamId);
        const data = res?.data;
        if (cancelled || !data) return;
        if (data.status) setStatus(data.status);
        if (data.playbackUrl) setPlaybackUrl(data.playbackUrl);
      } catch (e) {
        // ignore (viewer can still try playbackUrlParam)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [streamId]);

  const hlsUrl = useMemo(() => {
    if (playbackUrl) return playbackUrl;
    if (playbackId) return `https://stream.mux.com/${playbackId}.m3u8`;
    return null;
  }, [playbackId, playbackUrl]);

  useEffect(() => {
    if (!socket || (!playbackId && !playbackUrl && !streamId)) return;

    const onStatus = (p) => {
      if (playbackId && p?.playbackId === playbackId) setStatus(p.status || 'idle');
      if (streamId && p?.streamId === streamId) setStatus(p.status || 'idle');
    };

    const onViewers = (p) => {
      if (streamId && p?.streamId === streamId) setViewerCount(p.viewerCount || 0);
    };

    socket.on('live:status', onStatus);
    socket.on('live:viewers', onViewers);

    return () => {
      socket.off('live:status', onStatus);
      socket.off('live:viewers', onViewers);
    };
  }, [socket, playbackId, playbackUrl, streamId, provider]);

  // Join only when stream is actually LIVE (real data).
  useEffect(() => {
    if (!socket || provider !== 'local' || !streamId) return;
    if (status !== 'live') return;
    if (joined) return;

    socket.emit('live:join', {
      streamId,
      userId: user?._id,
      username: user?.username || user?.name || 'Viewer',
    });
    setJoined(true);

    return () => {
      socket.emit('live:leave', {
        streamId,
        username: user?.username || user?.name || 'Viewer',
      });
      setJoined(false);
    };
  }, [socket, provider, streamId, status, joined, user]);

  // End-to-end live chat + reactions (local provider)
  useEffect(() => {
    if (!socket || provider !== 'local' || !streamId) return;

    const onChat = (msg) => {
      if (msg?.streamId !== streamId) return;
      setMessages((prev) => [...prev.slice(-100), msg]);
    };

    const onReaction = (r) => {
      if (r?.streamId !== streamId) return;
      setFloating((prev) => [...prev.slice(-20), { _id: `${Date.now()}_${Math.random()}`, emoji: r.emoji }]);
      setTimeout(() => setFloating((prev) => prev.slice(1)), 1600);
    };

    socket.on('live:chat', onChat);
    socket.on('live:reaction', onReaction);
    return () => {
      socket.off('live:chat', onChat);
      socket.off('live:reaction', onReaction);
    };
  }, [socket, provider, streamId]);

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

        {provider === 'local' && streamId ? (
          <View style={styles.chatOverlay}>
            <ChatBox
              messages={messages}
              onSend={(message) => {
                if (!joined) return;
                socket?.emit('live:chat', {
                  streamId,
                  userId: user?._id,
                  username: user?.username || user?.name || 'Viewer',
                  message,
                });
              }}
            />
          </View>
        ) : (
          <View style={styles.chatPlaceholder}>
            <Text style={styles.chatText}>Chat overlay (placeholder)</Text>
          </View>
        )}

        {provider === 'local' && streamId
          ? floating.map((r) => <FloatingReaction key={r._id} emoji={r.emoji} />)
          : null}
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
  chatOverlay: { position: 'absolute', left: 18, right: 18, bottom: 18 },
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
