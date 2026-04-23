import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Heart } from 'lucide-react-native';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function PostCard({ item, onLike, onPress }) {
  const user = item?.userId || {};
  const username = user?.username || 'user';
  const avatar = user?.profilePhoto || null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.9 : 1} style={styles.card}>
      <View style={styles.head}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>{username.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.username} numberOfLines={1}>
          {username}
        </Text>
      </View>

      {!!item?.caption && (
        <Text style={styles.caption} numberOfLines={8}>
          {item.caption}
        </Text>
      )}

      {!!item?.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.likeBtn} onPress={onLike} hitSlop={10}>
          <Heart size={18} color={THEME.accent} />
          <Text style={styles.likeText}>{item?.likes || 0}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    paddingBottom: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 999, backgroundColor: '#111' },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: THEME.text, fontWeight: '900' },
  username: { color: THEME.text, fontWeight: '900', flex: 1 },
  caption: { color: THEME.text, paddingHorizontal: 12, paddingBottom: 10, lineHeight: 20 },
  image: { width: '100%', height: 320, backgroundColor: '#111' },
  actions: { paddingHorizontal: 12, paddingTop: 10 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likeText: { color: THEME.text, fontWeight: '900' },
});
