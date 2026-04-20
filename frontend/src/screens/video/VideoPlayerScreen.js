import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { Heart } from 'lucide-react-native';
import ScreenHeader from '../../components/video/ScreenHeader';
import VideoPlayer from '../../components/video/VideoPlayer';
import videoService from '../../services/videoService';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function VideoPlayerScreen({ route, navigation }) {
  const { videoId } = route.params || {};
  const [video, setVideo] = useState(null);
  const [comment, setComment] = useState('');

  const load = async () => {
    try {
      const res = await videoService.getById(videoId, { incrementView: true });
      setVideo(res?.data);
    } catch (e) {
      Alert.alert('Video', e?.response?.data?.error || e?.message || 'Failed to load video');
    }
  };

  useEffect(() => {
    load();
  }, [videoId]);

  const like = async () => {
    try {
      const res = await videoService.like(videoId);
      setVideo((v) => (v ? { ...v, likes: res?.data?.likes ?? v.likes } : v));
    } catch (e) {
      Alert.alert('Like', e?.response?.data?.error || e?.message || 'Failed');
    }
  };

  const sendComment = async () => {
    const text = comment.trim();
    if (!text) return;
    setComment('');
    try {
      await videoService.comment(videoId, text);
      await load();
    } catch (e) {
      Alert.alert('Comment', e?.response?.data?.error || e?.message || 'Failed');
    }
  };

  const playUri = video?.hlsUrl || video?.videoUrl;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Video" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <VideoPlayer uri={playUri} posterUri={video?.thumbnailUrl} />

        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>
            {video?.title || ''}
          </Text>
          <Text style={styles.sub}>{video?.userId?.username || 'creator'} • {video?.views || 0} views</Text>

          <TouchableOpacity style={styles.likeBtn} onPress={like}>
            <Heart size={16} color="#fff" />
            <Text style={styles.likeText}>{video?.likes || 0}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.comments}>
          <Text style={styles.cTitle}>Comments</Text>
          <FlatList
            data={(video?.comments || []).slice(-50).reverse()}
            keyExtractor={(it, idx) => it._id || `${idx}`}
            renderItem={({ item }) => (
              <View style={styles.cRow}>
                <Text style={styles.cUser}>{item.userId?.username || 'user'}</Text>
                <Text style={styles.cText}>{item.content}</Text>
              </View>
            )}
            style={{ maxHeight: 220 }}
          />

          <View style={styles.cInputRow}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment..."
              placeholderTextColor={THEME.textDim}
              style={styles.cInput}
            />
            <TouchableOpacity style={styles.cSend} onPress={sendComment}>
              <Text style={styles.cSendText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { flex: 1, padding: 16, gap: 12 },
  meta: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 12,
  },
  title: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  sub: { color: THEME.textDim, marginTop: 6, fontSize: 12 },
  likeBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
  },
  likeText: { color: '#fff', fontWeight: '900' },
  comments: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 12,
  },
  cTitle: { color: THEME.text, fontWeight: '900', marginBottom: 8 },
  cRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  cUser: { color: THEME.primary, fontWeight: '800', fontSize: 12, marginBottom: 2 },
  cText: { color: THEME.text, fontSize: 13, lineHeight: 18 },
  cInputRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cInput: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    paddingHorizontal: 12,
    color: THEME.text,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cSend: { width: 70, height: 44, borderRadius: 16, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center' },
  cSendText: { color: '#fff', fontWeight: '900' },
});

