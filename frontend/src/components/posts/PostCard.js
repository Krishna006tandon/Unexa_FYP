import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { resolveMediaUrl } from '../../utils/mediaUtils';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

function PostCard({ item, onLike, onPress }) {
  const user = item?.userId || {};
  const username = user?.username || 'user';
  const avatar = resolveMediaUrl(user?.profilePhoto);
  const imageUrl = resolveMediaUrl(item?.imageUrl);

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

      {!!imageUrl && (
        <View style={styles.imageWrap}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.likeBtn} onPress={onLike} hitSlop={10} activeOpacity={0.8}>
          <Heart size={18} color={THEME.accent} fill={item?.liked ? THEME.accent : 'transparent'} />
          <Text style={styles.likeText}>{item?.likes || 0}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(PostCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    paddingBottom: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: THEME.text,
    fontWeight: '900',
    fontSize: 14,
  },
  username: {
    color: THEME.text,
    fontWeight: '800',
    fontSize: 14,
    flex: 1,
  },
  caption: {
    color: THEME.text,
    paddingHorizontal: 12,
    paddingBottom: 10,
    lineHeight: 20,
    fontSize: 14,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    maxHeight: 380,
    backgroundColor: '#111',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actions: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeText: {
    color: THEME.text,
    fontWeight: '800',
    fontSize: 13,
  },
});
