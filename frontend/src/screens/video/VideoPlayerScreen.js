import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bookmark, ChevronDown, ChevronUp, MessageSquareText, Share2, ThumbsUp } from 'lucide-react-native';
import ScreenHeader from '../../components/video/ScreenHeader';
import VideoPlayer from '../../components/video/VideoPlayer';
import videoService from '../../services/videoService';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  border: 'rgba(255,255,255,0.10)',
};

export default function VideoPlayerScreen({ route, navigation }) {
  const { videoId } = route.params || {};
  const [video, setVideo] = useState(null);
  const [comment, setComment] = useState('');
  const [related, setRelated] = useState([]);
  const [descOpen, setDescOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await videoService.getById(videoId, { incrementView: true });
      setVideo(res?.data || null);
    } catch (e) {
      Alert.alert('Video', e?.response?.data?.error || e?.message || 'Failed to load video');
    }
  }, [videoId]);

  const loadRelated = useCallback(async () => {
    try {
      const res = await videoService.related(videoId, { limit: 12, kind: 'long' });
      const items = res?.data?.items || [];
      const seen = new Set();
      const deduped = [];
      for (const it of items) {
        const id = it?._id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        deduped.push(it);
      }
      setRelated(deduped);
    } catch (_) {
      setRelated([]);
    }
  }, [videoId]);

  useEffect(() => {
    load();
    loadRelated();
  }, [load, loadRelated]);

  const playUri = video?.hlsUrl || video?.videoUrl;
  const creator = video?.userId || null;
  const creatorName = creator?.username || 'creator';
  const creatorPhoto = creator?.profilePhoto || null;
  const viewsText = useMemo(() => `${video?.views || 0} views`, [video?.views]);
  const commentsCount = (video?.comments || []).length;

  const like = async () => {
    try {
      const res = await videoService.like(videoId);
      setVideo((v) => (v ? { ...v, likes: res?.data?.likes ?? v.likes } : v));
    } catch (e) {
      Alert.alert('Like', e?.response?.data?.error || e?.message || 'Failed');
    }
  };

  const share = async () => {
    const url = video?.hlsUrl || video?.videoUrl || '';
    try {
      await Share.share({ message: url ? `Watch this video: ${url}` : 'Watch this video on UNEXA' });
    } catch (_) {}
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Video" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.playerWrap}>
          <VideoPlayer uri={playUri} posterUri={video?.thumbnailUrl} />
        </View>

        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={3}>
            {video?.title || ''}
          </Text>
          <Text style={styles.sub}>
            {viewsText} • {creatorName}
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={like}>
              <ThumbsUp size={18} color={THEME.text} />
              <Text style={styles.actionText}>{video?.likes || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={share}>
              <Share2 size={18} color={THEME.text} />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Save', 'Save coming soon')}>
              <Bookmark size={18} color={THEME.text} />
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
              <MessageSquareText size={18} color={THEME.text} />
              <Text style={styles.actionText}>{commentsCount}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.channelRow}>
            {creatorPhoto ? (
              <Image source={{ uri: creatorPhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{creatorName.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.channelName} numberOfLines={1}>
                {creatorName}
              </Text>
              <Text style={styles.channelSub} numberOfLines={1}>
                {viewsText}
              </Text>
            </View>
            <TouchableOpacity style={styles.subscribeBtn} onPress={() => Alert.alert('Subscribe', 'Subscribe coming soon')}>
              <Text style={styles.subscribeText}>Subscribe</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.descBox} onPress={() => setDescOpen((v) => !v)} activeOpacity={0.9}>
            <View style={styles.descHead}>
              <Text style={styles.descTitle}>Description</Text>
              {descOpen ? <ChevronUp size={18} color={THEME.textDim} /> : <ChevronDown size={18} color={THEME.textDim} />}
            </View>
            <Text style={styles.descText} numberOfLines={descOpen ? 20 : 2}>
              {video?.description || 'No description.'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.comments}>
          <View style={styles.commentsHead}>
            <Text style={styles.cTitle}>Comments</Text>
            <Text style={styles.cCount}>{commentsCount}</Text>
          </View>

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

          <FlatList
            data={(video?.comments || []).slice(-20).reverse()}
            keyExtractor={(it, idx) => `${it?._id || 'c'}-${idx}`}
            renderItem={({ item }) => (
              <View style={styles.cRow}>
                <Text style={styles.cUser}>{item.userId?.username || 'user'}</Text>
                <Text style={styles.cText}>{item.content}</Text>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.related}>
          <Text style={styles.rTitle}>Up next</Text>
          {related.map((it, idx) => (
            <TouchableOpacity
              key={`${it._id}-${idx}`}
              style={styles.relatedRow}
              onPress={() => navigation.replace('VideoPlayer', { videoId: it._id })}
              activeOpacity={0.9}
            >
              {it?.thumbnailUrl ? (
                <Image source={{ uri: it.thumbnailUrl }} style={styles.relatedThumb} />
              ) : (
                <View style={[styles.relatedThumb, styles.relatedThumbFallback]}>
                  <Text style={styles.relatedThumbText}>VIDEO</Text>
                </View>
              )}
              <View style={styles.relatedMeta}>
                <Text style={styles.relatedTitle} numberOfLines={2}>
                  {it.title}
                </Text>
                <Text style={styles.relatedSub} numberOfLines={1}>
                  {it.userId?.username || 'creator'} • {it.views || 0} views
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  scroll: { flex: 1, backgroundColor: THEME.bg },
  playerWrap: { padding: 12, paddingBottom: 0 },
  meta: { paddingHorizontal: 12, paddingTop: 10 },
  title: { color: THEME.text, fontWeight: '900', fontSize: 16, lineHeight: 22 },
  sub: { color: THEME.textDim, marginTop: 6, fontSize: 12 },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: '#111' },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: THEME.text, fontWeight: '900' },
  channelName: { color: THEME.text, fontWeight: '900' },
  channelSub: { color: THEME.textDim, fontSize: 12, marginTop: 2 },
  subscribeBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeText: { color: '#fff', fontWeight: '900' },
  descBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 6,
  },
  descHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  descTitle: { color: THEME.text, fontWeight: '900' },
  descText: { color: THEME.textDim, lineHeight: 18, fontSize: 12 },
  comments: {
    marginTop: 12,
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 12,
  },
  commentsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cTitle: { color: THEME.text, fontWeight: '900' },
  cCount: { color: THEME.textDim, fontWeight: '800', fontSize: 12 },
  cInputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
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
  cRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  cUser: { color: THEME.primary, fontWeight: '800', fontSize: 12, marginBottom: 2 },
  cText: { color: THEME.text, fontSize: 13, lineHeight: 18 },
  related: { marginTop: 14, paddingHorizontal: 12 },
  rTitle: { color: THEME.text, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  relatedRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  relatedThumb: { width: 140, height: 80, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  relatedThumbFallback: {},
  relatedThumbText: { color: 'rgba(255,255,255,0.7)', fontWeight: '900', letterSpacing: 1.2 },
  relatedMeta: { flex: 1, paddingTop: 2 },
  relatedTitle: { color: THEME.text, fontWeight: '800', lineHeight: 18 },
  relatedSub: { color: THEME.textDim, marginTop: 6, fontSize: 12 },
});

