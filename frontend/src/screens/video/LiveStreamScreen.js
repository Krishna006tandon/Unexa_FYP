import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import ProfileContext from '../../context/ProfileContext';
import { AuthContext } from '../../context/AuthContext';
import ScreenHeader from '../../components/video/ScreenHeader';
import VideoPlayer from '../../components/video/VideoPlayer';
import ChatBox from '../../components/video/ChatBox';
import { FloatingReaction } from '../../components/video/ReactionOverlay';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

const REACTIONS = ['❤️', '🔥', '😂', '👏', '😮', '😍'];

export default function LiveStreamScreen({ route, navigation }) {
  const { streamId, playbackUrl } = route.params || {};
  const { socket } = useContext(ProfileContext);
  const { user } = useContext(AuthContext);

  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [floating, setFloating] = useState([]);

  const username = useMemo(() => user?.username || user?.name || 'Viewer', [user]);

  useEffect(() => {
    if (!socket || !streamId) return;

    const onViewers = (p) => {
      if (p?.streamId === streamId) setViewerCount(p.viewerCount || 0);
    };
    const onChat = (msg) => {
      if (msg?.streamId !== streamId) return;
      setMessages((prev) => [...prev.slice(-100), msg]);
    };
    const onReaction = (r) => {
      if (r?.streamId !== streamId) return;
      setFloating((prev) => [...prev.slice(-20), { _id: `${Date.now()}_${Math.random()}`, emoji: r.emoji }]);
      setTimeout(() => setFloating((prev) => prev.slice(1)), 1600);
    };

    socket.emit('live:join', { streamId, userId: user?._id, username });
    socket.on('live:viewers', onViewers);
    socket.on('live:chat', onChat);
    socket.on('live:reaction', onReaction);

    return () => {
      socket.emit('live:leave', { streamId, username });
      socket.off('live:viewers', onViewers);
      socket.off('live:chat', onChat);
      socket.off('live:reaction', onReaction);
    };
  }, [socket, streamId]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Live" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <View style={styles.playerWrap}>
          <VideoPlayer uri={playbackUrl} />
          <View style={styles.badges}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <View style={styles.viewerBadge}>
              <Text style={styles.viewerText}>{viewerCount} watching</Text>
            </View>
          </View>
          {floating.map((r) => (
            <FloatingReaction key={r._id} emoji={r.emoji} />
          ))}
        </View>

        <View style={styles.reactionRow}>
          {REACTIONS.map((e) => (
            <TouchableOpacity
              key={e}
              style={styles.reactionBtn}
              onPress={() => socket?.emit('live:reaction', { streamId, userId: user?._id, emoji: e })}
            >
              <Text style={{ fontSize: 18 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ChatBox
          messages={messages}
          onSend={(message) => socket?.emit('live:chat', { streamId, userId: user?._id, username, message })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { flex: 1, padding: 16, gap: 12 },
  playerWrap: { position: 'relative' },
  badges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 8 },
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,59,92,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.30)',
  },
  liveText: { color: THEME.accent, fontWeight: '900', fontSize: 12 },
  viewerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  viewerText: { color: THEME.text, fontWeight: '800', fontSize: 12 },
  reactionRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  reactionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
});
