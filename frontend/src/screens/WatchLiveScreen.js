import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import ProfileContext from '../context/ProfileContext';
import { AuthContext } from '../context/AuthContext';
import liveService from '../services/liveService';
import ChatBox from '../components/video/ChatBox';
import { FloatingReaction } from '../components/video/ReactionOverlay';
import ENVIRONMENT from '../config/environment';

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
  const [playbackError, setPlaybackError] = useState(null);
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [floating, setFloating] = useState([]);
  const joinedRef = useRef(false);

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

  // Some providers (Mux) may return a playbackId before the HLS playlist is ready.
  // Poll the backend briefly while status is not live to pick up a ready playbackUrl/status.
  useEffect(() => {
    if (!streamId) return;
    if (status === 'live') return;

    let cancelled = false;
    let tries = 0;
    const maxTries = 8;

    const tick = async () => {
      tries += 1;
      try {
        const res = await liveService.getById(streamId);
        const data = res?.data;
        if (cancelled || !data) return;
        if (data.status) setStatus(data.status);
        if (data.playbackUrl) setPlaybackUrl(data.playbackUrl);
      } catch (_) {
        // ignore
      }

      if (!cancelled && tries < maxTries && status !== 'live') {
        setTimeout(tick, 2500);
      }
    };

    const t = setTimeout(tick, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [streamId, status]);

  const hlsUrl = useMemo(() => {
    if (playbackUrl) {
      // Guardrail: never try to play `localhost` on mobile devices.
      // If the backend accidentally returns an internal HLS URL, rewrite to the backend proxy endpoint.
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(playbackUrl)) {
        const m = playbackUrl.match(/\/live\/([0-9a-f]{16,64})\/index\.m3u8/i);
        const streamKey = m?.[1];
        if (streamKey) return `${ENVIRONMENT.API_URL.replace(/\/$/, '')}/live/${streamKey}.m3u8`;
        return null;
      }
      return playbackUrl;
    }
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

  // Join/leave lifecycle (avoid update-depth loops by not toggling state in cleanup).
  useEffect(() => {
    if (!socket || provider !== 'local' || !streamId) return;

    const username = user?.username || user?.name || 'Viewer';

    if (status === 'live' && !joinedRef.current) {
      socket.emit('live:join', { streamId, userId: user?._id, username });
      joinedRef.current = true;
      setJoined(true);
    }

    if (status !== 'live' && joinedRef.current) {
      socket.emit('live:leave', { streamId, username });
      joinedRef.current = false;
      setJoined(false);
    }
  }, [socket, provider, streamId, status, user?._id, user?.username, user?.name]);

  useEffect(() => {
    if (!socket || provider !== 'local' || !streamId) return;
    const username = user?.username || user?.name || 'Viewer';

    return () => {
      if (!joinedRef.current) return;
      socket.emit('live:leave', { streamId, username });
      joinedRef.current = false;
    };
  }, [socket, provider, streamId, user?.username, user?.name]);

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
        {hlsUrl && status === 'live' ? (
          <Video
            style={styles.video}
            source={{ uri: hlsUrl }}
            shouldPlay
            useNativeControls
            resizeMode="contain"
            onError={(e) => {
              console.warn('Playback error', e);
              setPlaybackError('Playback failed (404). Stream may not be live yet.');
            }}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={{ color: THEME.textDim, textAlign: 'center' }}>
              {status !== 'live'
                ? 'Stream is not live yet. Please wait or start streaming.'
                : 'Missing playback URL.'}
            </Text>
            {playbackError ? (
              <Text style={{ color: THEME.textDim, marginTop: 10, textAlign: 'center' }}>{playbackError}</Text>
            ) : null}
          </View>
        )}

        {hlsUrl ? (
          <Text style={styles.debugUrl} numberOfLines={2}>
            HLS: {hlsUrl}
          </Text>
        ) : null}

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
