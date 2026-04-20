import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Radio } from 'lucide-react-native';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function LiveCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={{ uri: item.userId?.profilePhoto || 'https://i.pravatar.cc/150' }}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title || 'Live Stream'}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.userId?.username || 'creator'} • LIVE
        </Text>
      </View>
      <View style={styles.livePill}>
        <Radio size={14} color={THEME.accent} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    marginBottom: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#111' },
  title: { color: THEME.text, fontWeight: '900', fontSize: 14 },
  sub: { color: THEME.textDim, fontSize: 12, marginTop: 2 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,59,92,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.25)',
  },
  liveText: { color: THEME.accent, fontWeight: '900', fontSize: 12 },
});
