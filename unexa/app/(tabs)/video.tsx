import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { API_URL } from '@/constants/environment';

const THEME = {
  bg: '#0A0A0A',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  primary: '#7B61FF',
  accent: '#FF3B5C',
};

function Tile({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{subtitle}</Text>
    </Pressable>
  );
}

export default function VideoTab() {
  const open = useCallback(async (path: string) => {
    const url = `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    await WebBrowser.openBrowserAsync(url);
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.hTitle}>UNEXA Video</Text>
        <Text style={styles.hSub}>Live streams + videos (web-powered)</Text>
      </View>

      <View style={styles.grid}>
        <Tile title="Live Streams" subtitle="Watch + discover" onPress={() => open('/liveweb/')} />
        <Tile title="Go Live" subtitle="Create a stream" onPress={() => open('/liveweb/')} />
        <Tile
          title="Video Feed"
          subtitle="Browse uploads"
          onPress={() => open('/liveweb/')}
        />
        <Tile
          title="Upload Video"
          subtitle="Post a video"
          onPress={() => open('/liveweb/')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg, paddingHorizontal: 16, paddingTop: 16 },
  header: { paddingBottom: 16 },
  hTitle: { color: THEME.text, fontSize: 24, fontWeight: '900' },
  hSub: { color: THEME.textDim, marginTop: 6, fontSize: 12 },
  grid: { gap: 12 },
  tile: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 16,
    minHeight: 86,
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  tileTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  tileSub: { color: THEME.textDim, fontSize: 12, marginTop: 4 },
});

