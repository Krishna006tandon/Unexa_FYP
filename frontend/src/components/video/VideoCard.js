import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
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

export default function VideoCard({ item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.row}>
          <Text style={styles.sub} numberOfLines={1}>
            {item.userId?.username || 'creator'}
          </Text>
          <View style={styles.likes}>
            <Heart size={14} color={THEME.accent} />
            <Text style={styles.likeText}>{item.likes || 0}</Text>
          </View>
        </View>
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
  },
  thumb: { width: '100%', height: 200, backgroundColor: '#111' },
  meta: { padding: 12 },
  title: { color: THEME.text, fontWeight: '800', fontSize: 15, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sub: { color: THEME.textDim, fontSize: 12, flex: 1, marginRight: 10 },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeText: { color: THEME.text, fontSize: 12, fontWeight: '700' },
});

