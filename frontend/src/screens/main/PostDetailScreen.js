import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heart, Pencil, Trash2 } from 'lucide-react-native';
import ScreenHeader from '../../components/video/ScreenHeader';
import postService from '../../services/postService';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

async function getCurrentUserId() {
  const userInfo = await AsyncStorage.getItem('userInfo');
  const user = userInfo ? JSON.parse(userInfo) : null;
  return user?._id || user?.id || user?.user?._id || null;
}

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params || {};
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [myUserId, setMyUserId] = useState(null);

  const isOwner = useMemo(() => {
    if (!myUserId || !post?.userId?._id) return false;
    return post.userId._id.toString() === myUserId.toString();
  }, [myUserId, post?.userId?._id]);

  const load = async () => {
    try {
      const res = await postService.getById(postId);
      setPost(res?.data || null);
      setCaptionDraft(res?.data?.caption || '');
    } catch (e) {
      Alert.alert('Post', e?.response?.data?.error || e?.message || 'Failed to load post');
    }
  };

  useEffect(() => {
    getCurrentUserId().then(setMyUserId).catch(() => setMyUserId(null));
    load();
  }, [postId]);

  const like = async () => {
    try {
      const res = await postService.like(postId);
      setPost((p) => (p ? { ...p, likes: res?.data?.likes ?? p.likes } : p));
    } catch (e) {
      Alert.alert('Like', e?.response?.data?.error || e?.message || 'Failed');
    }
  };

  const sendComment = async () => {
    const text = comment.trim();
    if (!text) return;
    setComment('');
    try {
      const res = await postService.comment(postId, text);
      setPost(res?.data || null);
    } catch (e) {
      Alert.alert('Comment', e?.response?.data?.error || e?.message || 'Failed');
    }
  };

  const saveEdit = async () => {
    try {
      const res = await postService.update(postId, { caption: captionDraft });
      setPost(res?.data || null);
      setEditing(false);
    } catch (e) {
      Alert.alert('Edit', e?.response?.data?.error || e?.message || 'Failed');
    }
  };

  const doDelete = async () => {
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await postService.delete(postId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Delete', e?.response?.data?.error || e?.message || 'Failed');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Post"
        onBack={() => navigation.goBack()}
        right={
          isOwner ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setEditing((v) => !v)} hitSlop={10}>
                <Pencil size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={doDelete} hitSlop={10}>
                <Trash2 size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <View style={styles.body}>
        <Text style={styles.user}>{post?.userId?.username || 'user'}</Text>

        {editing ? (
          <>
            <TextInput
              value={captionDraft}
              onChangeText={setCaptionDraft}
              style={[styles.input, { height: 110, textAlignVertical: 'top', paddingTop: 12 }]}
              multiline
              placeholderTextColor={THEME.textDim}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </>
        ) : (
          !!post?.caption && <Text style={styles.caption}>{post.caption}</Text>
        )}

        {!!post?.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.image} />}

        <TouchableOpacity style={styles.likeBtn} onPress={like}>
          <Heart size={18} color={THEME.accent} />
          <Text style={styles.likeText}>{post?.likes || 0}</Text>
        </TouchableOpacity>

        <View style={styles.comments}>
          <Text style={styles.cTitle}>Comments</Text>
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
            data={(post?.comments || []).slice(-50).reverse()}
            keyExtractor={(it, idx) => it._id || `${idx}`}
            renderItem={({ item }) => (
              <View style={styles.cRow}>
                <Text style={styles.cUser}>{item.userId?.username || 'user'}</Text>
                <Text style={styles.cText}>{item.content}</Text>
              </View>
            )}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { flex: 1, padding: 16, gap: 10 },
  user: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  caption: { color: THEME.text, lineHeight: 20 },
  image: { width: '100%', height: 320, borderRadius: 16, backgroundColor: '#111', marginTop: 8 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  likeText: { color: THEME.text, fontWeight: '900' },
  comments: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  cTitle: { color: THEME.text, fontWeight: '900', marginBottom: 10 },
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
  input: {
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
  },
  saveBtn: { height: 44, borderRadius: 16, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: '900' },
});

