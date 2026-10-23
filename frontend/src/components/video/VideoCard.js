import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Heart, Play } from 'lucide-react-native';
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

function VideoCard({ item, onPress }) {
  const thumbUri = resolveMediaUrl(item?.thumbnailUrl);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.card}>
      <View style={styles.thumbWrap}>
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Play size={32} color="rgba(255,255,255,0.5)" />
            <Text style={styles.thumbText}>VIDEO</Text>
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item?.title || 'Untitled Video'}
        </Text>
        <View style={styles.row}>
          <Text style={styles.sub} numberOfLines={1}>
            {item?.userId?.username || 'creator'} • {item?.views || 0} views
          </Text>
          <View style={styles.likes}>
            <Heart size={14} color={THEME.accent} fill={THEME.accent} />
            <Text style={styles.likeText}>{item?.likes || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(VideoCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  thumbText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  meta: {
    padding: 12,
  },
  title: {
    color: THEME.text,
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sub: {
    color: THEME.textDim,
    fontSize: 12,
    flex: 1,
    marginRight: 10,
    fontWeight: '600',
  },
  likes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  likeText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
